import webpush from "web-push";
import { dbConection } from "../config/db.js";
import { QueryTypes } from "sequelize";

// Configure Web Push
webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

//USING SEND NOTIFICATION
export const sendNotification = async (req, res) => {
    // Extract CustId from decoded JWT token (authenticateJWTCRM uses jwt.decode)
    let custid = req.user?.custid;
    if (custid === 'TAX541') {
        custid = 'taxfilecrm'
    }

    // console.log('custid :>> ', custid);
    const sequelize = await dbConection(custid, process.env.TAXCRM_DB_USER, process.env.TAXCRM_DB_PASSWORD, process.env.TAXCRM_DB_SERVER);
    const [employeeList] = await sequelize.query(
        "SELECT * FROM tblemp"
    );
    // console.log('employeeList :>> ', employeeList);
    const subscriptions = await getSubscriptionsByCustId(req.user?.custid);
    try {
        // Connect to CRM database using custid as the database name
        // const sequelize = await dbConectionCRM(custid);
        const {
            title,
            description,
            url,
            icon,
            image,
            // AsignTo,
            AsignBy,
            Type,
            TaskStatus
        } = req.body || {};

        // console.log('TaskStatus :>> ', TaskStatus);
        let { AsignTo } = req.body || {};
        // TYPE : All | Reverse | Single
        if (Type != 'Reverse') {
            // TASK STATUS IS PENDING TO AIGN TO SEND NOTIFICATION
            if (TaskStatus == 'Pending') {
                // USING FOR ASIGN TO ID INCLUDE IN ASIGN BY TO REMOVE AIGN TO ID
                if (String(AsignBy) == String(AsignTo)) {
                    AsignTo = "";
                } else {
                    AsignTo = String(AsignTo)
                        .split(",")
                        .filter(id => id.trim() !== String(AsignBy).trim())
                        .join(",");
                }
            } else {
                AsignTo = "";
            }
        }


        // console.log('AsignBy :>> ', AsignBy);
        // console.log('AsignTo :>> ', AsignTo);


        // Support multiple IDs: "741,131660"
        // Also supports an array: [741, 131660]
        const AsignByDetails = employeeList.find(
            itemEm => String(itemEm.Id) === String(AsignBy)
        );
        const AsignToIds = AsignTo
            ? (Array.isArray(AsignTo) ? AsignTo : String(AsignTo).split(","))
                .map(id => String(id).trim())
                .filter(Boolean)
            : [];

        // If userIds are provided, find matching subscribers.

        const targetSubscriptions = ((Type == 'Single' || Type == 'Reverse' ) && AsignToIds.length > 0)
            ? subscriptions
                .filter(item =>
                    AsignToIds.includes(String(item.userId))
                )
                .map(display => {
                    const UserDetails = employeeList.find(
                        itemEm => String(itemEm.Id) === String(display.userId)
                    );
                    return {
                        ...display,
                        AsignToDetails: UserDetails || null,
                        AsignByDetails: AsignByDetails
                    };
                })
            : Type == 'All' ? subscriptions.map(display => {
                const UserDetails = employeeList.find(
                    itemEm => String(itemEm.Id) === String(display.userId)
                );

                return {
                    ...display,
                    AsignToDetails: UserDetails || null,
                    AsignByDetails: AsignByDetails
                };
            }) : [];

        // console.log('targetSubscriptions :>> ', targetSubscriptions);
        if (targetSubscriptions.length === 0) {
            return res.status(200).json({
                success: false,
                message: AsignToIds.length > 0
                    ? "No subscriptions found for the provided userIds"
                    : "No subscribers found"
            });
        }
        const results = await Promise.allSettled(
            targetSubscriptions.map(async item => {
                try {
                    const payload = JSON.stringify({
                        // title: `New Task Assigned By - ${item.AsignByDetails?.FirstName || ""} ${item.AsignByDetails?.LastName || ""}`.trim(),
                        title: title,
                        body: description,
                        url,
                        // Dynamic icon for each employee
                        icon: item.AsignByDetails?.Img
                            ? `https://taxcrmtesting.taxfile.co.in/UploadFiles/Emp/${item.AsignByDetails.Img}`
                            : 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png' || "",

                        image: "https://taxcrm.taxfile.co.in/Group%209929%20(1).png"
                    });
                    await webpush.sendNotification(
                        item.subscription,
                        payload
                    );

                    return {
                        userId: item.userId,
                        success: true
                    };
                } catch (error) {
                    // Remove expired subscriptions
                    if (
                        error.statusCode === 404 ||
                        error.statusCode === 410
                    ) {
                        const index = subscriptions.findIndex(
                            sub =>
                                sub.subscription.endpoint ===
                                item.subscription.endpoint
                        );

                        if (index !== -1) {
                            subscriptions.splice(index, 1);
                        }
                    }

                    throw error;
                }
            })
        );

        const sent = results.filter(
            result => result.status === "fulfilled"
        ).length;

        const failed = results.length - sent;

        return res.status(200).json({
            success: true,
            message: "Notification sending completed",
            requestedUserIds: AsignToIds.length > 0 ? AsignToIds : "All users",
            totalSubscribers: targetSubscriptions.length,
            sent,
            failed,
            results: results.map((result, index) => ({
                userId: targetSubscriptions[index].userId,
                success: result.status === "fulfilled",
                message: result.status === "fulfilled"
                    ? "Notification sent"
                    : result.reason?.body ||
                    result.reason?.message ||
                    "Notification failed"
            }))
        });

    } catch (error) {
        console.error("Notification error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to send notification"
        });
    }
};

// USING SUBSCRIBE NOTIFICATION
export const subscribe = async (req, res) => {
    try {
        const sequelize = await dbConection('taxfilecrm', process.env.TAXCRM_DB_USER, process.env.TAXCRM_DB_PASSWORD, process.env.TAXCRM_DB_SERVER);
        const { userId, CustId, subscription } = req.body || {};
        // console.log("Subscribe request:", { userId, CustId, endpoint: subscription?.endpoint });
        // Validate request
        if (!userId || !CustId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
            return res.status(400).json({
                success: false,
                message: "userId, CustId, and valid subscription are required"
            });
        }

        const { endpoint, expirationTime, keys } = subscription;
        // Check whether this user's endpoint already exists
        const existing = await sequelize.query(
            `
            SELECT TOP 1 Id
            FROM PushSubscriptions
            WHERE UserId = :UserId
              AND Custid = :Custid
              AND Endpoint = :Endpoint
            `,
            {
                replacements: {
                    UserId: userId,
                    Custid: CustId,
                    Endpoint: endpoint
                },
                type: QueryTypes.SELECT
            }
        );

        if (existing.length > 0) {
            // Update the existing subscription
            await sequelize.query(
                `
                UPDATE PushSubscriptions
                SET
                    P256dh = :P256dh,
                    Auth = :Auth,
                    ExpirationTime = :ExpirationTime,
                    IsActive = 1,
                    UpdatedAt = GETDATE()
                WHERE Id = :Id
                `,
                {
                    replacements: {
                        Id: existing[0].Id,
                        P256dh: keys.p256dh,
                        Auth: keys.auth,
                        ExpirationTime: expirationTime
                            ? new Date(expirationTime)
                            : null
                    },
                    type: QueryTypes.UPDATE
                }
            );

            return res.status(200).json({
                success: true,
                action: "updated",
                message: "Existing subscription updated successfully"
            });
        }

        // Insert a new subscription
        await sequelize.query(`INSERT INTO PushSubscriptions (UserId,Endpoint,P256dh,Auth,ExpirationTime,IsActive,CreatedAt,UpdatedAt,Custid)VALUES(:UserId,:Endpoint,:P256dh,:Auth,:ExpirationTime,1,GETDATE(),GETDATE(),:Custid)`,
            {
                replacements: {
                    UserId: userId,
                    Endpoint: endpoint,
                    P256dh: keys.p256dh,
                    Auth: keys.auth,
                    ExpirationTime: expirationTime
                        ? new Date(expirationTime)
                        : null,
                    Custid: CustId
                },
                type: QueryTypes.INSERT
            }
        );

        return res.status(201).json({
            success: true,
            action: "inserted",
            message: "Subscription saved successfully"
        });

    } catch (error) {
        console.error("Subscribe API error:", error);

        return res.status(500).json({
            success: false,
            message: "Subscription failed",
            error: error.message
        });
    }
};

// USING SUBSCRIBE LIST
export const getSubscriberList = async (req, res) => {
    try {
        const sequelize = await dbConection('taxfilecrm', process.env.TAXCRM_DB_USER, process.env.TAXCRM_DB_PASSWORD, process.env.TAXCRM_DB_SERVER);
        const subscribers = await sequelize.query(
            `
            SELECT
                ROW_NUMBER() OVER (ORDER BY CreatedAt DESC) AS srNo,
                UserId AS userId,
                Custid AS CustId,
                Endpoint AS endpoint,
                ExpirationTime AS expirationTime,
                IsActive AS isActive,
                CreatedAt AS createdAt,
                UpdatedAt AS updatedAt
            FROM PushSubscriptions
            ORDER BY CreatedAt DESC
            `,
            {
                type: QueryTypes.SELECT
            }
        );

        return res.status(200).json({
            success: true,
            totalSubscribers: subscribers.length,
            subscribers
        });

    } catch (error) {
        console.error("Get subscribers error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to get subscribers",
            error: error.message
        });
    }
};

//USING SUBSCRIBE LIST CHECK
export const getSubscriptionsByCustId = async (custid) => {
    const sequelize = await dbConection('taxfilecrm', process.env.TAXCRM_DB_USER, process.env.TAXCRM_DB_PASSWORD, process.env.TAXCRM_DB_SERVER);
    const subscriptions = await sequelize.query(
        `
        SELECT
            Id,
            UserId AS userId,
            Custid AS CustId,
            Endpoint AS endpoint,
            P256dh AS p256dh,
            Auth AS auth,
            IsActive AS isActive
        FROM dbo.PushSubscriptions
        WHERE Custid = :CustId
          AND IsActive = 1
        `,
        {
            replacements: { CustId: custid },
            type: QueryTypes.SELECT
        }
    );

    return subscriptions.map(item => ({
        ...item,
        subscription: {
            endpoint: item.endpoint,
            keys: {
                p256dh: item.p256dh,
                auth: item.auth
            }
        }
    }));
};
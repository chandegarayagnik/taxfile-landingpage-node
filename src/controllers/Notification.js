import webpush from "web-push";
import { dbConection, dbConectionCRM } from "../config/db.js";

// Configure Web Push
webpush.setVapidDetails(
    process.env.VAPID_SUBJECT_CRM,
    process.env.VAPID_PUBLIC_KEY_CRM,
    process.env.VAPID_PRIVATE_KEY_CRM
);

// console.log('webpush :>> ', webpush);
// console.log('process.env.VAPID_SUBJECT :>> ', process.env.VAPID_PUBLIC_KEY);
// Demo storage only; use SQL/MongoDB in production
// const subscriptions = new Map();
// console.log('subscriptions :>> ', subscriptions);
// Get public VAPID key



export const getPublicKey = (req, res) => {
    res.json({
        publicKey: process.env.VAPID_PUBLIC_KEY,
    });
};

const subscriptions = [];



export const sendNotification = async (req, res) => {
    // Extract CustId from decoded JWT token (authenticateJWTCRM uses jwt.decode)
    const custid = req.user?.CustId || req.user?.custid || req.user?.custId;
    // console.log('req.user :>> ', req.user);
    const sequelize = await dbConectionCRM(custid);
    const [employeeList] = await sequelize.query(
        "SELECT * FROM tblemp"
    );
    console.log('employeeList :>> ', employeeList);
    try {
        // Connect to CRM database using custid as the database name
        const sequelize = await dbConectionCRM(custid);
        const {
            title,
            description,
            url,
            icon,
            image,
            AsignTo,
            AsignBy
        } = req.body || {};

        // if (!title || !description || !url) {
        //     return res.status(400).json({
        //         success: false,
        //         message: "Title, description and url are required"
        //     });
        // }

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

        const targetSubscriptions = AsignToIds.length > 0
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
            : subscriptions.map(display => {
                const UserDetails = employeeList.find(
                    itemEm => String(itemEm.Id) === String(display.userId)
                );

                return {
                    ...display,
                    AsignToDetails: UserDetails || null,
                    AsignByDetails: AsignByDetails
                };
            });

        console.log('targetSubscriptions :>> ', targetSubscriptions);
        if (targetSubscriptions.length === 0) {
            return res.status(404).json({
                success: false,
                message: AsignToIds.length > 0
                    ? "No subscriptions found for the provided userIds"
                    : "No subscribers found"
            });
        }

        // const payload = JSON.stringify({
        //     title,
        //     body: description,
        //     url,
        //     icon: icon || "",
        //     image: "https://taxcrmtesting.taxfile.co.in/UploadFiles/Emp/25acf5eb-0752-460b-b3bb-b86f27aef529.png?n=701"
        // });
        // console.log('payload :>> ', payload);
        const results = await Promise.allSettled(
            targetSubscriptions.map(async item => {
                try {
                    const payload = JSON.stringify({
                        // title,
                        title: `New Task Assigned By - ${item.AsignByDetails?.FirstName || ""} ${item.AsignByDetails?.LastName || ""}`.trim(),
                        body: description,
                        url,
                        // Dynamic icon for each employee
                        icon: item.AsignByDetails?.Img
                            ? `https://taxcrmtesting.taxfile.co.in/UploadFiles/Emp/${item.AsignByDetails.Img}`
                            : 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png' || "",

                        image: "https://taxcrmtesting.taxfile.co.in/UploadFiles/Emp/25acf5eb-0752-460b-b3bb-b86f27aef529.png?n=701"
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

// Never return the full subscription endpoint because it can contain


export const subscribe = async (req, res) => {
    try {
        const { userId, subscription } = req.body || {};
        console.log(' req.body :>> ', req.body);

        if (
            !userId ||
            !subscription ||
            !subscription.endpoint ||
            !subscription.keys ||
            !subscription.keys.p256dh ||
            !subscription.keys.auth
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid userId or subscription"
            });
        }

        // Check whether this endpoint already exists
        const existingIndex = subscriptions.findIndex(
            item => item.subscription.endpoint === subscription.endpoint
        );

        const payload = {
            userId,
            subscription,
        };

        if (existingIndex !== -1) {
            subscriptions[existingIndex] = payload;
        } else {
            subscriptions.push(payload);
        }

        return res.status(200).json({
            success: true,
            message: "Subscription saved successfully",
            totalSubscribers: subscriptions.length,
            data: payload
        });

    } catch (error) {
        console.error("Subscribe error:", error);

        return res.status(500).json({
            success: false,
            message: "Subscription failed"
        });
    }
};


// sensitive subscription information.
export const getEndpointLabel = (endpoint) => {
    try {
        const parsed = new URL(endpoint);
        return `${parsed.hostname}...${parsed.pathname.slice(-8)}`;
    } catch {
        return "Unknown endpoint";
    }
};

// Get subscriber count
export const getSubscriberList = (req, res) => {
    try {
        res.status(200).json({
            success: true,
            totalSubscribers: subscriptions.length,
            subscribers: subscriptions.map((item, index) => ({
                srNo: index + 1,
                userId: item.userId,
                endpoint: item.subscription.endpoint,
                expirationTime: item.subscription.expirationTime
            }))
        });
    } catch (error) {
        console.error("Get subscribers error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get subscribers"
        });
    }
};

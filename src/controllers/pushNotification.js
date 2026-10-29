import webpush from "web-push";
import { dbConection } from "../config/db.js";

webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// Create Subscribe
export const subscribe = async (req, res) => {
    try {
        const sequelize = await dbConection();
        const { subscription } = req.body;
        const IpAddress = req?.headers["x-forwarded-for"] || req?.socket?.remoteAddress || "Not Found";

        console.log('IpAddress :>> ', IpAddress);

        if (
            !subscription?.endpoint ||
            !subscription?.keys?.p256dh ||
            !subscription?.keys?.auth
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid push subscription"
            });
        }

        console.log('subscription :>> ', subscription);

        // Prefer the authenticated user ID in production
        // const UserUkeyID = req.user?.UserUkeyID || userId || null;

        const Endpoint = subscription.endpoint;
        const P256dh = subscription.keys.p256dh;
        const Auth = subscription.keys.auth;
        // const ExpirationTime = subscription.expirationTime
        //     ? new Date(subscription.expirationTime)
        //     : null;

        // Check if this endpoint already exists
        const selectQuery = `
            SELECT TOP 1 SubscriptionID
            FROM PushNotification
            WHERE Endpoint = :Endpoint
        `;

        const [existingRows] = await sequelize.query(selectQuery, {
            replacements: { Endpoint }
        });

        if (existingRows.length > 0) {
            const updateQuery = `
                UPDATE PushNotification
                SET
                    P256dh = :P256dh,
                    Auth = :Auth,
                    IsActive = 1,
                    UpdatedAt = GETDATE(),
                    IpAddress = :IpAddress
                WHERE Endpoint = :Endpoint
            `;

            await sequelize.query(updateQuery, {
                replacements: {
                    P256dh,
                    Auth,
                    Endpoint,
                    IpAddress
                }
            });
        } else {
            const insertQuery = `
                INSERT INTO PushNotification
                (
                    Endpoint,
                    P256dh,
                    Auth,
                    IsActive,
                    CreatedAt,
                    IpAddress 
                )
                VALUES
                (
                    :Endpoint,
                    :P256dh,
                    :Auth,
                    1,
                    GETDATE(),
                    :IpAddress
                )
            `;

            await sequelize.query(insertQuery, {
                replacements: {
                    Endpoint,
                    P256dh,
                    Auth,
                    IpAddress
                }
            });

            console.log('dfdddddddddd :>> ', insertQuery);
        }

        return res.status(201).json({
            success: true,
            message: "Push subscription saved successfully"
        });

    } catch (error) {
        console.error("Subscribe error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to save subscription"
        });
    }
};

// sendNotification
export const sendNotification = async (req, res) => {
    try {
        const sequelize = await dbConection();

        const { title, description, url, icon, image } = req.body;

        console.log('req.body :>> ', req.body);

        if (!title || !description || !url) {
            return res.status(400).json({
                success: false,
                message: "Title, description and url are required"
            });
        }

        const selectQuery = `
            SELECT * FROM PushNotification
            WHERE IsActive = 1
        `;

        const [subscriptions] = await sequelize.query(selectQuery);

        if (subscriptions.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No active subscribers found"
            });
        }

        const payload = JSON.stringify({
            title,
            body: description,
            url,
            icon: icon || "",
            image: image || ""
        });

        const results = await Promise.allSettled(
            subscriptions.map(async (item) => {
                const subscription = {
                    endpoint: item.Endpoint,
                    keys: {
                        p256dh: item.P256dh,
                        auth: item.Auth
                    }
                };

                try {
                    await webpush.sendNotification(
                        subscription,
                        payload
                    );

                    return true;
                } catch (error) {
                    if (
                        error.statusCode === 404 ||
                        error.statusCode === 410
                    ) {
                        await sequelize.query(
                            `UPDATE PushSubscription
                             SET IsActive = 0,
                                 UpdatedAt = GETDATE()
                             WHERE SubscriptionID = :SubscriptionID`,
                            {
                                replacements: {
                                    SubscriptionID: item.SubscriptionID
                                }
                            }
                        );
                    }

                    throw error;
                }
            })
        );

        console.log('results :>> ', results);

        const sent = results.filter(
            result => result.status === "fulfilled"
        ).length;

        const failed = results.length - sent;

        return res.status(200).json({
            success: failed === 0,
            message: "Notification sending completed",
            totalSubscribers: results.length,
            sent,
            failed
        });

    } catch (error) {
        console.error("Send notification error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to send notification"
        });
    }
};

// Get all subscriptions
export const getSubscriptions = async (req, res) => {
    try {
        const sequelize = await dbConection();

        const query = `
            SELECT *
            FROM PushNotification
            ORDER BY CreatedAt DESC
        `;

        const [rows] = await sequelize.query(query);

        return res.status(200).json({
            success: true,
            total: rows.length,
            data: rows
        });

    } catch (error) {
        console.error("Get subscriptions error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to get subscriptions"
        });
    }
};

// Get active subscriber count
export const getSubscriberCount = async (req, res) => {
    try {
        const sequelize = await dbConection();

        const query = `
            SELECT COUNT(*) AS totalSubscribers
            FROM PushNotification
            WHERE IsActive = 1
        `;

        const [rows] = await sequelize.query(query);

        return res.json({
            success: true,
            totalSubscribers: rows[0].totalSubscribers
        });

    } catch (error) {
        console.error("Subscriber count error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to get subscriber count"
        });
    }
};


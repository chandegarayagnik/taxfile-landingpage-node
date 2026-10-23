import express from "express";
import { getEmail, createEmail, deleteEmail } from "../controllers/email.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";
import { subscribe, sendNotification, getSubscriptions, getSubscriberCount } from "../controllers/pushNotification.js";

const router = express.Router();

// Public routes
router.get("/emailList", getEmail);

// Protected routes
router.post("/AddUpdateEmail", authenticateJWT, createEmail);
router.delete("/DeleteEmail/:id", authenticateJWT, deleteEmail);

// Web Push Notification
router.get("/getSubscriberCount", getSubscriberCount);
router.get("/getSubscriptions", getSubscriptions);
router.post("/subscribe", subscribe);
router.post("/sendNotification", sendNotification);

export default router;
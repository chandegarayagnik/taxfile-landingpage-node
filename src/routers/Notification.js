import express from "express";
import {authenticateJWTCRM } from "../middlewares/authMiddleware.js";
import {getSubscriberList, sendNotification, subscribe } from "../controllers/Notification.js";


const router = express.Router();

router.post("/subscribe", subscribe);
router.post("/send", authenticateJWTCRM,sendNotification);
router.get("/subscribers", getSubscriberList);;

export default router;

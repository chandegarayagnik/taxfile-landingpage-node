import express from "express";
import {authenticateJWTCRM } from "../middlewares/authMiddleware.js";
import { getPublicKey, getSubscriberList, sendNotification, subscribe } from "../controllers/Notification.js";


const router = express.Router();

router.get("/public-key", getPublicKey);
router.post("/subscribe", subscribe);
router.post("/send", authenticateJWTCRM,sendNotification);
router.get("/subscribers", getSubscriberList);

// Public routes
// router.post("/", validate(createUserSchema), createUser);
// router.post("/login", loginUser);

// Protected routes
// router.get("/", getUsers);
// router.put("/", validate(updateUserSchema), updateUser);
// router.put('/forgetPassword', validate(forgetPasswordSchema), forgetPassword);
// router.delete("/:UserId", authenticateJWT, deleteUser);

export default router;

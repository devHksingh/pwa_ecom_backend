import express from "express";
import { createOrder, userOrder, userSingleOrder } from "./orderController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All order routes require authentication
router.use(authMiddleware);

// Create new order
router.post("/", createOrder);

// Get all user orders
router.get("/", userOrder);

// Get single order by ID
router.get("/:id", userSingleOrder);

export default router;

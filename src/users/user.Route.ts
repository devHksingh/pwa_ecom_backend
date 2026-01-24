import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  getAllUsers,
  getUserById,
  registerUser,
  loginUser,
} from "./user.Controller.js";

const router = express.Router();

router.get("/", authMiddleware, getAllUsers);
router.get("/:id", authMiddleware, getUserById);
router.post("/register", registerUser);
router.post("/login", loginUser);

export default router;

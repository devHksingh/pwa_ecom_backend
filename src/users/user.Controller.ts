import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware.js";
import createHttpError from "http-errors";
import User from "./user.Model.js";
import logger from "../config/logger.js";
import genrateJWTtoken from "../utils/genrateJWTtoken.js";

// Get all users
/**
 * only admin can access this route
 *
 */

const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const _req = req as AuthRequest;
    const userId = _req._id;
    const userToken = _req.token;
    // check user is admin
    if (!userId) {
      return next(createHttpError(400, "User ID is required"));
    }
    // find user by id
    const users = await User.findById(userId);
    if (!users) {
      return next(createHttpError(404, "User not found"));
    }
    if (users.role !== "admin") {
      return next(createHttpError(403, "Access denied"));
    }
    // fetch all users
    const allUsers = await User.find().select("-password");
    res.status(200).json({ users: allUsers, token: userToken });
  } catch (error) {
    logger.error("Error fetching users:", error);
    return next(createHttpError(500, "Failed to fetch users"));
  }
};

// get single user by id
const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const _req = req as AuthRequest;
    const userId = _req._id;
    const userToken = _req.token;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }
    res.status(200).json({ user, token: userToken });
  } catch (error) {
    logger.error("Error fetching user:", error);
    return next(createHttpError(500, "Failed to fetch user"));
  }
};

// user registration
const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password, address } = req.body;
    // if user already exists return error
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(createHttpError(409, "User already exists"));
    }
    const newUser = new User({ name, email, password, address });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    logger.error("Error registering user:", error);
    return next(createHttpError(500, "Failed to register user"));
  }
};

// user login
const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("-password");
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }
    // compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(createHttpError(401, "Invalid credentials"));
    }
    // generate JWT token
    const token = genrateJWTtoken({
      _id: user._id,
      email: user.email,
      role: user.role,
    });
    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    logger.error("Error logging in user:", error);
    return next(createHttpError(500, "Failed to login user"));
  }
};

// im imlpementing JWT based auth logout can be handled on client side by deleting token.

export { getAllUsers, getUserById, registerUser, loginUser };

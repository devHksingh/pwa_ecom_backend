import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware.js";
import createHttpError from "http-errors";
import Product from "./product.Model.js";
import logger from "../config/logger.js";
import User from "../users/user.Model.js";

/**
 * simple CRUD operations for products ONLY for admin role
 */

// Get all products (for all users no token required)

const getAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const product = await Product.find();
    res.status(200).json({ products: product });
  } catch (error) {
    logger.error("Error fetching products:", error);
    return next(createHttpError(500, "Failed to fetch products"));
  }
};

// Get single product by id (for all users no token required)
const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product) {
      return next(createHttpError(404, "Product not found"));
    }
    res.status(200).json({ product });
  } catch (error) {
    logger.error("Error fetching product:", error);
    return next(createHttpError(500, "Failed to fetch product"));
  }
};

// Create new product (only admin)
const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const _req = req as AuthRequest;
    const userId = _req._id;
    const userToken = _req.token;

    // check user is admin
    if (!userId) {
      return next(createHttpError(400, "User ID is required"));
    }
    const user = await User.findById(userId);
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }
    if (user.role !== "admin") {
      return next(createHttpError(403, "Access denied"));
    }
    const { name, description, price, stock } = req.body;
    const newProduct = new Product({ name, description, price, stock });
    await newProduct.save();
    res.status(201).json({ product: newProduct, token: userToken });
  } catch (error) {
    logger.error("Error creating product:", error);
    return next(createHttpError(500, "Failed to create product"));
  }
};
const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const _req = req as AuthRequest;
    const userId = _req._id;
    const userToken = _req.token;

    // check user is admin
    if (!userId) {
      return next(createHttpError(400, "User ID is required"));
    }
    const user = await User.findById(userId);
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }
    if (user.role !== "admin") {
      return next(createHttpError(403, "Access denied"));
    }

    const { name, description, price, stock } = req.body;
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { name, description, price, stock },
      { new: true }
    );
    if (!updatedProduct) {
      return next(createHttpError(404, "Product not found"));
    }
    res.status(200).json({ product: updatedProduct });
  } catch (error) {
    logger.error("Error updating product:", error);
    return next(createHttpError(500, "Failed to update product"));
  }
};
const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const _req = req as AuthRequest;
    const userId = _req._id;
    const userToken = _req.token;
    // check user is admin
    if (!userId) {
      return next(createHttpError(400, "User ID is required"));
    }
    const user = await User.findById(userId);
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }
    if (user.role !== "admin") {
      return next(createHttpError(403, "Access denied"));
    }
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return next(createHttpError(404, "Product not found"));
    }
    res.status(200).json({ product: deletedProduct, token: userToken });
  } catch (error) {
    logger.error("Error deleting product:", error);
    return next(createHttpError(500, "Failed to delete product"));
  }
};

export {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};

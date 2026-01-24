import type { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import type { AuthRequest } from "../middlewares/authMiddleware.js";
import Product from "../products/product.Model.js";
import Order from "./order.Model.js";
import Cart from "../cart/cart.Model.js";
import logger from "../config/logger.js";

// Place new order
/**
 * verify user by userid from auth middleware
 */

const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shippingAddress, items } = req.body;
    const _req = req as AuthRequest;
    const userId = _req._id;
    const userToken = _req.token;
    if (!userId) {
      return next(createHttpError(400, "User ID is required"));
    }
    // Validate items and calculate total
    let totalAmount = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product);

      if (!product) {
        return next(
          createHttpError(404, `Product with ID ${item.product} not found`)
        );
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}`,
        });
      }
      orderItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
      });
      totalAmount += product.price * item.quantity;
      // Reduce stock
      product.stock -= item.quantity;
      await product.save();

      // Create order
      const order = await Order.create({
        user: userId,
        items: orderItems,
        shippingAddress,
        totalAmount,
        paymentMethod: "cod",
      });
      // Clear cart after successful order
      await Cart.findOneAndUpdate(
        { user: userId },
        { items: [], totalAmount: 0 }
      );
      res.status(201).json({ order, token: userToken });
    }
  } catch (error) {
    return next(createHttpError(500, "Failed to create order"));
  }
};

// Get user's orders
const userOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const _req = req as AuthRequest;
    const userId = _req._id;
    const userToken = _req.token;
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("items.product");
    return res.status(200).json({ orders, token: userToken });
  } catch (error) {
    logger.error("Error fetching user orders:", error);
    return next(createHttpError(500, "Failed to fetch orders"));
  }
};

// Get user single order
const userSingleOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const _req = req as AuthRequest;
    const userId = _req._id;
    const userToken = _req.token;
    const orderId = req.params.id;
    if (!orderId) {
      return next(createHttpError(400, "Order ID is required"));
    }
    const order = await Order.findOne({ _id: orderId, user: userId }).populate(
      "items.product"
    );
    if (!order) {
      return next(createHttpError(404, "Order not found"));
    }
  } catch (error) {
    logger.error("Error fetching user order:", error);
    return next(createHttpError(500, "Failed to fetch order"));
  }
};

export { createOrder, userOrder, userSingleOrder };

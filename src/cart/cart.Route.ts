import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  getCartByUserId,
  addItemToCart,
  updateCartItemQuantity,
  removeItemFromCart,
  clearCart,
} from "./cart.Conroller.js";

const router = express.Router();

// All cart routes require authentication
router.use(authMiddleware);

// Get user's cart
router.get("/", getCartByUserId);

// Add item to cart
router.post("/add", addItemToCart);

// Update item quantity in cart
router.patch("/update/:productId", updateCartItemQuantity);

// Remove item from cart
router.delete("/remove/:productId", removeItemFromCart);

// Clear entire cart
router.delete("/clear", clearCart);

export default router;

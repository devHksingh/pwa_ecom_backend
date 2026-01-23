import Product from "../products/product.Model.js";
import type { AuthRequest } from "../middlewares/authMiddleware.js";
import Cart from "./cart.Model.js";
import type { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";

// Get user cart by user ID

const getCartByUserId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const _req = req as AuthRequest;
    const userId = _req._id;
    if (!userId) {
      return next(createHttpError(400, "User ID is required"));
    }
    let cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }
    res.status(200).json(cart);
  } catch (error) {
    return next(createHttpError(500, "Failed to get cart"));
  }
};

// Add item to cart

const addItemToCart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    /**
     * check product exist and  check stock
     * check quantity is valid
     * check if cart exist
     * if item exist in cart update quantity else add new item
     * save cart
     * if cart not exist create new cart
     * return updated cart
     */
    const _req = req as AuthRequest;
    const userId = _req._id;
    const userToken = _req.token;
    if (!userId) {
      return next(createHttpError(400, "User ID is required"));
    }
    const { productId, quantity } = req.body;
    if (!productId || !quantity) {
      return next(createHttpError(400, "Product ID and quantity are required"));
    }
    const product = await Product.findById(productId);
    if (!product) {
      return next(createHttpError(404, "Product not found"));
    }
    // check stock
    if (product.stock < quantity) {
      return next(createHttpError(400, "Insufficient stock"));
    }
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }
    // checking if item already exist in cart
    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId
    );
    if (existingItem && existingItem.quantity + quantity > product.stock) {
      return next(
        createHttpError(400, "Insufficient stock for the requested quantity")
      );
    }

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity, price: product.price });
    }

    await cart.save();
    await cart.populate("items.product");
    res.status(200).json({ cart, token: userToken });
  } catch (error) {
    return next(createHttpError(500, "Failed to add item to cart"));
  }
};

// Update item quantity in cart
/**
 
 * check cart exist
    * check item exist in cart
    * update quantity
    * save cart
    * return updated cart
    * if quantity is 0 remove item from cart
    * if cart not exist return 404
 */
const updateCartItemQuantity = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const _req = req as AuthRequest;
    const userId = _req._id;
    const userToken = _req.token;
    if (!userId) {
      return next(createHttpError(400, "User ID is required"));
    }
    const { quantity } = req.body;
    const { productId } = req.params;
    if (!productId || !quantity) {
      return next(createHttpError(400, "Product ID and quantity are required"));
    }
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return next(createHttpError(404, "Cart not found"));
    }
    const product = await Product.findById(productId);
    if (!product) {
      return next(createHttpError(404, "Product not found"));
    }
    // check stock
    if (product.stock < quantity) {
      return next(createHttpError(400, "Insufficient stock"));
    }

    if (quantity <= 0) {
      // remove item from cart
      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );
      if (itemIndex !== -1) {
        cart.items.splice(itemIndex, 1);
      }
      await cart.save();
      await cart.populate("items.product");
      return res.status(200).json({ cart, token: userToken });
    } else {
      const existingItem = cart.items.find(
        (item) => item.product.toString() === productId
      );
      existingItem!.quantity = quantity;
      await cart.save();
      await cart.populate("items.product");
      return res.status(200).json({ cart, token: userToken });
    }
  } catch (error) {
    return next(createHttpError(500, "Failed to update cart item quantity"));
  }
};

// Remove item from cart
/**
 * verify product id
 * if product id not valid return 400
 * check cart exist
 * if cart not exist return 404
 * check item exist in cart
 * if item not exist return 404
 * remove item from cart
 * save cart
 * return updated cart
 */

const removeItemFromCart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const _req = req as AuthRequest;
    const userId = _req._id;
    const userToken = _req.token;
    if (!userId) {
      return next(createHttpError(400, "User ID is required"));
    }
    const { productId } = req.params;
    if (!productId) {
      return next(createHttpError(400, "Product ID is required"));
    }
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return next(createHttpError(404, "Cart not found"));
    }
    const product = await Product.findById(productId);
    if (!product) {
      return next(createHttpError(404, "Product not found"));
    }
    // check product exist in cart
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );
    if (itemIndex === -1) {
      return next(createHttpError(404, "Item not found in cart"));
    }
    // remove item from cart
    cart.items.splice(itemIndex, 1);
    await cart.save();
    await cart.populate("items.product");
    return res.status(200).json({ cart, token: userToken });
  } catch (error) {
    return next(createHttpError(500, "Failed to remove item from cart"));
  }
};

// Clear cart
const clearCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const _req = req as AuthRequest;
    const userId = _req._id;
    const userToken = _req.token;
    if (!userId) {
      return next(createHttpError(400, "User ID is required"));
    }
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return next(createHttpError(404, "Cart not found"));
    }
    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();
    await cart.populate("items.product");
    return res.status(200).json({ cart, token: userToken });
  } catch (error) {
    return next(createHttpError(500, "Failed to clear cart"));
  }
};

export {
  getCartByUserId,
  addItemToCart,
  updateCartItemQuantity,
  removeItemFromCart,
  clearCart,
};

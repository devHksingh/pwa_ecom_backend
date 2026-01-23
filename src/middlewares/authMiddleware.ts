import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { config } from "../config/index.js";
import createHttpError from "http-errors";
import User from "../users/user.Model.js";

export interface AuthRequest extends Request {
  _id: string;
  email: string;
  token: string;
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userAuthToken = req.header("Authorization");
  if (!userAuthToken) {
    return next(createHttpError(401, "Authorization header missing"));
  }
  const token = userAuthToken?.replace("Bearer ", "");

  if (!token) {
    return next(createHttpError(401, "Token not found"));
  }

  try {
    const decoded = jwt.verify(
      token,
      config.jwtSecret as string
    ) as jwt.JwtPayload;

    if (!decoded._id || !decoded.email) {
      return next(createHttpError(401, "Invalid token payload"));
    }
    const { email, _id } = decoded;
    /**
     * check user exist in db
     * issue new token if token is about to expire
     * attach token to req object
     * if user not exist return 401
     */
    const user = await User.findById(_id).select("-password");
    if (!user) {
      return next(createHttpError(401, "User not found"));
    }
    // issue new token if token is about to expire in 15 minutes
    const exp = decoded.exp ? decoded.exp * 1000 : 0; // convert to milliseconds
    const now = Date.now();
    let newToken = "";
    if (exp - now < 15 * 60 * 1000) {
      const newJwtToken = jwt.sign(
        { _id: user._id, email: user.email },
        config.jwtSecret as string,
        { expiresIn: "15d" } //TODO: this dummy long expiry for demo purpose i will change it later
      );
      newToken = `Bearer ${newJwtToken}`;
      res.setHeader("Authorization", newToken);
    }
    const _req = req as AuthRequest;
    _req._id = _id;
    _req.email = email;
    _req.token = newToken || userAuthToken;
    next();
  } catch (error) {
    console.log("AUTH Middleware token error:", error);
    return next(
      createHttpError(401, "Invalid or expired  token. Please log in again.")
    );
  }
};

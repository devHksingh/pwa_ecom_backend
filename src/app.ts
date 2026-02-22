import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import { config } from "./config/index.js";
import globalErrorHandler from "./middlewares/globalErrorHandler.js";
import hpp from "hpp";
import cartRoutes from "./cart/cart.Route.js";
import orderRoutes from "./order/order.Route.js";
import productRoutes from "./products/product.Route.js";
import userRoutes from "./users/user.Route.js";
import cookieParser from "cookie-parser";
import otpRoute from "./otp/otp.route.js";

const app = express();

app.use(
  cors({
    origin: config.frontendUrl,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(cookieParser());
app.use(hpp());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// health check route
app.get("/health", (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy snd running",
  });
});

// routs
// API Routes
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/otp", otpRoute);

// global error handler
app.use(globalErrorHandler);

export default app;

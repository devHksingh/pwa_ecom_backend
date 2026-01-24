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

const app = express();

app.use(
  cors({
    origin: config.frontendUrl,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
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

// global error handler
app.use(globalErrorHandler);

export default app;

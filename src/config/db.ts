import mongoose from "mongoose";
import { config } from "./index.js";
import logger from "./logger.js";

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () => {
      logger.info("Connected to database successfully");
      console.log("Connected to database successfully");
    });
    mongoose.connection.on("error", (err) => {
      logger.error("Error in connecting to database.", err);
      // console.log("Error in connecting to database.", err);
    });
    mongoose.connect(config.mongoUri as string);
  } catch (err) {
    logger.error("Falied to connect to database.", err);
    // console.error("Falied to connect to database.", err);
    process.exit(1);
  }
};

export default connectDB;

import winston, { format } from "winston";
import { config } from "./index.js";

const { combine, prettyPrint, timestamp, json } = format;

const logger = winston.createLogger({
  level: "info",
  format: combine(timestamp(), prettyPrint()),
  defaultMeta: {
    serviceName: "event-backend",
  },

  transports: [
    new winston.transports.Console({
      level: "info",
      // format: winston.format.json()
      format: combine(timestamp(), json(), prettyPrint()),
      silent: config.nodeEnv === "test",
    }),
  ],
});

export default logger;

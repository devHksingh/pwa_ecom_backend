import jwt from "jsonwebtoken";
import { config } from "../config/index.js";

const genrateJWTtoken = (payload: object) => {
  const token = jwt.sign(payload, config.jwtSecret as string, {
    expiresIn: "15d", //TODO: this dummy long expiry for demo purpose i will change it later
  });
  return token;
};

export default genrateJWTtoken;

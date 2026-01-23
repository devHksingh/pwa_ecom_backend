import app from "./app.js";
import connectDB from "./config/db.js";
import { config } from "./config/index.js";

const startServer = async () => {
  await connectDB();
  const port = config.port;

  app.listen(port, () => {
    console.log(`Listening on port :${port}`);
  });
};

startServer();

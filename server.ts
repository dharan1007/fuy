// server.ts
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initializeSocket } from "./src/lib/socket";
import { logger } from "./src/lib/logger";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || "", true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      logger.error("Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  // Initialize Socket.io
  initializeSocket(httpServer);

  httpServer
    .once("error", (err) => {
      logger.error("Server error:", err);
      process.exit(1);
    })
    .listen(port, () => {
      logger.info(`> Ready on http://${hostname}:${port}`);
      logger.info(`> Socket.io initialized`);
    });
});

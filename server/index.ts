import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import merchRouter from "./merch/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Mount Stripe webhook BEFORE express.json() so raw body is preserved
  app.use("/api/stripe/webhook", express.raw({ type: "application/json" }), (req, res, next) => {
    req.url = "/webhook";
    (merchRouter as express.Router)(req, res, next);
  });

  // Mount merch API routes
  app.use("/api/merch", merchRouter);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

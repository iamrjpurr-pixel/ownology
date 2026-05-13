/**
 * Vite dev server plugin — proxies /api/merch and /api/stripe/webhook
 * to a small Express server running on a side port during development.
 */

import type { Plugin, ViteDevServer } from "vite";
import express from "express";
import type { AddressInfo } from "net";
import { createServer } from "http";
import merchRouter from "./api.js";

export function vitePluginMerchApi(): Plugin {
  let apiPort: number | null = null;

  return {
    name: "manus-merch-api",
    async configureServer(server: ViteDevServer) {
      const app = express();

      // Webhook needs raw body
      app.use(
        "/api/stripe/webhook",
        express.raw({ type: "application/json" }),
        (req, res, next) => {
          req.url = "/webhook";
          (merchRouter as express.Router)(req, res, next);
        }
      );

      app.use("/api/merch", merchRouter);

      const httpServer = createServer(app);
      await new Promise<void>((resolve) => {
        httpServer.listen(0, "127.0.0.1", () => {
          apiPort = (httpServer.address() as AddressInfo).port;
          console.log(`[merch-api] Dev API server on port ${apiPort}`);
          resolve();
        });
      });

      // Proxy /api/merch and /api/stripe/webhook to the Express side server
      server.middlewares.use(async (req, res, next) => {
        if (
          !req.url?.startsWith("/api/merch") &&
          !req.url?.startsWith("/api/stripe/webhook")
        ) {
          return next();
        }

        const { default: http } = await import("http");
        const proxyReq = http.request(
          {
            hostname: "127.0.0.1",
            port: apiPort!,
            path: req.url,
            method: req.method,
            headers: req.headers,
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
            proxyRes.pipe(res);
          }
        );

        proxyReq.on("error", (err) => {
          console.error("[merch-api proxy error]", err);
          next(err);
        });

        req.pipe(proxyReq);
      });
    },
  };
}

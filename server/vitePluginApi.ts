/**
 * Vite dev server plugin — proxies /api/trpc, /api/oauth, and /api/scheduled
 * to a small Express server running on a side port during development.
 * This mirrors the production setup where Express handles all /api/* routes.
 */
import type { Plugin, ViteDevServer } from "vite";
import express from "express";
import type { AddressInfo } from "net";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

export function vitePluginApi(): Plugin {
  let apiPort: number | null = null;

  return {
    name: "manus-api",
    async configureServer(server: ViteDevServer) {
      // Dynamically import to avoid circular deps at plugin load time
      const { appRouter } = await import("./routers.js");
      const { createContext } = await import("./trpc.js");
      const app = express();

      // tRPC middleware
      app.use(
        "/api/trpc",
        createExpressMiddleware({
          router: appRouter,
          createContext,
        })
      );

      const httpServer = createServer(app);
      await new Promise<void>((resolve) => {
        httpServer.listen(0, "127.0.0.1", () => {
          apiPort = (httpServer.address() as AddressInfo).port;
          console.log(`[api] Dev API server ready on port ${apiPort}`);
          resolve();
        });
      });

      // Proxy /api/trpc and /api/oauth to the Express side server
      server.middlewares.use(async (req, res, next) => {
        if (
          !req.url?.startsWith("/api/trpc") &&
          !req.url?.startsWith("/api/oauth") &&
          !req.url?.startsWith("/api/scheduled")
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
          console.error("[api-proxy] Error:", err.message);
          res.writeHead(502);
          res.end("API proxy error");
        });

        req.pipe(proxyReq);
      });
    },
  };
}

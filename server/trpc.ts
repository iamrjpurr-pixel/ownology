import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Request, Response } from "express";

// ─── Context ──────────────────────────────────────────────────────────────────

export type Context = {
  req: Request;
  res: Response;
  user: { openId: string; name?: string; email?: string; role: "admin" | "user" } | null;
};

export async function createContext({ req, res }: { req: Request; res: Response }): Promise<Context> {
  // JWT auth is handled by the OAuth flow in the full template.
  // For this project we use a simple session cookie approach.
  // The user is set by the auth middleware in routers.ts.
  return { req, res, user: null };
}

// ─── tRPC init ────────────────────────────────────────────────────────────────

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Owner-only procedure — checks OWNER_OPEN_ID env var
export const ownerProcedure = t.procedure.use(({ ctx, next }) => {
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  if (!ownerOpenId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "OWNER_OPEN_ID not configured" });
  if (!ctx.user || ctx.user.openId !== ownerOpenId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

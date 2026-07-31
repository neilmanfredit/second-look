import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config";
import { requireAuth } from "./middleware/auth";
import { apiRateLimit } from "./middleware/rateLimiter";
import flagsRouter from "./routes/flags";
import reportsRouter from "./routes/reports";
import adminRouter from "./routes/admin";
import preferencesRouter from "./routes/preferences";
import notificationsRouter from "./routes/notifications";

const app = express();

app.use(helmet());
app.use(cors({ origin: config.allowedOrigins, credentials: true }));
app.use(express.json({ limit: "64kb" }));
app.use(morgan("combined"));
app.use(apiRateLimit);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/flags", requireAuth as any, flagsRouter);
app.use("/api/reports", requireAuth as any, reportsRouter);
app.use("/api/preferences", requireAuth as any, preferencesRouter);
app.use("/api/admin", requireAuth as any, adminRouter);
app.use("/api/notifications", requireAuth as any, notificationsRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.name === "UnauthorizedError") {
    res.status(401).json({ error: "Invalid or missing token" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(config.port, () => {
  console.log(`second-look backend running on port ${config.port}`);
});

export default app;

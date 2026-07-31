import express from "express";
import { BotFrameworkAdapter } from "botbuilder";
import { SecondLookBot } from "./bot/secondLookBot";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT ?? 3002;

const adapter = new BotFrameworkAdapter({
  appId: process.env.BOT_APP_ID,
  appPassword: process.env.BOT_APP_PASSWORD,
});

adapter.onTurnError = async (context, error) => {
  console.error("Bot turn error:", error);
  await context.sendTraceActivity("OnTurnError", `${error}`, "https://www.botframework.com/schemas/error", "TurnError");
};

const bot = new SecondLookBot();
const app = express();
app.use(express.json());

app.post("/api/messages", (req, res) => {
  adapter.processActivity(req, res, async (context) => {
    await bot.run(context);
  });
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`second-look Teams bot running on port ${PORT}`);
});

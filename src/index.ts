import { Bot } from "grammy";
import * as dotenv from "dotenv";
import { BitteClient } from "./bitte";

dotenv.config();

// Get the bot token from environment variables
const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error("BOT_TOKEN environment variable is not set");
}

const bot = new Bot(token);
const bitteClient = new BitteClient();

// Initialize connection when script starts
bitteClient.initialize()
  .then(() => {
    console.log("Bot is starting...");
    bot.start();
  })
  .catch((error) => {
    console.error("Startup error:", error);
    process.exit(1);
  });

// Basic bot commands
bot.command("start", (ctx) => ctx.reply("Welcome! Bot is running."));
bot.on("message", (ctx) => ctx.reply("Message received!"));
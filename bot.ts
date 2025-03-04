import { Bot } from "grammy";
import * as dotenv from "dotenv";

dotenv.config();

// Get the bot token from environment variables
const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error("BOT_TOKEN environment variable is not set");
}

const bot = new Bot(token);


// Handle the /start command.
bot.command("start", (ctx) => ctx.reply("Welcome! Up and running."));

// Handle other messages.
bot.on("message", (ctx) => ctx.reply("Got another message!"));


bot.start();
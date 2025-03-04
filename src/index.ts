import { Bot } from "grammy";
import * as dotenv from "dotenv";
import { initiateBitteChat } from "./bitte";

dotenv.config();

// Get the bot token from environment variables
const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error("BOT_TOKEN environment variable is not set");
}

const bot = new Bot(token);

async function startBot() {
  try {
    // Test chat connection on startup
    const chatResponse = await initiateBitteChat("Hello");
    console.log('\nBitte Chat Connection Test:');
    console.log(`Status: ${chatResponse.status}`);
    console.log(`Chat ID: ${chatResponse.id}`);

    // Bot commands
    bot.command("start", (ctx) => 
      ctx.reply("Welcome! I'm connected to Bitte AI. Send me a message to start chatting."));

    bot.command("status", async (ctx) => {
      const status = await initiateBitteChat("Check connection");
      await ctx.reply(`Bot Status:\nConnected to Bitte AI\nChat ID: ${status.id}\nStatus: ${status.status}`);
    });
    
    bot.on("message", async (ctx) => {
      if (ctx.message.text) {
        try {
          const response = await initiateBitteChat(ctx.message.text);
          const aiResponse = response.messages[response.messages.length - 1];
          await ctx.reply(aiResponse?.content || "No response from AI");
        } catch (error) {
          await ctx.reply("Sorry, I encountered an error while processing your message.");
        }
      }
    });

    // Start the bot
    console.log('Starting bot...');
    await bot.start();
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
}

startBot();
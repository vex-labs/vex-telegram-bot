import { Bot } from "grammy";
import * as dotenv from "dotenv";
import { bitteChat, BitteMessage } from "./bitte";

dotenv.config();

// Types for message history
interface BitteHistoryMessage {
  role: string;
  content: string;
  tool_invocations?: BitteToolInvocation[];
  annotations?: any;
}

interface BitteToolInvocation {
  state: 'result';
  tool_call_id: string;
  tool_name: string;
  args: any;
  result: any;
}

// Get the bot token from environment variables
const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error("BOT_TOKEN environment variable is not set");
}

const bot = new Bot(token);

// Store active threads and their history by user ID
const activeThreads = new Map<number, {
  threadId: string;
  history: BitteMessage[];
}>();

// Generate a thread ID with username prefix
function generateThreadId(username?: string): string {
  const prefix = username || 'user';
  const randomId = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${randomId}`;
}

async function startBot() {
  try {
    // Test chat connection on startup
    const chatResponse = await bitteChat("Hello", "1");
    console.log('\nBitte Chat Connection Test:');
    console.log(`Status: ${chatResponse.status}`);
    console.log(`Chat ID: ${chatResponse.id}`);

    // Bot commands
    bot.command("start", (ctx) => {
      if (!ctx.from) {
        ctx.reply("Error: Could not identify user.");
        return;
      }

      const userId = ctx.from.id;
      const username = ctx.from.username || `user${userId}`;
      const threadId = generateThreadId(username);
      
      // Initialize thread history
      activeThreads.set(userId, {
        threadId,
        history: [{
          role: "system",
          content: "Conversation started.",
          tool_invocations: []
        }]
      });

      console.log(`New chat started - User ID: ${userId}, Username: @${username}, Thread ID: ${threadId}`);
      ctx.reply("Hello there!");
    });

    bot.command("status", async (ctx) => {
      if (!ctx.from) {
        ctx.reply("Error: Could not identify user.");
        return;
      }

      const userId = ctx.from.id;
      const threadData = activeThreads.get(userId);
      console.log(`Status check by User ID: ${userId}, Thread ID: ${threadData?.threadId}`);
      
      const status = await bitteChat("Check connection", threadData?.threadId, threadData?.history);
      await ctx.reply(
        `Bot Status:\nConnected\nChat ID: ${status.id}\nStatus: ${status.status}\nThread ID: ${threadData?.threadId}`
      );
    });
    
    bot.on("message", async (ctx) => {
      if (!ctx.from) {
        ctx.reply("Error: Could not identify user.");
        return;
      }

      if (ctx.message.text) {
        try {
          const userId = ctx.from.id;
          let threadData = activeThreads.get(userId);
          
          // If no thread exists for this user, create one
          if (!threadData) {
            const username = ctx.from.username || `user${userId}`;
            const threadId = generateThreadId(username);
            threadData = {
              threadId,
              history: [{
                role: "system",
                content: "Conversation started.",
                tool_invocations: []
              }]
            };
            activeThreads.set(userId, threadData);
            console.log(`New thread created for User ID: ${userId}, Thread ID: ${threadId}`);
          }

          // Get the response with full history
          const response = await bitteChat(ctx.message.text, threadData.threadId, threadData.history);
          
          // Add user message to history
          threadData.history.push({
            role: "user",
            content: ctx.message.text,
            tool_invocations: []
          });
          
          // Add AI response to history
          if (response.messages && response.messages.length > 0) {
            const aiResponse = response.messages[response.messages.length - 1];
            threadData.history.push(aiResponse);
            await ctx.reply(aiResponse.content || "No response from AI");
          } else {
            await ctx.reply("No response from AI");
          }

          // Update the thread data
          activeThreads.set(userId, threadData);
          
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
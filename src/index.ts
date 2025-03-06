import { Bot } from "grammy";
import * as dotenv from "dotenv";
import { bitteChat, BitteMessage } from "./bitte";
import { formatUsdcAmount } from "./utils";
import { findUserByTelegramUsername } from './dbInteraction';

dotenv.config();

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

// Add this type at the top of the file with other types
type PendingBet = {
  matchId: string;
  team: string;
  amount: string;
  accountId: string;
  mpcKey: string;
  teamA: string;
  teamB: string;
  date: string;
};

// Add this map to store pending bets
const pendingBets = new Map<number, PendingBet>();

// Generate a thread ID with username prefix
function generateThreadId(username?: string): string {
  const prefix = username || 'user';
  const randomId = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${randomId}`;
}

async function startBot() {
  try {
    console.log('Active threads at startup:', activeThreads.size); // Should show 0
    // Clear all active threads on startup
    activeThreads.clear();
    
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
      ctx.reply("Hello there! I am all that stands between you and becoming a BetVEX Insider Tester. Why would you like to become a tester?");
    });

    bot.command("status", async (ctx) => {
      if (!ctx.from) {
        ctx.reply("Error: Could not identify user.");
        return;
      }

      const userId = ctx.from.id;
      const threadData = activeThreads.get(userId);
      console.log(`Status check by User ID: ${userId}, Thread ID: ${threadData?.threadId}`);
      
      // Show typing indicator
      await ctx.api.sendChatAction(ctx.chat.id, "typing");
      
      const status = await bitteChat("Check connection", threadData?.threadId, threadData?.history);
      await ctx.reply(
        `Bot Status:\nConnected\nChat ID: ${status.id}\nStatus: ${status.status}\nThread ID: ${threadData?.threadId}`
      );
    });

    
 // Add this after your other command handlers
 bot.command("bet", async (ctx) => {
  if (!ctx.from) {
    ctx.reply("Error: Could not identify user.");
    return;
  }

  if (!ctx.from.username) {
    await ctx.reply("You need to set up a Telegram username to use betting features. Please set a username in your Telegram settings and try again.");
    return;
  }

  // Check if user is registered using username instead of ID
  const userData = await findUserByTelegramUsername(ctx.from.username);
  console.log(`User data for @${ctx.from.username}:`, userData);
  
  if (!userData) {
    await ctx.reply("You are not signed up for telegram betting, you need to register at testnet.betvex.xyz/settings");
    return;
  }

  console.log(`Received bet command: ${ctx.message?.text}`);

  const userId = ctx.from.id;
  const username = ctx.from.username || `user${userId}`;
  const threadId = generateThreadId(username);
  
  const betMessage = ctx.message?.text?.split('/bet')[1]?.trim();
  
  if (!betMessage) {
    await ctx.reply("Please provide bet details after the /bet command.");
    return;
  }

  try {
    await ctx.api.sendChatAction(ctx.chat.id, "typing");

    // Create new thread specifically for betting
    const threadData = {
      threadId,
      history: [{
        role: "system",
        content: "You are a betting assistant that helps users place bets. Process the bet request and respond with either a success message in the exact format 'Success: {matchId} {team} {amount} {accountId}' or an error message starting with 'ERROR:'.",
        tool_invocations: []
      }]
    };

    // Add --form-bet to the message with the user's account ID
    const formattedMessage = `${betMessage} --form-bet ${userData.account_id}`;
    console.log(`Formatted message: ${formattedMessage}`);
    
    // Call Bitte AI with the formatted message
    const response = await bitteChat(formattedMessage, threadId, threadData.history);
    
    if (!response.messages || response.messages.length === 0) {
      await ctx.reply("Sorry, I received no response from the betting system.");
      return;
    }

    const aiResponse = response.messages[response.messages.length - 1].content;
    console.log(`AI response: ${aiResponse}`);
    
    if (aiResponse.startsWith("Success:")) {
      // Parse success response
      const [_, matchId, team, amount, accountId] = aiResponse.match(/Success: (\S+) (\S+) (\S+) (\S+)/) || [];
      
      // Parse matchId to get teams and date
      const matchParts = matchId.split('-');
      const teamA = matchParts[0].replace(/_/g, ' ');
      const teamB = matchParts[1].replace(/_/g, ' ');
      const date = matchParts[2];
      
      // Store the pending bet with mpcKey
      pendingBets.set(ctx.from.id, {
        matchId,
        team,
        amount,
        accountId: userData.account_id,
        mpcKey: userData.mpc_key,
        teamA,
        teamB,
        date
      });
      
      let displayAmount = formatUsdcAmount(amount);

      // Send confirmation message
      await ctx.reply(
        `Confirm you want to place the following bet\n` +
        `Match: ${teamA} vs ${teamB}\n` +
        `Date: ${date}\n` +
        `Team: ${team}\n` +
        `Bet amount: $${displayAmount}\n\n` +
        `Respond with Yes/No`
      );
    } else if (aiResponse.startsWith("ERROR:")) {
      await ctx.reply(aiResponse);
    } else {
      await ctx.reply("Sorry, I received an unexpected response from the betting system.");
    }

  } catch (error) {
    console.error('Error processing bet:', error);
    await ctx.reply("Sorry, there was an error processing your bet. Please try again.");
  }
});

    
    
    bot.on("message", async (ctx) => {
      if (!ctx.from || !ctx.message.text) return;
      
      const pendingBet = pendingBets.get(ctx.from.id);
      
      if (pendingBet) {
        const response = ctx.message.text.toLowerCase();
        
        if (response === 'yes') {
          await ctx.reply("Placing bet");
          // Here you would add the code to actually place the bet
          console.log(`Bet placed successfully:
            Match ID: ${pendingBet.matchId}
            Team: ${pendingBet.team}
            Amount: ${pendingBet.amount}
            Account ID: ${pendingBet.accountId}
          `);
          // Clear the pending bet
          pendingBets.delete(ctx.from.id);
        } else if (response === 'no') {
          await ctx.reply("Cancelling bet");
          // Clear the pending bet
          pendingBets.delete(ctx.from.id);
        } else {
          await ctx.reply("Please respond Yes/No");
          return;
        }
      } else {
        // If no pending bet, process as normal message
        if (!ctx.from) {
          ctx.reply("Error: Could not identify user.");
          return;
        }
        console.log(`Received message: ${ctx.message.text}`);

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

            // Show typing indicator
            await ctx.api.sendChatAction(ctx.chat.id, "typing");

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
import express from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { Telegraf } from "telegraf";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;

// Simple In-Memory "Database"
interface Chat {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  lastMessage: string;
  lastTimestamp: number;
}

interface Message {
  chatId: number;
  text: string;
  sender: 'user' | 'admin' | 'ai';
  timestamp: number;
}

interface Config {
  botToken: string;
  openRouterKey: string;
  openRouterModel: string;
  autoReplyEnabled: boolean;
  autoReplyPrompt: string;
}

const chats = new Map<number, Chat>();
const messages: Message[] = [];
let botConfig: Config = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || "",
  openRouterKey: process.env.OPENROUTER_API_KEY || "",
  openRouterModel: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
  autoReplyEnabled: false,
  autoReplyPrompt: "You are a helpful assistant. Provide concise replies."
};

let bot: Telegraf | null = null;
let isBotRunning = false;

async function startBot() {
  if (!botConfig.botToken) return;
  
  if (bot && isBotRunning) {
    try {
      console.log("Stopping existing bot instance...");
      await bot.stop();
      isBotRunning = false;
    } catch (e) {
      console.error("Error stopping previous bot instance:", (e as Error).message);
    }
  }

  // Create new instance
  bot = new Telegraf(botConfig.botToken);

  bot.on('message', async (ctx) => {
    if ('text' in ctx.message) {
      const chatId = ctx.chat.id;
      const text = ctx.message.text;
      const from = ctx.from;

      // Update chat list
      const chat: Chat = {
        id: chatId,
        firstName: from.first_name,
        lastName: from.last_name,
        username: from.username,
        lastMessage: text,
        lastTimestamp: Date.now()
      };
      chats.set(chatId, chat);

      // Save message
      const msg: Message = {
        chatId,
        text,
        sender: 'user',
        timestamp: Date.now()
      };
      messages.push(msg);

      // Notify via socket
      io.emit('new_message', msg);
      io.emit('chat_updated', chat);

      // Automated Reply Logic
      if (botConfig.autoReplyEnabled && botConfig.openRouterKey) {
        try {
          const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              model: botConfig.openRouterModel,
              messages: [
                { role: "system", content: botConfig.autoReplyPrompt },
                { role: "user", content: text }
              ]
            },
            {
              headers: {
                "Authorization": `Bearer ${botConfig.openRouterKey}`,
                "Content-Type": "application/json"
              }
            }
          );

          const aiText = response.data.choices[0].message.content;
          
          await ctx.reply(aiText);

          const aiMsg: Message = {
            chatId,
            text: aiText,
            sender: 'ai',
            timestamp: Date.now()
          };
          messages.push(aiMsg);
          io.emit('new_message', aiMsg);
        } catch (error) {
          console.error("OpenRouter automation error:", (error as any).response?.data || (error as Error).message);
        }
      }
    }
  });

  try {
    // dropPendingUpdates: true helps avoid the 409 conflict on restarts
    await bot.launch({ dropPendingUpdates: true });
    isBotRunning = true;
    console.log("Bot started successfully");
  } catch (err) {
    console.error("Telegraf launch error:", (err as Error).message);
    isBotRunning = false;
  }
}

// Initialize server
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  }
});

app.use(express.json());

// API Routes
app.get("/api/config", (req, res) => {
  res.json({
    hasBotToken: !!botConfig.botToken,
    hasOpenRouterKey: !!botConfig.openRouterKey,
    openRouterModel: botConfig.openRouterModel,
    autoReplyEnabled: botConfig.autoReplyEnabled,
    autoReplyPrompt: botConfig.autoReplyPrompt
  });
});

app.post("/api/config", async (req, res) => {
  const { botToken, openRouterKey, openRouterModel, autoReplyEnabled, autoReplyPrompt } = req.body;
  if (botToken !== undefined) botConfig.botToken = botToken;
  if (openRouterKey !== undefined) botConfig.openRouterKey = openRouterKey;
  if (openRouterModel !== undefined) botConfig.openRouterModel = openRouterModel;
  if (autoReplyEnabled !== undefined) botConfig.autoReplyEnabled = autoReplyEnabled;
  if (autoReplyPrompt !== undefined) botConfig.autoReplyPrompt = autoReplyPrompt;

  if (botToken) {
    await startBot();
  }
  
  res.json({ success: true });
});

app.get("/api/chats", (req, res) => {
  const sortedChats = Array.from(chats.values()).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  res.json(sortedChats);
});

app.get("/api/messages/:chatId", (req, res) => {
  const chatId = parseInt(req.params.chatId);
  const chatMessages = messages.filter(m => m.chatId === chatId);
  res.json(chatMessages);
});

app.post("/api/send", async (req, res) => {
  const { chatId, text } = req.body;
  if (!bot) return res.status(400).json({ error: "Bot not started" });

  try {
    await bot.telegram.sendMessage(chatId, text);
    const msg: Message = {
      chatId,
      text,
      sender: 'admin',
      timestamp: Date.now()
    };
    messages.push(msg);
    io.emit('new_message', msg);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Start bot if token exists
  if (botConfig.botToken) {
    startBot();
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

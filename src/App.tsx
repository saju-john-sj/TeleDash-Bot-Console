import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { MessageSquare, Settings as SettingsIcon, Bot, Send, User, ChevronRight, Hash, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { Chat, Message, Config } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chats' | 'settings'>('chats');
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    fetchConfig();
    fetchChats();

    newSocket.on('new_message', (msg: Message) => {
      setMessages(prev => {
        if (selectedChat && msg.chatId === selectedChat.id) {
          return [...prev, msg];
        }
        return prev;
      });
      fetchChats();
    });

    newSocket.on('chat_updated', () => {
      fetchChats();
    });

    return () => {
      newSocket.close();
    };
  }, [selectedChat]);

  const fetchConfig = async () => {
    try {
      const res = await axios.get('/api/config');
      setConfig(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchChats = async () => {
    try {
      const res = await axios.get('/api/chats');
      setChats(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (chatId: number) => {
    try {
      const res = await axios.get(`/api/messages/${chatId}`);
      setMessages(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    fetchMessages(chat.id);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !selectedChat) return;

    try {
      await axios.post('/api/send', {
        chatId: selectedChat.id,
        text: inputText
      });
      setInputText('');
    } catch (e) {
      console.error(e);
      alert('Failed to send message. Check bot token.');
    }
  };

  const saveConfig = async (newConfig: any) => {
    try {
      await axios.post('/api/config', newConfig);
      fetchConfig();
      fetchChats();
    } catch (e) {
      console.error(e);
      alert('Failed to save config.');
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0a] text-white">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Bot className="w-8 h-8 opacity-50" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#0a0a0a] text-zinc-100 flex overflow-hidden font-sans">
      <div className="w-16 border-r border-zinc-800 flex flex-col items-center py-6 gap-8 bg-[#0f0f0f]">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mb-4 border border-indigo-400/30 shadow-[0_0_15px_rgba(79,70,229,0.2)]">
          <Bot className="w-6 h-6 text-white" />
        </div>
        
        <button 
          onClick={() => setActiveTab('chats')}
          className={`p-3 rounded-xl transition-all ${activeTab === 'chats' ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
        >
          <MessageSquare className="w-6 h-6" />
        </button>

        <button 
          onClick={() => setActiveTab('settings')}
          className={`p-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
        >
          <SettingsIcon className="w-6 h-6" />
        </button>

        <div className="mt-auto opacity-20 hover:opacity-100 transition-opacity">
          <Terminal className="w-5 h-5" />
        </div>
      </div>

      {activeTab === 'chats' ? (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-80 border-r border-zinc-800 flex flex-col bg-[#0d0d0d]">
            <div className="p-6 border-bottom border-zinc-800">
              <h2 className="text-xl font-semibold tracking-tight">Messages</h2>
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-mono">Real-time Console</p>
            </div>
            
            <div className="flex-1 overflow-y-auto px-3 pb-6">
              {chats.length === 0 ? (
                <div className="p-8 text-center text-zinc-600 text-sm italic">
                  No active chats yet. Start talking to your bot!
                </div>
              ) : (
                chats.map(chat => (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={chat.id}
                    onClick={() => handleSelectChat(chat)}
                    className={`w-full text-left p-4 rounded-xl mb-2 transition-all flex items-center gap-3 relative group ${
                      selectedChat?.id === chat.id 
                        ? 'bg-zinc-800 shadow-lg' 
                        : 'hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 font-medium">
                      {chat.firstName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-semibold truncate">
                          {chat.firstName} {chat.lastName}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {format(chat.lastTimestamp, 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">
                        {chat.lastMessage}
                      </p>
                    </div>
                    {selectedChat?.id === chat.id && (
                      <motion.div 
                        layoutId="active-chat"
                        className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full"
                      />
                    )}
                  </motion.button>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-[#0a0a0a]">
            {selectedChat ? (
              <>
                <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-[#0f0f0f]/80 backdrop-blur-md sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold shadow-indigo-500/20 shadow-lg">
                      {selectedChat.firstName[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{selectedChat.firstName} {selectedChat.lastName}</h3>
                      {selectedChat.username && (
                        <p className="text-[10px] text-zinc-500 font-mono">@{selectedChat.username}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
                      <Hash className="w-3 h-3" />
                      ID: {selectedChat.id}
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth">
                  <AnimatePresence initial={false}>
                    {[...messages].map((msg, idx) => (
                      <motion.div
                        key={`${msg.timestamp}-${idx}`}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex ${msg.sender === 'admin' || msg.sender === 'ai' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] group relative`}>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                            msg.sender === 'admin' 
                              ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/10 shadow-xl' 
                              : msg.sender === 'ai'
                              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-tr-none shadow-emerald-500/5'
                              : 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700/50 shadow-black/20 shadow-xl'
                          }`}>
                            {msg.text}
                          </div>
                          <div className={`mt-1 text-[9px] text-zinc-600 font-mono flex items-center gap-1 ${msg.sender !== 'user' ? 'flex-row-reverse' : ''}`}>
                            <span>{format(msg.timestamp, 'HH:mm:ss')}</span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest font-bold">
                              {msg.sender}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="p-4 bg-[#0d0d0d] border-t border-zinc-800">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600"
                      placeholder={`Reply to ${selectedChat.firstName}...`}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    />
                    <button 
                      type="submit"
                      disabled={!inputText.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white p-2.5 rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-24 h-24 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center mb-6"
                >
                  <MessageSquare className="w-12 h-12 opacity-20" />
                </motion.div>
                <h3 className="text-xl font-medium text-zinc-400">Select a conversation</h3>
                <p className="text-sm mt-2 opacity-60">Manage your Telegram community in real-time</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Settings config={config} onSave={saveConfig} />
      )}
    </div>
  );
}

function Settings({ config, onSave }: { config: Config | null, onSave: (cfg: any) => void }) {
  const [botToken, setBotToken] = useState('');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [openRouterModel, setOpenRouterModel] = useState(config?.openRouterModel || 'google/gemini-2.0-flash-001');
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(config?.autoReplyEnabled || false);
  const [autoReplyPrompt, setAutoReplyPrompt] = useState(config?.autoReplyPrompt || '');

  useEffect(() => {
    if (config) {
      setOpenRouterModel(config.openRouterModel);
      setAutoReplyEnabled(config.autoReplyEnabled);
      setAutoReplyPrompt(config.autoReplyPrompt);
    }
  }, [config]);

  return (
    <div className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Configuration</h2>
        <p className="text-zinc-500">Manage your Telegram bot authentication and AI automation rules.</p>
      </div>

      <div className="space-y-8">
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold">Telegram Bot</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Bot Token</label>
              <input
                type="password"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                placeholder={config?.hasBotToken ? "••••••••••••••••••••••••" : "Paste your HTTP API Token from @BotFather"}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
              />
              <p className="text-[10px] text-zinc-600 mt-2 px-1">
                {config?.hasBotToken ? "Token is set. Enter a new one to update." : "Bot will start automatically once token is saved."}
              </p>
            </div>
          </div>
        </section>

        <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Hash className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold">AI Automation (OpenRouter)</h3>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-zinc-800/30 p-4 rounded-xl border border-zinc-800">
              <div>
                <h4 className="text-sm font-medium">Enable Auto-Reply</h4>
                <p className="text-xs text-zinc-500">Automate responses during offline hours</p>
              </div>
              <button
                onClick={() => setAutoReplyEnabled(!autoReplyEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${autoReplyEnabled ? 'bg-indigo-600' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${autoReplyEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className={`space-y-4 transition-all ${autoReplyEnabled ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">API Key</label>
                <input
                  type="password"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                  placeholder={config?.hasOpenRouterKey ? "••••••••••••••••••••••••" : "sk-or-v1-..."}
                  value={openRouterKey}
                  onChange={(e) => setOpenRouterKey(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Model Name</label>
                <input
                  type="text"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                  placeholder="e.g., google/gemini-2.0-flash-001"
                  value={openRouterModel}
                  onChange={(e) => setOpenRouterModel(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">System Prompt</label>
                <textarea
                  className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
                  placeholder="Guidelines for AI behavior..."
                  value={autoReplyPrompt}
                  onChange={(e) => setAutoReplyPrompt(e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button
            onClick={() => onSave({ 
              botToken: botToken || undefined, 
              openRouterKey: openRouterKey || undefined,
              openRouterModel,
              autoReplyEnabled,
              autoReplyPrompt
            })}
            className="bg-zinc-100 hover:bg-white text-black font-bold py-4 px-12 rounded-2xl transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}

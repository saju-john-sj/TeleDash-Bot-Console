export interface Chat {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  lastMessage: string;
  lastTimestamp: number;
}

export interface Message {
  chatId: number;
  text: string;
  sender: 'user' | 'admin' | 'ai';
  timestamp: number;
}

export interface Config {
  hasBotToken: boolean;
  hasOpenRouterKey: boolean;
  openRouterModel: string;
  autoReplyEnabled: boolean;
  autoReplyPrompt: string;
}

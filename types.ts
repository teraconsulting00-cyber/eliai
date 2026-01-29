
export enum ModelType {
  FLASH = 'gemini-flash-latest',
  PRO = 'gemini-3-pro-preview',
  FLASH_3 = 'gemini-3-flash-preview'
}

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  data: string; // Base64
  previewUrl?: string;
  isText?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  attachments?: Attachment[];
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastModified: number;
  config: GenerationConfig;
}

export interface GenerationConfig {
  model: ModelType;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens?: number;
  thinkingBudget?: number;
  systemInstruction: string;
}

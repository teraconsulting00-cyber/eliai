
import { GoogleGenAI, Content, Part } from "@google/genai";
import { Message, GenerationConfig, Attachment } from "../types";

const KEY_INDEX_STORAGE = 'gemini_active_key_index';

export let LASTANSWER: string = "";
export let ERROR: string = "";

class ApiKeyManager {
  private keys: string[] = [];
  private currentIndex: number = 0;

  constructor() {
    const rawValue = process.env.API_KEY || '';
    this.keys = rawValue.split(',').map(k => k.trim()).filter(k => k.length > 0);
    
    const savedIndex = localStorage.getItem(KEY_INDEX_STORAGE);
    if (savedIndex !== null) {
      const idx = parseInt(savedIndex, 10);
      if (idx < this.keys.length) this.currentIndex = idx;
    }
  }

  getCurrentKey() {
    return this.keys[this.currentIndex] || '';
  }

  rotate() {
    if (this.keys.length <= 1) return false;
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    localStorage.setItem(KEY_INDEX_STORAGE, this.currentIndex.toString());
    return true;
  }

  get keyCount() { return this.keys.length; }
  get activeIndex() { return this.currentIndex; }
}

export const keyManager = new ApiKeyManager();

export const getActiveKeyInfo = () => ({
  index: keyManager.activeIndex,
  total: keyManager.keyCount
});

export async function ASKAI(
  ask: string,
  files: Attachment[],
  history: Message[],
  config: GenerationConfig
): Promise<string> {
  ERROR = "";
  
  const attemptRequest = async (attempt: number): Promise<string> => {
    const apiKey = keyManager.getCurrentKey();
    if (!apiKey) {
      ERROR = "SYSTEM_ERROR: API KEY MISSING";
      throw new Error(ERROR);
    }

    const ai = new GoogleGenAI({ apiKey });
    const currentParts: Part[] = [{ text: ask || " " }];
    
    files.forEach(file => {
      const base64Data = file.data.includes(',') ? file.data.split(',')[1] : file.data;
      currentParts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: base64Data
        }
      });
    });

    const contents: Content[] = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content || " " }]
    }));

    contents.push({ role: 'user', parts: currentParts });

    try {
      const response = await ai.models.generateContent({
        model: config.model,
        contents,
        config: {
          systemInstruction: config.systemInstruction,
          temperature: config.temperature,
          topP: config.topP,
          topK: config.topK,
          maxOutputTokens: config.maxOutputTokens,
          thinkingConfig: config.thinkingBudget !== undefined ? { thinkingBudget: config.thinkingBudget } : undefined
        },
      });

      const text = response.text || "";
      LASTANSWER = text;
      return text;
    } catch (err: any) {
      if (attempt < keyManager.keyCount - 1) {
        keyManager.rotate();
        return attemptRequest(attempt + 1);
      }
      ERROR = `ENGINE_ERROR: ${err.message || "REQUEST_FAILED"}`;
      throw new Error(ERROR);
    }
  };

  return attemptRequest(0);
}

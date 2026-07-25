
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

let chatSession: Chat | null = null;

export const initializeChat = (): Chat => {
  if (chatSession) return chatSession;

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: `You are 'SENTINEL', the AI Security Analyst for the Honeypot-in-a-Box system.
      
      System Context:
      - We are monitoring a network of honeypots (Web, DB, SSH).
      - GeoIP tracking is active.
      - Machine Learning models (Random Forest) are classifying attacks with 98% precision.
      
      Tone: Professional, precise, slightly robotic but helpful. Use terms like "Payload", "Vector", "Origin", "Mitigation".
      
      Capabilities:
      - Analyze threat logs.
      - Explain common vulnerabilities (SQLi, XSS, RCE).
      - Recommend firewall rules.
      
      Keep responses concise and actionable.`,
    },
  });

  return chatSession;
};

export const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!API_KEY) {
    return "Encrypted channel offline. (Missing API Key)";
  }

  try {
    const chat = initializeChat();
    const response: GenerateContentResponse = await chat.sendMessage({ message });
    return response.text || "No data received.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Connection timeout. Security protocol engaged.";
  }
};

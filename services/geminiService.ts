import { GoogleGenAI, Type } from "@google/genai";
import { CloudProvider } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeSyncTask = async (
  source: CloudProvider,
  dest: CloudProvider,
  isTwoWay: boolean
): Promise<{ suggestion: string; estimatedTime: string; tips: string[] }> => {
  try {
    const prompt = `
      I am configuring a cloud synchronization task.
      Source: ${source.type} (Used: ${source.usedSpace})
      Destination: ${dest.type} (Total: ${dest.totalSpace})
      Direction: ${isTwoWay ? "Two-way Sync" : "One-way Sync"}

      Please analyze this configuration and provide:
      1. A brief suggestion or warning about compatibility between these providers.
      2. An estimated time calculation logic description (mock).
      3. 3 specific tips for optimizing this transfer.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestion: { type: Type.STRING },
            estimatedTime: { type: Type.STRING },
            tips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("No response from AI");

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return {
      suggestion: "Standard sync configuration detected.",
      estimatedTime: "Calculating...",
      tips: ["Ensure stable internet connection", "Check available storage space"]
    };
  }
};

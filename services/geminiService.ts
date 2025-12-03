import { GoogleGenAI, Type } from "@google/genai";
import { CloudProvider } from "../types";

export const analyzeSyncTask = async (
  source: CloudProvider,
  dest: CloudProvider,
  isTwoWay: boolean
): Promise<{ suggestion: string; estimatedTime: string; tips: string[] }> => {
  try {
    // Vercel and other platforms require environment variables to be explicitly set.
    // If the API_KEY is not available, throw an error to be caught locally.
    if (!process.env.API_KEY) {
      throw new Error("Gemini API key is not configured for this environment.");
    }

    // Initialize the AI client inside the function call.
    // This prevents the entire application from crashing on load if the key is missing.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      I am configuring a cloud synchronization task.
      Source: ${source.type} (Folder: ${source.selectedFolder?.name})
      Destination: ${dest.type} (Folder: ${dest.selectedFolder?.name})
      Direction: ${isTwoWay ? "Two-way Sync" : "One-way Sync"}

      Please analyze this configuration and provide:
      1. A brief suggestion or warning about this specific sync pair.
      2. An estimated time to sync, assuming a 100 GB transfer at 50 Mbps.
      3. 3 specific, actionable tips for optimizing this transfer.
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
    // Return a graceful fallback instead of crashing the app.
    return {
      suggestion: "AI analysis unavailable. API Key may be missing.",
      estimatedTime: "N/A",
      tips: [
        "Ensure stable internet connection.", 
        "Check available storage on destination.",
        "Avoid syncing very large files during peak hours."
      ]
    };
  }
};

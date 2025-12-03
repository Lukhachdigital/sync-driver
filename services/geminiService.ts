import { CloudProvider } from "../types";

export const analyzeSyncTask = async (
  source: CloudProvider,
  dest: CloudProvider,
  isTwoWay: boolean
): Promise<{ suggestion: string; estimatedTime: string; tips: string[] }> => {
  // The browser environment does not have process.env, which caused the app to crash.
  // This function is modified to always return a fallback message,
  // which fixes the crash and effectively disables the non-functional AI feature.
  return Promise.resolve({
    suggestion: "AI analysis unavailable. API Key may be missing.",
    estimatedTime: "N/A",
    tips: [
      "Ensure stable internet connection.",
      "Check available storage on destination.",
      "Avoid syncing very large files during peak hours."
    ]
  });
};

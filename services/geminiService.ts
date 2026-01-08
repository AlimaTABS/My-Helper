import { GoogleGenAI, Type } from "@google/genai";

export interface AnalysisResult {
  feedback: string;
  wordBreakdown: Array<{
    targetWord: string;
    sourceEquivalent: string;
    context: string;
  }>;
}

export const analyzeTranslation = async (
  sourceText: string,
  targetText: string,
  targetLanguage: string,
  userApiKey?: string
): Promise<AnalysisResult | string> => {
  const apiKey =
    userApiKey || (typeof process !== "undefined" ? process.env.API_KEY : undefined);

  if (!apiKey || apiKey.trim() === "") {
    return "API Key Missing: Please click the 'Set API Key' button in the header to configure your Google Gemini API key.";
  }

  if (!sourceText.trim() || !targetText.trim()) {
    return "Please provide both source and target text for analysis.";
  }

  // retry config
  const maxRetries = 3;        // number of retries (not total attempts)
  const baseDelay = 500;       // ms
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      You are an expert linguistic auditor performing a high-precision Translation Quality Audit (TQA).
      
      Target Language: ${targetLanguage}
      Source (English): "${sourceText}"
      Target Translation: "${targetText}"
      
      Tasks:
      1. CRITICAL AUDIT: Identify any of the following issues that contradict the English source text:
         - Missing Content: Skip words, phrases, or punctuation that alter intent.
         - Terminology Errors: Use of incorrect or inappropriate terms for the target language context.
         - Shifts in Meaning: Nuance changes, incorrect tone, or semantic drifting that misrepresents the source.
         - Summarize these findings in concise bullet points. If perfect, confirm accuracy.

      2. GRANULAR BREAKDOWN: Provide a word-by-word mapping of the target text to English equivalents.
         - For each word, explain the grammatical context (e.g., "Noun, plural", "1st person singular verb", "Direct object marker").

      Return results strictly as a JSON object.
    `;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-pro-preview",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                feedback: {
                  type: Type.STRING,
                  description:
                    "The audit summary focusing on missing content, terminology, and meaning shifts.",
                },
                wordBreakdown: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      targetWord: { type: Type.STRING },
                      sourceEquivalent: { type: Type.STRING },
                      context: { type: Type.STRING },
                    },
                    required: ["targetWord", "sourceEquivalent", "context"],
                  },
                },
              },
              required: ["feedback", "wordBreakdown"],
            },
          },
        });

        const result = response.text;
        if (!result) throw new Error("The AI model returned an empty response.");

        return JSON.parse(result) as AnalysisResult;
      } catch (err: any) {
        const errorStr =
          String(err?.message ?? err) +
          " " +
          String(err?.status ?? "") +
          " " +
          String(err?.code ?? "");

        // Check for fatal errors that shouldn't be retried
        if (errorStr.includes("403") || errorStr.includes("API_KEY_INVALID")) {
          return "Invalid API Key. Please click the Key icon in the top right to verify your settings.";
        }

        // (Optional) keep your existing friendly messages too:
        if (errorStr.includes("401")) {
          return "Invalid API Key: The key you provided was rejected by Google. Please check your API key in the settings.";
        }
        if (errorStr.includes("blocked")) {
          return "Safety Warning: The translation or source text was blocked by Google's safety filters.";
        }

        // 429 = Too Many Requests (Quota), 503/500 = Server issues
        const isQuotaError =
          errorStr.includes("429") || errorStr.toLowerCase().includes("quota");
        const isServerError = errorStr.includes("503") || errorStr.includes("500");

        const shouldRetry = (isQuotaError || isServerError) && attempt < maxRetries;

        if (shouldRetry) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.warn(
            `Attempt ${attempt + 1} failed (${isQuotaError ? "Quota" : "Server"}). Retrying in ${delay}ms...`
          );
          await sleep(delay);
          continue;
        }

        // No retry left (or not a retryable error)
        if (isQuotaError) {
          return "Quota Exceeded: You have reached the rate limit for your Gemini API key. Please wait a moment or check your billing status.";
        }

        return `Analysis Failed: ${err?.message || "An unexpected error occurred. Please check your internet connection."}`;
      }
    }

    // Should never hit because loop returns, but just in case:
    return "Analysis Failed: Exceeded maximum retries.";
  } catch (error: any) {
    console.error("Analysis Error Details:", error);
    return `Analysis Failed: ${error?.message || "An unexpected error occurred."}`;
  }
};

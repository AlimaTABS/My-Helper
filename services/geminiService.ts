import { GoogleGenAI, Type } from "@google/genai";

export interface AnalysisResult {
  feedback: string;
  wordBreakdown: Array<{
    targetWord: string;
    sourceEquivalent: string;
    context: string;
  }>;
}

// Helper to wait between retries
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Helper to extract status codes from various error formats
function getStatus(err: any): number | undefined {
  return (
    err?.status ??
    err?.response?.status ??
    err?.cause?.status
  );
}

export const analyzeTranslation = async (
  sourceText: string,
  targetText: string,
  targetLanguage: string,
  userApiKey?: string
): Promise<AnalysisResult | string> => {
  const apiKey = userApiKey || (typeof process !== 'undefined' ? process.env.API_KEY : undefined);

  if (!apiKey || apiKey.trim() === '') {
    return "API Key Missing: Please click the 'Set API Key' button in the header to configure your Google Gemini API key.";
  }

  if (!sourceText.trim() || !targetText.trim()) {
    return "Please provide both source and target text for analysis.";
  }

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

  const maxRetries = 3;
  const baseDelay = 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // Kept your original model name
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              feedback: { 
                type: Type.STRING,
                description: "The audit summary focusing on missing content, terminology, and meaning shifts."
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

    } catch (error: any) {
      const status = getStatus(error);
      const msg = String(error?.message ?? error);
      const errorStr = msg.toLowerCase();

      // Check for Quota/Rate Limit (429)
      const isQuota = status === 429 || errorStr.includes("429") || errorStr.includes("quota");

      // Retry if it's a Quota issue or Server error
      if ((isQuota || status === 500 || status === 503) && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 150);
        console.warn(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // If we reach here and it's still a quota error, return your specific message
      if (isQuota) {
        return "⚠️ API Quota exceeded. The free tier has strict limits (often 15 requests per minute).\n\nPlease wait 60 seconds before trying again, or consider using a paid API key from a billing-enabled project (https://ai.google.dev/gemini-api/docs/billing).";
      }

      // Handle other fatal errors
      if (status === 401 || status === 403 || errorStr.includes("api_key_invalid")) {
        return "Invalid API Key: Please check your settings.";
      }

      return `Analysis Failed: ${msg}`;
    }
  }

  return "Analysis Failed: Exceeded maximum retries.";
};

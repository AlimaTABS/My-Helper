import { GoogleGenAI, Type } from "@google/genai";

export interface AnalysisResult {
  feedback: string;
  wordBreakdown: Array<{
    targetWord: string;
    sourceEquivalent: string;
    context: string;
  }>;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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
  
  // Use a stable model ID to avoid 404 errors
  const MODEL_NAME = "gemini-1.5-pro"; 

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
          - For each word, explain the grammatical context (e.g., "Noun, plural", "1st person singular verb").

      Return results strictly as a JSON object.
    `;

  const maxRetries = 3;
  const baseDelay = 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
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

      // Handle Quota / Rate Limits (429)
      const isQuota = status === 429 || errorStr.includes("429") || errorStr.includes("quota");
      
      if (isQuota && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
        console.warn(`Quota hit. Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      if (isQuota) {
        return "⚠️ API Quota exceeded. The free tier has strict limits (often 15 requests per minute).\n\nPlease wait 60 seconds before trying again, or consider using a paid API key from a billing-enabled project (https://ai.google.dev/gemini-api/docs/billing).";
      }

      // Handle Invalid Keys (401/403)
      if (status === 401 || status === 403 || errorStr.includes("api_key_invalid")) {
        return "Invalid API Key: The key you provided was rejected by Google. Please check your settings.";
      }

      // Handle Model Not Found (404)
      if (status === 404 || errorStr.includes("not found")) {
        return `Error: Model '${MODEL_NAME}' not found. Please try 'gemini-1.5-flash' or check your API version.`;
      }

      return `Analysis Failed: ${msg}`;
    }
  }

  return "Analysis Failed: Maximum retries reached due to rate limiting.";
};

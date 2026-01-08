import { GoogleGenAI, Type } from "@google/genai";

export interface AnalysisResult {
  feedback: string;
  wordBreakdown: Array<{
    targetWord: string;
    sourceEquivalent: string;
    context: string;
  }>;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
        You are an expert linguistic auditor performing a high-precision Translation Quality Audit (TQA).
        
        Target Language: ${targetLanguage}
        Source (English): "${sourceText}"
        Target Translation: "${targetText}"
        
        TASK 1: CRITICAL AUDIT
        Compare the translation to the source. Identify mistranslations, omissions, or tone shifts.
        Provide feedback in clear bullet points.

        TASK 2: WORD-BY-WORD MAPPING
        You MUST provide a granular mapping for every significant word or phrase in the TARGET translation.
        Identify the corresponding English word from the source and its grammatical context.

        EXAMPLE MAPPING FORMAT:
        If Target is "Hola mundo" and Source is "Hello world":
        - targetWord: "Hola", sourceEquivalent: "Hello", context: "Interjection, greeting"
        - targetWord: "mundo", sourceEquivalent: "world", context: "Noun, singular"

        Return results strictly as a JSON object matching the requested schema.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              feedback: { 
                type: Type.STRING,
                description: "The audit summary focusing on quality, accuracy, and suggested corrections."
              },
              wordBreakdown: {
                type: Type.ARRAY,
                description: "A list of every word in the translation mapped to its source equivalent.",
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
      if (!result) throw new Error("Empty response");
      
      return JSON.parse(result) as AnalysisResult;

    } catch (error: any) {
      const isRateLimit = error.message?.includes("429") || error.message?.includes("quota");
      
      if (isRateLimit && attempt < maxRetries - 1) {
        attempt++;
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s...
        console.warn(`Rate limit (429) hit. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
        await sleep(delay);
        continue;
      }

      console.error("Analysis Error Details:", error);
      
      if (error.message?.includes("401")) {
        return "Invalid API Key: Please check your key in the settings.";
      }
      if (isRateLimit) {
        return "The AI is currently busy (Rate Limit). Please wait a few moments and try again.";
      }
      
      return `Analysis Failed: ${error.message || "An unexpected error occurred."}`;
    }
  }

  return "Failed to connect after multiple attempts. Please check your internet or API quota.";
};

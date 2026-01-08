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
    return "API Key Missing: Please click the 'API Key' button in the header to configure your Google Gemini API key.";
  }

  if (!sourceText.trim() || !targetText.trim()) {
    return "Please provide both source and target text for analysis.";
  }

  const maxRetries = 4; 
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
        You MUST provide a granular mapping for every significant word or semantic unit in the TARGET translation.
        Identify the corresponding English word from the source and its grammatical context.
        DO NOT leave the wordBreakdown array empty. Even if the translation is perfect, map every word.

        EXAMPLE MAPPING FORMAT:
        If Target is "Hola mundo" and Source is "Hello world":
        - targetWord: "Hola", sourceEquivalent: "Hello", context: "Interjection, greeting"
        - targetWord: "mundo", sourceEquivalent: "world", context: "Noun, singular"

        Return results strictly as a JSON object matching the requested schema.
      `;

      // Use gemini-3-flash-preview for significantly higher rate limits on free tier
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
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
                description: "A complete mapping of every word in the translation to its source equivalent.",
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

      const resultText = response.text;
      if (!resultText) throw new Error("Empty response from AI service.");
      
      const parsed = JSON.parse(resultText);
      
      if (!parsed.wordBreakdown || parsed.wordBreakdown.length === 0) {
        throw new Error("AI failed to generate word mapping. Please try again.");
      }

      return parsed as AnalysisResult;

    } catch (error: any) {
      const isRateLimit = error.message?.includes("429") || 
                          error.message?.includes("quota") || 
                          error.message?.includes("limit") ||
                          error.status === 429;
      
      if (isRateLimit && attempt < maxRetries - 1) {
        attempt++;
        // Use exponential backoff with jitter: 3s, 7s, 13s...
        const delay = (Math.pow(2, attempt) * 1500) + (Math.random() * 1500) + 1000; 
        console.warn(`Rate limit (429) hit. Attempt ${attempt}/${maxRetries}. Retrying in ${Math.round(delay)}ms...`);
        await sleep(delay);
        continue;
      }

      console.error("Analysis Error:", error);
      
      if (error.message?.includes("401")) {
        return "Invalid API Key: Your key was rejected by Google. Please check your settings.";
      }
      
      if (isRateLimit) {
        return "⚠️ API Quota exceeded. The free tier has strict limits (often 15 requests per minute).\n\nPlease wait 60 seconds before trying again, or consider using a paid API key from a billing-enabled project (https://ai.google.dev/gemini-api/docs/billing).";
      }
      
      return `Analysis Failed: ${error.message || "An unexpected error occurred."}`;
    }
  }

  return "The service is temporarily unavailable due to high demand (Rate Limit). Please wait a few moments before trying again.";
};

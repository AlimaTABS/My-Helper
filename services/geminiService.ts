import { GoogleGenAI, Type } from "@google/genai";

export interface AnalysisResult {
  feedback: string;
  wordBreakdown: Array<{
    targetWord: string;
    sourceEquivalent: string;
    context: string;
  }>;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const analyzeTranslation = async (
  sourceText: string,
  targetText: string,
  targetLanguage: string,
  userApiKey?: string,
  retryCount = 0
): Promise<AnalysisResult | string> => {
  const apiKey = userApiKey || (typeof process !== 'undefined' ? process.env.API_KEY : undefined);

  if (!apiKey || apiKey.trim() === '') {
    return "API Key Missing: Please click the 'API Key' button in the header to set your key.";
  }

  try {
    // ALWAYS create a fresh instance to avoid stale config
    const ai = new GoogleGenAI({ apiKey });

    // Force 'gemini-3-flash-preview' for significantly higher RPM limits
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Audit this translation. 
        ENGLISH SOURCE: "${sourceText}"
        ${targetLanguage} TARGET: "${targetText}"

        TASKS:
        1. Feedback: Summarize accuracy and style errors.
        2. Breakdown: Provide a word-by-word mapping for every word in the target translation.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feedback: { type: Type.STRING },
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

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    return JSON.parse(text) as AnalysisResult;

  } catch (error: any) {
    console.error(`Gemini Error (Attempt ${retryCount + 1}):`, error);

    const errorMessage = error.message || "";

    // 429 Handling with Exponential Backoff
    if (errorMessage.includes("429") && retryCount < 3) {
      const waitTime = Math.pow(2, retryCount) * 2000;
      console.warn(`Quota hit. Retrying in ${waitTime}ms...`);
      await delay(waitTime);
      return analyzeTranslation(sourceText, targetText, targetLanguage, userApiKey, retryCount + 1);
    }

    if (errorMessage.includes("429")) {
      return "QUOTA EXCEEDED (429): You have reached the limit for free requests. Please wait 60 seconds and try again. Using a paid API key or 'Gemini Flash' model helps avoid this.";
    }

    if (errorMessage.includes("401")) {
      return "INVALID API KEY: The key you provided is not working. Please check it in the settings.";
    }

    return `ANALYSIS FAILED: ${errorMessage.substring(0, 150)}...`;
  }
};

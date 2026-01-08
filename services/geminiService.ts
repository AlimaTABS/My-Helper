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
  // Check for key availability
  const apiKey = userApiKey || (typeof process !== 'undefined' ? process.env.API_KEY : undefined);

  if (!apiKey || apiKey.trim() === '') {
    return "API Key Missing: Please click the 'Set API Key' button in the header to configure your Google Gemini API key.";
  }

  if (!sourceText.trim() || !targetText.trim()) {
    return "Please provide both source and target text for analysis.";
  }

  try {
    // Always create a new instance to ensure we use the latest provided key
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
    console.error("Analysis Error Details:", error);
    
    // Provide more specific feedback for common errors
    if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("401")) {
      return "Invalid API Key: The key you provided was rejected by Google. Please check your API key in the settings.";
    }
    if (error.message?.includes("429") || error.message?.includes("quota")) {
      return "Quota Exceeded: You have reached the rate limit for your Gemini API key. Please wait a moment or check your billing status.";
    }
    if (error.message?.includes("blocked")) {
      return "Safety Warning: The translation or source text was blocked by Google's safety filters.";
    }
    
    return `Analysis Failed: ${error.message || "An unexpected error occurred. Please check your internet connection."}`;
  }
};
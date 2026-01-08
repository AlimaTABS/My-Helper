import { GoogleGenAI, Type } from "@google/genai";

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

function cleanJsonText(s: string) {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  }
  return t;
}

export const analyzeTranslation = async (
  sourceText: string,
  targetText: string,
  targetLanguage: string,
  userApiKey?: string
) => {
  const apiKey =
    userApiKey || (typeof process !== "undefined" ? process.env.API_KEY : undefined);

  if (!apiKey || apiKey.trim() === "") {
    return "API Key Missing: Please click the 'Set API Key' button in the header.";
  }

  const ai = new GoogleGenAI({ apiKey });

  // Use a modern, active model ID
  const MODEL_NAME = "gemini-2.0-flash"; 

  const prompt = `Target Language: ${targetLanguage}\nSource: ${sourceText}\nTarget: ${targetText}\nReturn JSON.`;

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
      if (!text) throw new Error("Empty response from model.");

      const cleaned = cleanJsonText(text);
      let parsed: any = JSON.parse(cleaned);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);

      return parsed;

    } catch (err: any) {
      const status = getStatus(err);
      const msg = String(err?.message ?? err);
      const errorStr = msg.toLowerCase();

      // 1. Handle Model Not Found (404)
      if (status === 404 || errorStr.includes("not found")) {
        return `Model Error: '${MODEL_NAME}' was not found. This usually happens when a model is retired. Try changing the model ID to 'gemini-2.5-flash' or 'gemini-3-pro-preview'.`;
      }

      // 2. Handle Quota/429 specifically (Your requested logic)
      const isQuota = status === 429 || errorStr.includes("429") || errorStr.includes("quota");
      
      // 3. Fatal Auth Errors
      if (status === 401 || status === 403 || errorStr.includes("api_key_invalid")) {
        return "Invalid API Key. Please verify your settings.";
      }

      // 4. Retry Logic for Quota or Server errors
      const isServer = status === 500 || status === 503;
      if ((isQuota || isServer) && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
        await sleep(delay);
        continue;
      }

      // 5. Final Quota Message
      if (isQuota) {
        return "⚠️ API Quota exceeded. The free tier has strict limits (often 15 requests per minute).\n\nPlease wait 60 seconds before trying again, or consider using a paid API key from a billing-enabled project ([https://ai.google.dev/gemini-api/docs/billing](https://ai.google.dev/gemini-api/docs/billing)).";
      }

      return `Analysis Failed: ${msg}`;
    }
  }

  return "Analysis Failed: Exceeded maximum retries.";
};

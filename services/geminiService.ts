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
    return "API Key Missing: Please click the 'Set API Key' button in the header to configure your Google Gemini API key.";
  }

  const ai = new GoogleGenAI({ apiKey });

  // Your specific model and high-precision prompt
  const MODEL_NAME = "gemini-3-pro-preview";
  const prompt = `Target Language: ${targetLanguage}\nSource: ${sourceText}\nTarget: ${targetText}\nReturn JSON.`;

  const maxRetries = 3;   
  const baseDelay = 2000; // Started at 2s to better handle the 15rpm limit

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
      if (!text) throw new Error("Empty response.text from model.");

      const cleaned = cleanJsonText(text);
      let parsed: any = JSON.parse(cleaned);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);

      return parsed;

    } catch (err: any) {
      const status = getStatus(err);
      const msg = String(err?.message ?? err);
      const errorStr = msg.toLowerCase();

      // Check specifically for 429 Quota issues
      const isQuota = status === 429 || errorStr.includes("429") || errorStr.includes("quota");
      
      // Check for Auth/Key issues (Don't retry these)
      if (status === 401 || status === 403 || errorStr.includes("api_key_invalid")) {
        return "Invalid API Key. Please verify your settings.";
      }
      
      if (errorStr.includes("blocked") || errorStr.includes("leaked")) {
        return "Your API key is blocked or leaked. Please create a new one in Google AI Studio.";
      }

      // Retry Logic: If it's a quota hit or server error, wait and try again
      if ((isQuota || status === 500 || status === 503) && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 500);
        console.warn(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms due to: ${msg}`);
        await sleep(delay);
        continue;
      }

      // Final failure return for Quota
      if (isQuota) {
        return "⚠️ API Quota exceeded. The free tier has strict limits (often 15 requests per minute).\n\nPlease wait 60 seconds before trying again, or consider using a paid API key from a billing-enabled project ([https://ai.google.dev/gemini-api/docs/billing](https://ai.google.dev/gemini-api/docs/billing)).";
      }

      return `Analysis Failed: ${msg}`;
    }
  }

  return "Analysis Failed: All retry attempts exhausted.";
};

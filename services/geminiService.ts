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

  if (!sourceText.trim() || !targetText.trim()) {
    return "Please provide both source and target text for analysis.";
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Target Language: ${targetLanguage}\nSource: ${sourceText}\nTarget: ${targetText}\nReturn JSON.`;

  const maxRetries = 3;   
  const baseDelay = 1000; 

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

      // Fatal Auth Errors
      if (status === 401 || status === 403 || msg.includes("API_KEY_INVALID")) {
        return "Invalid API Key. Please click the Key icon in the top right to verify your settings.";
      }
      
      if (errorStr.includes("blocked") || errorStr.includes("leaked")) {
        return "Your API key appears blocked (often due to being flagged as leaked). Create a new key in Google AI Studio and replace the old one.";
      }

      // 429 / Quota Error Logic
      const isQuota = status === 429 || errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("resource_exhausted");
      const isServer = status === 500 || status === 503;

      if ((isQuota || isServer) && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 150);
        console.warn(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`, msg);
        await sleep(delay);
        continue;
      }

      if (isQuota) {
        return "⚠️ API Quota exceeded. The free tier has strict limits (often 15 requests per minute).\n\nPlease wait 60 seconds before trying again, or consider using a paid API key from a billing-enabled project ([https://ai.google.dev/gemini-api/docs/billing](https://ai.google.dev/gemini-api/docs/billing)).";
      }

      return `Analysis Failed: ${msg}`;
    }
  }

  return "Analysis Failed: Exceeded maximum retries.";
};

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

  // strip ```json ... ``` fences if they ever appear
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

  const maxRetries = 3;   // 3 retries => up to 4 total attempts
  const baseDelay = 500;  // ms

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          // Prefer responseJsonSchema if your SDK version supports it.
          // responseSchema also exists, but responseJsonSchema is the newer "raw JSON schema" path. :contentReference[oaicite:1]{index=1}
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

      // Handles rare cases where JSON is double-encoded as a string
      let parsed: any = JSON.parse(cleaned);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);

      return parsed;
    } catch (err: any) {
      const status = getStatus(err);
      const msg = String(err?.message ?? err);

      // Fatal (don’t retry)
      if (status === 401 || status === 403 || msg.includes("API_KEY_INVALID")) {
        // 403/401 are typically “wrong key / no permission / restricted key”. :contentReference[oaicite:2]{index=2}
        return "Invalid API Key. Please click the Key icon in the top right to verify your settings.";
      }
      if (msg.toLowerCase().includes("blocked") || msg.toLowerCase().includes("leaked")) {
        return "Your API key appears blocked (often due to being flagged as leaked). Create a new key in Google AI Studio and replace the old one.";
      }

      const isQuota = status === 429 || /quota|resource_exhausted/i.test(msg);
      const isServer = status === 500 || status === 503;

      const shouldRetry = (isQuota || isServer) && attempt < maxRetries;
      if (shouldRetry) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 150); // add jitter
        console.warn(`Attempt ${attempt + 1} failed (status=${status}). Retrying in ${delay}ms...`, msg);
        await sleep(delay);
        continue;
      }

      // Not retryable (or out of retries)
      if (isQuota) {
        return "Quota Exceeded: You hit rate limits for your Gemini API key. Slow down requests or check quota/billing.";
      }

      return `Analysis Failed: ${msg}`;
    }
  }

  return "Analysis Failed: Exceeded maximum retries.";
};

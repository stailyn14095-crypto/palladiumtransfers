import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

interface GeminiResponse {
  text: string;
  mapData: any | null;
}

export const getGeminiResponse = async (prompt: string, useMaps: boolean = false): Promise<GeminiResponse> => {
  if (!ai) {
    console.warn("Gemini API Key is missing. Returning mock response.");
    return {
      text: "I am currently in offline mode because the AI API Key is not configured. Please add VITE_GEMINI_API_KEY to your .env file to enable AI features.",
      mapData: null
    };
  }

  try {
    // Determine model based on useMaps flag
    // gemini-2.5-flash verified as working and available
    const modelId = useMaps ? 'gemini-2.5-flash' : 'gemini-2.5-flash';

    const config: any = {
      systemInstruction: "You are an intelligent assistant for Palladium, a luxury transport operations center. You help dispatchers with flight info, traffic, and driver coordination. Keep answers concise and professional.",
    };

    if (useMaps) {
      config.tools = [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: "MODE_DYNAMIC", dynamicThreshold: 0.7 } } }];
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: config
    });

    // Handle response structure safely
    const text = response.text ||
      response.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I couldn't generate a response.";

    let mapData = null;
    if (useMaps && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      mapData = response.candidates[0].groundingMetadata.groundingChunks;
    }

    return { text, mapData };

  } catch (error: unknown) {
    console.error("Gemini API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { text: `Sorry, I encountered an error: ${errorMessage}`, mapData: null };
  }
};

export const parseBookingDetails = async (text: string): Promise<any> => {
  if (!ai) return null;

  try {
    // Use standard flash model for parsing
    const modelId = "gemini-2.5-flash";

    const prompt = `
      Extract booking details from the following text and return a JSON object.
      Current Date: ${new Date().toISOString().split('T')[0]}
      
      Text: "${text}"
      
      Return ONLY JSON with these fields (use null if not found):
      - passenger (string)
      - phone (string)
      - email (string)
      - pickup_date (YYYY-MM-DD, infer from text like "tomorrow", "next friday")
      - pickup_time (HH:MM)
      - origin (string, strictly map to one of: "ALICANTE AEROPUERTO (ALC)", "Alacant/Alicante", "Alfàs del Pi, l'", "Altea", "Benidorm", "Calp")
      - destination (string, strictly map to one of: "ALICANTE AEROPUERTO (ALC)", "Alacant/Alicante", "Alfàs del Pi, l'", "Altea", "Benidorm", "Calp")
      - pax_count (number, default 1)
      - notes (string)
      
      Example JSON:
      {
        "passenger": "John Doe",
        "pickup_date": "2024-05-20",
        "origin": "Benidorm"
      }
    `;

    // FIX: Use correctly imported SDK method
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt
    });

    const textResponse = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extract JSON from markdown code blocks if present
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(textResponse);
  } catch (error) {
    console.error("Error parsing booking details:", error);
    return null;
  }
};

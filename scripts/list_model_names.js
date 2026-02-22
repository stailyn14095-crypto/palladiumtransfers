import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

// Simple .env parser
const envPath = path.resolve(process.cwd(), '.env');
let apiKey = '';
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    for (const line of envConfig.split('\n')) {
        const [key, value] = line.split('=');
        if (key && key.trim() === 'VITE_GEMINI_API_KEY') {
            apiKey = value ? value.trim() : '';
            break;
        }
    }
}

async function listModelNames() {
    if (!apiKey) {
        console.error("API Key not found");
        return;
    }

    const ai = new GoogleGenAI({ apiKey });
    try {
        const listResp = await ai.models.list();
        const models = listResp.models || listResp;

        // Filter and map to just names
        const names = [];
        if (Array.isArray(models)) {
            models.forEach(m => {
                if (m.name) names.push(m.name);
            });
        }

        console.log("Found " + names.length + " models.");
        console.log(names.join("\n"));

        // Also try to test the 2.5 flash one if present
        const weirdModel = names.find(n => n.includes('gemini-2.5-flash'));
        if (weirdModel) {
            console.log(`\nTesting weird model: ${weirdModel}`);
            try {
                const response = await ai.models.generateContent({
                    model: weirdModel,
                    contents: "Hello",
                });
                const text = response.text
                    ? response.text
                    : (response.candidates?.[0]?.content?.parts?.[0]?.text || "No text");
                console.log("SUCCESS:", text);
            } catch (e) {
                console.error("FAILED:", e.message);
            }
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
}

listModelNames();

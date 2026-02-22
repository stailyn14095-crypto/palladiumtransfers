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

async function listModels() {
    if (!apiKey) {
        console.error("API Key not found in .env");
        return;
    }

    try {
        const ai = new GoogleGenAI({ apiKey });

        // 1. Try to list models
        try {
            console.log("Listing available models...");
            const listResp = await ai.models.list();
            const models = listResp.models || listResp;
            // Just log names to keep it clean
            const names = Array.isArray(models) ? models.map(m => m.name || m.displayName) : models;
            console.log("Available Models:", JSON.stringify(names, null, 2));
        } catch (e) {
            console.error("List Models FAILED:", e.message);
        }

        // 2. Test specific models
        const modelsToTest = [
            'gemini-2.0-flash',
            'gemini-2.5-flash',
            'gemini-flash-latest'
        ];

        for (const model of modelsToTest) {
            console.log(`\nTesting ${model}...`);
            try {
                const response = await ai.models.generateContent({
                    model: model,
                    contents: "Hello",
                });
                const text = response.text
                    ? response.text
                    : (response.candidates?.[0]?.content?.parts?.[0]?.text || "No text");

                console.log(`${model} SUCCESS:`, text.substring(0, 50) + "...");
            } catch (e) {
                console.error(`${model} FAILED:`, e.message);
            }
        }

    } catch (error) {
        console.error("Fatal Error:", error);
    }
}

listModels();

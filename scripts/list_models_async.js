import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

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
        console.error("API Key not found");
        return;
    }

    const ai = new GoogleGenAI({ apiKey });
    try {
        console.log("Listing models...");
        const listResp = await ai.models.list();

        // Check if it's iterable
        if (listResp[Symbol.asyncIterator]) {
            console.log("Response is async iterable.");
            for await (const model of listResp) {
                console.log(model.name);
            }
        } else if (Array.isArray(listResp.models)) {
            console.log("Response has .models array.");
            listResp.models.forEach(m => console.log(m.name));
        } else {
            console.log("Response structure unknown:", Object.keys(listResp));
            // Try strict access if it's a known non-enumerable
            if (listResp.models) {
                console.log("Found hidden .models");
                listResp.models.forEach(m => console.log(m.name));
            }
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
}

listModels();

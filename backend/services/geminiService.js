import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";

console.log("Gemini Service: Initializing Discovery Engine...");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const geminiService = {
  analyzeContent: async (content, promptType = "syllabus") => {
    // List of models to try in order of preference (2026 stable)
    const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"];
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Gemini: Attempting with model: ${modelName}`);
        // Specify version explicitly if possible via model string or use default
        const model = genAI.getGenerativeModel({ model: modelName });
        
        let systemPrompt = "";
        if (promptType === "syllabus") {
          systemPrompt = "Analyze this syllabus. Return ONLY JSON: { \"title\": \"...\", \"topics\": [{ \"name\": \"...\", \"importance\": 1-100, \"description\": \"...\" }] }";
        } else if (promptType === "cheatsheet") {
          systemPrompt = "Generate a high-density AI Cheat Sheet JSON. Include: title, summary, keyConcepts[], importantPoints[], formulas[], highlights[], flowExplanations[], interviewQuestions[], tables[].";
        } else {
          systemPrompt = "You are StudySniper AI. Be concise.";
        }

        const result = await model.generateContent([
          { text: systemPrompt },
          { text: `Content: ${content.substring(0, 15000)}` }
        ]);
        const response = await result.response;
        const text = response.text();

        if (promptType === "chat") return text;

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON extraction failed");
        return JSON.parse(jsonMatch[0]);

      } catch (error) {
        lastError = error;
        console.warn(`Gemini: Model ${modelName} failed. Error: ${error.message}`);
        continue; // Try next model in the list
      }
    }

    // If we get here, all Gemini models failed
    throw new Error(`All Gemini models failed. Last error: ${lastError.message}`);
  }
};

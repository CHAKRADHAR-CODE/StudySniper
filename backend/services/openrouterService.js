import 'dotenv/config';
import OpenAI from "openai";

console.log("OpenRouter Service: Initializing Redundancy Engine...");

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://studysniper.ai",
    "X-Title": "StudySniper AI",
  },
});

export const openrouterService = {
  async chat(messages, model = "google/gemini-2.0-flash-001") {
    try {
      // Normalize model name for OpenRouter
      const targetModel = model || process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";
      console.log(`OpenRouter Service: Routing to ${targetModel}`);
      
      const completion = await openai.chat.completions.create({
        model: targetModel,
        messages: messages,
      });

      const response = completion.choices[0].message.content;
      return response;
    } catch (error) {
      console.error("❌ OpenRouter Service Error:", error.message);
      
      // Secondary fallback to Llama if Gemini is down on OpenRouter
      if (error.message.includes("404") || error.message.includes("not found")) {
        console.log("OpenRouter: Primary model failed. Falling back to Llama 3.3-70B.");
        const fallback = await openai.chat.completions.create({
           model: "meta-llama/llama-3.3-70b-instruct",
           messages: messages,
        });
        return fallback.choices[0].message.content;
      }
      throw error;
    }
  },
};

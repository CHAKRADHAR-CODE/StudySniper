import 'dotenv/config';
import Groq from "groq-sdk";

console.log("Groq Service: Initializing Core & Chat Engines...");

const GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_CHAT_API_KEY,
  process.env.GROQ_API_KEY_3
].filter(Boolean);

let currentKeyIndex = 0;

const getGroqClient = () => {
  const key = GROQ_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
  return new Groq({ apiKey: key });
};

export const groqService = {
  chat: async (messages, modelType = "fast", useChatKey = false) => {
    const client = getGroqClient();
    
    // Modern stable models for 2026 (Removed decommissioned ones)
    const models = modelType === "fast" 
      ? ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
      : ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

    let lastError = null;

    for (const model of models) {
      try {
        console.log(`Groq Service: Attempting with model: ${model}...`);
        const completion = await client.chat.completions.create({
          messages: messages,
          model: model,
          temperature: 0.6,
          max_tokens: 4096,
          top_p: 1,
          stream: false,
        }).catch(err => {
          // Inner catch for the promise specifically
          throw err;
        });

        if (completion && completion.choices && completion.choices[0]) {
          return completion.choices[0].message.content;
        } else {
          throw new Error(`Invalid response format from Groq (${model})`);
        }
      } catch (error) {
        lastError = error;
        console.warn(`❌ Groq Service Error (${model}):`, error.message || error);
        
        // Always try the next model for ANY error in the pool
        continue;
      }
    }

    console.error("All Groq models failed. Propagating error to AI Manager...");
    throw lastError || new Error("All Groq models failed");
  }
};

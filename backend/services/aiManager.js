import { geminiService } from "./geminiService.js";
import { groqService } from "./groqService.js";
import { openrouterService } from "./openrouterService.js";

const CHAT_SYSTEM_PROMPT = `You are StudySniper AI. Guide users concisely. Very short, professional answers.`;

export const aiManager = {
  // SYLLABUS ANALYSIS
  async analyzeSyllabus(content) {
    const truncated = content.substring(0, 8000);
    try {
      const prompt = `Analyze syllabus. Return ONLY JSON: { "title": "string", "topics": [{ "name": "string", "importance": 1-100, "description": "string" }] }. Content: ${truncated.substring(0, 5000)}`;
      const response = await groqService.chat([{ role: "user", content: prompt }], "fast");
      return this.parseJSON(response);
    } catch (e) {
      console.warn(`[AI Manager] Groq failed for syllabus: ${e.message}. Trying Gemini...`);
      try {
        return await geminiService.analyzeContent(truncated, "syllabus");
      } catch (geminiError) {
        console.warn(`[AI Manager] Gemini failed for syllabus: ${geminiError.message}. Trying OpenRouter...`);
        try {
          const prompt = `Analyze syllabus. Return ONLY JSON: { "title": "string", "topics": [{ "name": "string", "importance": 1-100, "description": "string" }] }. Content: ${truncated.substring(0, 5000)}`;
          const response = await openrouterService.chat([{ role: "user", content: prompt }]);
          return this.parseJSON(response);
        } catch (orError) {
          console.error(`[AI Manager] CRITICAL: All services failed for syllabus: ${orError.message}`);
          throw orError;
        }
      }
    }
  },

  // CHATBOT
  async getChatResponse(messages) {
    try {
      const contextualMessages = [{ role: "system", content: CHAT_SYSTEM_PROMPT }, ...messages];
      return await groqService.chat(contextualMessages, "fast", true);
    } catch (error) {
      return await geminiService.analyzeContent(messages[messages.length - 1].content, "chat");
    }
  },

  // DYNAMIC ACADEMIC SCHEDULE
  async generateStudyPlan(studentData) {
    const totalDays = studentData.days || 7;
    const prompt = `Create a ${totalDays}-day academic study plan.
    Return ONLY a JSON object:
    {
      "schedule": [
        { 
          "day": 1, 
          "tasks": [{ "task": "Topic Name", "goal": "Goal", "duration": "2h", "time": "09:00 AM" }]
        }
      ],
      "insights": "Short advice"
    }
    Generate EXACTLY ${totalDays} days. Exam: ${studentData.examName}. Topics: ${JSON.stringify(studentData.topics || [])}`;

    try {
      const response = await groqService.chat([{ role: "user", content: prompt }], "fast");
      return this.parseJSON(response);
    } catch (e) {
      console.warn(`[AI Manager] Groq failed for plan: ${e.message}. Trying Gemini...`);
      try {
        return await geminiService.analyzeContent(prompt, "json");
      } catch (geminiError) {
        console.error(`[AI Manager] All AI services failed for plan. Using local fallback engine.`);
        // LOCAL HEURISTIC FALLBACK (Guarantees reflection in UI)
        const topics = studentData.topics || [];
        const schedule = [];
        for (let i = 1; i <= totalDays; i++) {
          const topic = topics[(i - 1) % (topics.length || 1)] || { name: "General Review" };
          schedule.push({
            day: i,
            tasks: [
              { task: `Mastering: ${topic.name || "Core Concepts"}`, goal: "Deep dive and practice", duration: "3h", time: "09:00 AM" },
              { task: "Quick Revision & Quiz", goal: "Test retention", duration: "1h", time: "02:00 PM" }
            ]
          });
        }
        return {
          schedule,
          insights: "AI generation was limited, but we've built a balanced strategic schedule for you."
        };
      }
    }
  },

  // STRATEGIC PATH (Long-term Strategy)
  async generateStrategy(onboardData) {
    console.log("AI Manager: Generating Strategic Roadmap...");
    const daysLeft = onboardData.daysLeft || 7;
    const granularity = daysLeft < 14 ? "Days" : "Weeks";

    const prompt = `Create a long-term exam strategy roadmap. 
    Return ONLY JSON with this structure:
    {
      "phases": [
        { "name": "Phase Name", "duration": "e.g. ${granularity === 'Days' ? 'Day 1' : 'Week 1'}", "goal": "Strategic goal", "milestones": ["M1", "M2"] }
      ],
      "readinessScore": 0-100
    }
    IMPORTANT: Since there are only ${daysLeft} days left, use "${granularity}" as the duration unit for phases.
    Exam: ${onboardData.examName}. Subjects: ${JSON.stringify(onboardData.subjects)}. Days Left: ${daysLeft}`;

    try {
      const response = await groqService.chat([{ role: "user", content: prompt }], "fast");
      return this.parseJSON(response);
    } catch (e) {
      return await geminiService.analyzeContent(prompt, "json");
    }
  },

  // QUESTION BANK ANALYSIS (New Feature)
  async generateQuestionBankAnalysis(content) {
    console.log("AI Manager: Analyzing Question Bank Patterns...");
    const prompt = `Analyze these exam questions. Extract patterns and categorize.
    Return ONLY JSON:
    {
      "title": "A descriptive title based on the topic (e.g. 'Operating Systems: Most Repeated')",
      "patterns": [
        { "pattern": "Concept name", "trend": "e.g. Asked every year", "significance": "Why it matters" }
      ],
      "repeatedQuestions": [
        { "question": "Question text", "frequency": "e.g. 4 times", "years": ["2022", "2023"] }
      ],
      "mostImportant": [
        { "question": "Question text", "priority": "High/Critical", "reason": "Strategic importance" }
      ],
      "summary": "Deeply analyze the trends, which modules are targeted most, and where the student should focus efforts."
    }
    IMPORTANT: The 'title' field must reflect the actual subject found in the papers.
    Content: ${content.substring(0, 10000)}`;

    try {
      const response = await groqService.chat([{ role: "user", content: prompt }], "fast");
      return this.parseJSON(response);
    } catch (e) {
      return await geminiService.analyzeContent(prompt, "json");
    }
  },

  // CHEAT SHEET
  async generateCheatSheet(topic) {
    const prompt = `Create study cheat sheet JSON for: "${topic}". 
    Fields: title, summary, keyConcepts[], importantPoints[], formulas[], highlights[], flowExplanations[], interviewQuestions: [{question, answer}], tables: [{header, rows}]`;

    try {
      const response = await groqService.chat([{ role: "user", content: prompt }], "fast");
      return this.parseJSON(response);
    } catch (error) {
      console.warn(`[AI Manager] Groq failed for cheatsheet: ${error.message}. Trying Gemini...`);
      try {
        const geminiResult = await geminiService.analyzeContent(topic, "cheatsheet");
        return geminiResult;
      } catch (geminiError) {
        console.warn(`[AI Manager] Gemini failed for cheatsheet: ${geminiError.message}. Trying OpenRouter...`);
        try {
          const response = await openrouterService.chat([{ role: "user", content: prompt }]);
          return this.parseJSON(response);
        } catch (orError) {
          console.error(`[AI Manager] CRITICAL: All services failed for cheatsheet: ${orError.message}`);
          throw orError;
        }
      }
    }
  },

  parseJSON(text) {
    try {
      if (!text) throw new Error("Empty response");
      const cleaned = text.replace(/```json|```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
    } catch (e) {
      throw new Error(`AI format error: ${e.message}`);
    }
  }
};

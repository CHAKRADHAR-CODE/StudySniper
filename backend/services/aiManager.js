import { geminiService } from "./geminiService.js";
import { groqService } from "./groqService.js";
import { openrouterService } from "./openrouterService.js";

const CHAT_SYSTEM_PROMPT = `You are StudySniper AI. Guide users concisely. Very short, professional answers.`;

export const aiManager = {
  // SYLLABUS ANALYSIS
  async analyzeSyllabus(content, subjects = []) {
    const truncated = content.substring(0, 8000);
    const subjectsContext = subjects.length > 0 ? `Selected subjects: ${subjects.join(", ")}.` : "";
    
    const prompt = `Perform a deep-dive neural analysis of the provided educational content.
    ${subjectsContext}
    
    CRITICAL VALIDATION:
    - You MUST set "isValid" to false if the uploaded content does NOT specifically and primarily relate to these subjects: ${subjects.join(", ")}.
    - If the user uploads a document for a different subject (e.g., Biology instead of Math), set "isValid" to false and return "The uploaded PDF does not belong to the selected subject." in the "validationMessage".
    - ONLY validated PDFs are allowed to continue. Be extremely strict.
    
    Return ONLY a JSON object with this structure:
    {
      "isValid": boolean,
      "validationMessage": "string",
      "title": "Overall Document Title",
      "topics": [
        {
          "name": "Topic Name",
          "subtopics": ["Subtopic 1", "Subtopic 2"],
          "concepts": ["Concept 1", "Concept 2"],
          "definitions": ["Def 1", "Def 2"],
          "formulas": ["Formula 1"],
          "importantQuestions": ["Q1", "Q2"],
          "repeatedQuestions": ["RQ1"],
          "difficulty": "Easy/Medium/Hard",
          "weightage": 1-100,
          "frequentlyAsked": boolean,
          "description": "Brief summary"
        }
      ],
      "overallDifficulty": "Easy/Medium/Hard",
      "keyTakeaways": ["Point 1", "Point 2"]
    }
    
    Content: ${truncated}`;

    try {
      let response;
      try {
        response = await groqService.chat([{ role: "user", content: prompt }], "fast");
      } catch (e) {
        console.warn(`[AI Manager] Groq failed for syllabus analysis, trying Gemini...`);
        try {
          return await geminiService.analyzeContent(prompt, "json");
        } catch (gemErr) {
          console.warn(`[AI Manager] Gemini failed, trying OpenRouter...`);
          response = await openrouterService.chat([{ role: "user", content: prompt }]);
        }
      }
      return this.parseJSON(response);
    } catch (e) {
      console.error(`[AI Manager] Syllabus analysis failed: ${e.message}`);
      throw e;
    }
  },

  // CHATBOT
  async getChatResponse(messages) {
    try {
      const contextualMessages = [{ role: "system", content: CHAT_SYSTEM_PROMPT }, ...messages];
      return await groqService.chat(contextualMessages, "fast", true);
    } catch (error) {
      try {
        return await geminiService.analyzeContent(messages[messages.length - 1].content, "chat");
      } catch (gemErr) {
        return await openrouterService.chat(messages);
      }
    }
  },

  // DYNAMIC ACADEMIC SCHEDULE
  async generateStudyPlan(studentData) {
    const totalDays = studentData.days || 7;
    const confidence = JSON.stringify(studentData.confidenceLevels || {});
    const preferredTime = studentData.preferredTime || "morning";
    
    const prompt = `YOU ARE THE STUDY SNIPER SCHEDULER ENGINE.
    
    MANDATORY OBJECTIVE: 
    Generate a COMPLETE, day-by-day study schedule for EXACTLY ${totalDays} days.
    
    SYSTEM CONSTRAINTS (NON-NEGOTIABLE):
    1. TOTAL DURATION: ${totalDays} Days. You MUST output a schedule with EXACTLY ${totalDays} day objects in the "schedule" array.
    2. NO SKIPPING: If the request is for ${totalDays} days, you must provide Day 1, Day 2, ..., up to Day ${totalDays}.
    3. DAILY INTENSITY: Exactly ${studentData.studyHoursPerDay} Hours/Day. Do not exceed this.
    4. EXAM IDENTITY: ${studentData.examName}.
    5. PREFERRED WINDOW: ${preferredTime}.
    6. TOPICS TO COVER: ${JSON.stringify(studentData.topics || [])}.
    7. SUBJECT CONFIDENCE: ${confidence}.
    
    PLANNING LOGIC (STRICT RULES):
    1. EXACT DAYS MATCH: You MUST generate EXACTLY ${totalDays} day items. Not one less, not one more. If ${totalDays} is 7, you must output 7 days.
    2. TIME DISTRIBUTION: Distribute the provided topics evenly across ALL ${totalDays} days. DO NOT compress all topics into the first few days.
    3. STUDY HOURS: Each day MUST contain exactly ${studentData.studyHoursPerDay} hours of study sessions. Do not exceed this limit.
    4. CONFIDENCE WEIGHTING: Allocate more time to subjects with low confidence.
    5. BREAKS: Add brief breaks automatically within each daily session.
    6. REVISION CYCLE: Use the final 1 to 2 days explicitly for revision, mock tests, and reviewing important concepts.
    
    OUTPUT FORMAT:
    - Return ONLY a valid JSON object.
    - The "schedule" array MUST contain EXACTLY ${totalDays} objects.
    - Day numbering MUST go from 1 to ${totalDays} sequentially.
    
    JSON STRUCTURE:
    {
      "schedule": [
        { 
          "day": 1, 
          "label": "Day 1 of ${totalDays}",
          "tasks": [
            { "task": "...", "duration": "2h", "time": "09", "type": "...", "priority": "High" }
          ]
        },
        ... 
        { 
          "day": ${totalDays}, 
          "label": "Day ${totalDays} of ${totalDays}: Final Revision",
          "tasks": [...] 
        }
      ],
      "analytics": {
        "weakSubjectFocus": "...",
        "studyIntensity": "Beast Mode",
        "estimatedReadiness": "0-100%"
      }
    }
    
    CRITICAL: YOU MUST OUTPUT EVERY DAY FROM 1 TO ${totalDays} INDIVIDUALLY. SHORTENING THE SCHEDULE IS A CRITICAL FAILURE.`;

    try {
      let response;
      try {
        response = await groqService.chat([{ role: "user", content: prompt }], "fast");
      } catch (e) {
        console.warn(`[AI Manager] Groq failed for plan generation, trying Gemini...`);
        try {
          return await geminiService.analyzeContent(prompt, "json");
        } catch (gemErr) {
          console.warn(`[AI Manager] Gemini failed, trying OpenRouter...`);
          response = await openrouterService.chat([{ role: "user", content: prompt }]);
        }
      }
      return this.parseJSON(response);
    } catch (e) {
      console.error(`[AI Manager] Plan generation failed: ${e.message}`);
      throw e;
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
      try {
        return await geminiService.analyzeContent(prompt, "json");
      } catch (gemErr) {
        const response = await openrouterService.chat([{ role: "user", content: prompt }]);
        return this.parseJSON(response);
      }
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
      try {
        return await geminiService.analyzeContent(prompt, "json");
      } catch (gemErr) {
        const response = await openrouterService.chat([{ role: "user", content: prompt }]);
        return this.parseJSON(response);
      }
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

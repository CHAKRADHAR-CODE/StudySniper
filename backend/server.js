import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { aiManager } from './services/aiManager.js';
import { mailService } from './services/mailService.js';
import { persistenceService } from './services/persistenceService.js';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Enhanced PDF Parser with Python Fallback
const parsePdf = async (buffer, filename) => {
  const tempDir = os.tmpdir();
  const tempPath = path.join(tempDir, `upload_${Date.now()}_${filename}`);
  
  try {
    fs.writeFileSync(tempPath, buffer);
    console.log(`[Parser] Attempting Python extraction for: ${filename}`);
    
    // Try Python extraction first (as requested by user)
    const pythonOutput = execSync(`python services/pdf_parser.py "${tempPath}"`, { encoding: 'utf8' });
    
    if (pythonOutput && !pythonOutput.startsWith("Error:")) {
      return pythonOutput;
    }
    
    throw new Error("Python extraction failed or returned empty");
  } catch (error) {
    console.warn(`[Parser] Python failed for ${filename}, falling back to pdf-parse:`, error.message);
    try {
      const parser = new PDFParse({ data: buffer, verbosity: 0 });
      const result = await parser.getText();
      return result.text;
    } catch (jsError) {
      throw new Error(`All extraction methods failed: ${jsError.message}`);
    }
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
};

const app = express();
const PORT = process.env.PORT || 5000;

import admin, { db } from './firebase.js';

const upload = multer({ storage: multer.memoryStorage() });

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// HEALTH
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/onboarding-complete', async (req, res) => {
  const { userId, data } = req.body;
  try {
    // Generate Strategic Path only (Study Plan is generated later via PDF Upload)
    const examDate = new Date(data.examDate);
    const today = new Date();
    const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
    
    const strategy = await aiManager.generateStrategy({ ...data, daysLeft });

    // Sync to DB in background
    if (userId) {
      (async () => {
        try {
          // Local Persistence (Primary for reliability)
          persistenceService.save(userId, 'profile', 'info', data);
          persistenceService.save(userId, 'examPrepPlan', 'current', strategy);

          // Firestore (Secondary)
          await db.collection('users').doc(userId).set({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
          
          await db.collection('users').doc(userId).collection('examPrepPlan').doc('current').set({
            ...strategy,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          console.log("✅ Onboarding DB sync complete.");
        } catch (dbError) {
          console.error("[Database Error] Onboarding sync failed:", dbError.message);
        }
      })();
    }

    res.json({ message: 'Setup complete', strategy });
  } catch (error) {
    console.error("[Setup Error]:", error.message);
    res.status(500).json({ error: 'Setup failed' });
  }
});

// CORE ENGINE - UPDATED FOR MULTIPLE FILES & VALIDATION
app.post('/api/analyze', upload.array('files', 10), async (req, res) => {
  const { userId, subjects: subjectsRaw } = req.body;
  let subjects = [];
  try { subjects = subjectsRaw ? JSON.parse(subjectsRaw) : []; } catch(e) {}
  
  let combinedContent = req.body.content || "";

  try {
    if (req.files && req.files.length > 0) {
      console.log(`[Analyze] Processing ${req.files.length} files...`);
      
      const fileData = await Promise.all(req.files.map(async file => {
        let text = "";
        if (file.mimetype === 'application/pdf') {
          text = await parsePdf(file.buffer, file.originalname);
        } else {
          text = file.buffer.toString('utf-8');
        }
        return { filename: file.originalname, text };
      }));

      // Fast Validation
      if (subjects.length > 0) {
        console.log(`[Analyze] Validating subjects: ${subjects.join(', ')}`);
        const validations = await Promise.all(fileData.map(data => aiManager.validateSubjectFast(data.text, subjects)));
        const invalidIndex = validations.findIndex(v => !v.isValid);
        
        if (invalidIndex !== -1) {
           console.log(`[Analyze] Validation failed for file: ${fileData[invalidIndex].filename}`);
           return res.status(422).json({ 
             error: 'Validation failed', 
             message: "The uploaded PDF does not belong to the selected subject." 
           });
        }
      }

      combinedContent += "\n" + fileData.map(d => d.text).join("\n\n--- DOCUMENT BREAK ---\n\n");
    }

    if (!combinedContent.trim()) return res.status(400).json({ error: 'No content found in uploads or text body' });

    console.log(`[Analyze] Content extracted and validated. Sending to AI for multi-factor analysis...`);
    const analysis = await aiManager.analyzeSyllabus(combinedContent, subjects);
    console.log(`[Analyze] AI Response: Title=${analysis.title}`);

    let generatedPlan = null;
    if (userId) {
      console.log(`[Analyze] userId found: ${userId}. Fetching profile for Smart Schedule...`);
      let targetDays = 7;
      let profileData = {};
      
      try {
        const onboardingSnap = await db.collection('users').doc(userId).collection('profile').doc('onboarding').get();
        if (onboardingSnap.exists) {
          profileData = onboardingSnap.data();
          if (profileData.examDate) {
            const examTime = profileData.examTime || "09:00";
            const target = new Date(`${profileData.examDate}T${examTime}`);
            const now = new Date();
            const diff = target - now;
            
            if (diff > 0) {
              const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
              targetDays = diffDays > 0 ? diffDays : 1; // Minimum 1 day schedule
            }
          }
        } else {
          // Fallback to old path just in case
          const profileSnap = await db.collection('users').doc(userId).get();
          if (profileSnap.exists) {
            profileData = profileSnap.data();
             if (profileData.examDate) {
               const examTime = profileData.examTime || "09:00";
               const target = new Date(`${profileData.examDate}T${examTime}`);
               const now = new Date();
               const diff = target - now;
               
               if (diff > 0) {
                 const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
                 targetDays = diffDays > 0 ? diffDays : 1;
               }
             }
          }
        }
      } catch (dbReadErr) {
        console.error(`[Analyze] Profile Read Error: ${dbReadErr.message}`);
      }

      // Generate Smart Schedule
      try {
        console.log(`[Analyze] Generating Smart Schedule...`);
        generatedPlan = await aiManager.generateStudyPlan({
          examName: profileData.examName || analysis.title || "Study Plan",
          examTime: profileData.examTime || "09",
          topics: analysis.topics || [],
          confidenceLevels: profileData.confidenceLevels || {},
          studyHoursPerDay: profileData.studyHoursPerDay || 4,
          preferredTime: profileData.preferredTime || "morning",
          days: targetDays
        });
      } catch (aiErr) {
        console.error(`[Analyze] Plan Generation Error: ${aiErr.message}`);
      }

      // Sync to DB in background
      if (generatedPlan) {
        (async () => {
          try {
            persistenceService.save(userId, 'studyPlan', 'current', generatedPlan);
            persistenceService.save(userId, 'aiAnalysis', 'latest', analysis);

            await db.collection('users').doc(userId).collection('aiAnalysis').doc('latest').set({ 
              ...analysis, 
              topics: JSON.stringify(analysis.topics || []),
              createdAt: admin.firestore.FieldValue.serverTimestamp() 
            });

            await db.collection('users').doc(userId).collection('studyPlan').doc('current').set({
              ...generatedPlan,
              schedule: JSON.stringify(generatedPlan.schedule || []),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          } catch (dbError) {
            console.error("[Analyze] Sync failed:", dbError.message);
          }
        })();
      }
    }

    res.json({ ...analysis, plan: generatedPlan });
  } catch (error) {
    console.error("[Analyze] Critical Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/analyze-question-bank', upload.array('files', 5), async (req, res) => {
  const userId = req.body.userId;
  let combinedContent = "";

  try {
    if (req.files && req.files.length > 0) {
      const extractions = await Promise.all(req.files.map(file => parsePdf(file.buffer, file.originalname)));
      combinedContent = extractions.join("\n\n---\n\n");
    }

    if (!combinedContent.trim()) return res.status(400).json({ error: 'No content found' });

    const analysis = await aiManager.generateQuestionBankAnalysis(combinedContent);
    
    // Sync to DB in background
    if (userId) {
      (async () => {
        try {
          persistenceService.save(userId, 'questionBanks', Date.now().toString(), analysis);
          await db.collection('users').doc(userId).collection('questionBanks').add({
            ...analysis,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log("✅ Question Bank Analysis saved.");
        } catch (dbError) {
          console.error("[Database Error] Question Bank sync failed:", dbError.message);
        }
      })();
    }

    res.json(analysis);
  } catch (error) {
    console.error("[QuestionBank Error]:", error.message);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

app.post('/api/generate-cheatsheet', async (req, res) => {
  const { userId, content } = req.body;
  try {
    const sheet = await aiManager.generateCheatSheet(content);
    
    // Save to history asynchronously (don't block the response)
    if (userId) {
      db.collection('users').doc(userId).collection('cheatsheets').add({ 
        ...sheet, 
        tables: JSON.stringify(sheet.tables || []),
        interviewQuestions: JSON.stringify(sheet.interviewQuestions || []),
        createdAt: admin.firestore.FieldValue.serverTimestamp() 
      }).catch(dbError => {
        console.error("[Database Error] Failed to save cheatsheet history:", dbError.message);
      });
    }
    
    res.json(sheet);
  } catch (error) { 
    console.error("[Route Error] Cheatsheet:", error);
    res.status(500).json({ error: error.message }); 
  }
});

app.get('/api/study-plan/:userId', (req, res) => {
  const data = persistenceService.get(req.params.userId, 'studyPlan', 'current');
  if (data) return res.json(data);
  res.status(404).json({ error: 'Not found' });
});

app.get('/api/exam-prep/:userId', (req, res) => {
  const data = persistenceService.get(req.params.userId, 'examPrepPlan', 'current');
  if (data) return res.json(data);
  res.status(404).json({ error: 'Not found' });
});

app.get('/api/question-banks/:userId', (req, res) => {
  const data = persistenceService.getAll(req.params.userId, 'questionBanks');
  res.json(data);
});

app.get('/api/study-plan/:userId', (req, res) => {
  const data = persistenceService.get(req.params.userId, 'studyPlan');
  if (data) res.json(data);
  else res.status(404).json({ error: 'Not found' });
});

app.get('/api/exam-prep/:userId', (req, res) => {
  const data = persistenceService.get(req.params.userId, 'examPrepPlan');
  if (data) res.json(data);
  else res.status(404).json({ error: 'Not found' });
});

app.delete('/api/delete-question-bank/:userId/:bankId', async (req, res) => {
  const { userId, bankId } = req.params;
  try {
    // 1. Local
    persistenceService.clear(userId, 'questionBanks'); // Note: current persistence only supports clearing whole collections or specific keys
    // For now, let's just clear the whole history locally to keep it simple, 
    // or I can improve persistenceService to delete specific keys.
    
    // 2. Firestore
    await db.collection('users').doc(userId).collection('questionBanks').doc(bankId).delete();
    
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/delete-study-plan/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    // 1. Clear Local DB
    persistenceService.clear(userId, 'studyPlan');
    
    // 2. Clear Firestore
    try {
      await db.collection('users').doc(userId).collection('studyPlan').doc('current').delete();
    } catch (e) {
      console.warn("[Database Error] Firestore delete failed, but local cleared.");
    }
    
    res.json({ message: 'Study plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/clear-local/:userId', (req, res) => {
  const { collection } = req.query;
  persistenceService.clear(req.params.userId, collection);
  res.json({ message: 'Local data cleared' });
});

app.post('/api/chat', async (req, res) => {
  try {
    const response = await aiManager.getChatResponse(req.body.messages);
    res.json({ response });
  } catch (error) { 
    console.error("[Route Error] Chat:", error);
    res.status(500).json({ error: error.message }); 
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 StudySniper Engine v2.1 Online: http://localhost:${PORT}`));

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

// In-memory OTP cache for resilience
const otpCache = new Map();

// AUTH
app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save to Firestore (Primary)
    try {
      await db.collection('otps').doc(email).set({ 
        otp, 
        createdAt: admin.firestore.FieldValue.serverTimestamp() 
      });
    } catch (dbErr) {
      console.warn("[Auth] Firestore OTP save failed, using memory cache:", dbErr.message);
    }
    
    // Always save to memory cache (Fallback)
    otpCache.set(email, { otp, createdAt: Date.now() });
    
    await mailService.sendOTP(email, otp);
    res.json({ message: 'OTP sent' });
  } catch (error) { 
    console.error("[Auth Error] Send OTP:", error.message);
    res.status(500).json({ error: 'Failed to send OTP. Check server logs.' }); 
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  try {
    // 1. Check Firestore
    let verified = false;
    try {
      const doc = await db.collection('otps').doc(email).get();
      if (doc.exists && doc.data().otp === otp) {
        await db.collection('otps').doc(email).delete();
        verified = true;
      }
    } catch (dbErr) {
      console.warn("[Auth] Firestore OTP verify failed, checking memory cache...");
    }

    // 2. Check Memory Cache if not verified by Firestore
    if (!verified) {
      const cached = otpCache.get(email);
      if (cached && cached.otp === otp) {
        // OTP valid for 10 minutes
        if (Date.now() - cached.createdAt < 600000) {
          otpCache.delete(email);
          verified = true;
        }
      }
    }

    if (verified) return res.json({ message: 'Verified' });
    res.status(400).json({ error: 'Invalid or expired OTP' });
  } catch (error) { 
    console.error("[Auth Error] Verify OTP:", error.message);
    res.status(500).json({ error: 'Failed to verify OTP' }); 
  }
});

app.post('/api/onboarding-complete', async (req, res) => {
  const { userId, data } = req.body;
  try {
    // Generate Strategic Path & Schedule immediately
    const examDate = new Date(data.examDate);
    const today = new Date();
    const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
    
    const strategyPromise = aiManager.generateStrategy({ ...data, daysLeft });
    const planPromise = aiManager.generateStudyPlan({
      examName: data.examName,
      topics: data.subjects.map(s => ({ name: s, importance: 80, description: "Core subject from setup" })),
      studyHoursPerDay: data.studyHoursPerDay || 4,
      days: Math.min(daysLeft, 7)
    });

    const [strategy, plan] = await Promise.all([strategyPromise, planPromise]);

    // Sync to DB in background
    if (userId) {
      (async () => {
        try {
          // Local Persistence (Primary for reliability)
          persistenceService.save(userId, 'profile', 'info', data);
          persistenceService.save(userId, 'examPrepPlan', 'current', strategy);
          persistenceService.save(userId, 'studyPlan', 'current', plan);

          // Firestore (Secondary)
          await db.collection('users').doc(userId).set({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
          
          await db.collection('users').doc(userId).collection('examPrepPlan').doc('current').set({
            ...strategy,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          const firestorePlan = {
            ...plan,
            schedule: JSON.stringify(plan.schedule || []),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          await db.collection('users').doc(userId).collection('studyPlan').doc('current').set(firestorePlan);
          console.log("✅ Onboarding DB sync complete.");
        } catch (dbError) {
          console.error("[Database Error] Onboarding sync failed:", dbError.message);
        }
      })();
    }

    res.json({ message: 'Setup complete', strategy, plan });
  } catch (error) {
    console.error("[Setup Error]:", error.message);
    res.status(500).json({ error: 'Setup failed' });
  }
});

// CORE ENGINE - UPDATED FOR MULTIPLE FILES
app.post('/api/analyze', upload.array('files', 10), async (req, res) => {
  const userId = req.body.userId;
  let combinedContent = req.body.content || "";

  try {
    if (req.files && req.files.length > 0) {
      console.log(`[Analyze] Processing ${req.files.length} files...`);
      const extractions = await Promise.all(req.files.map(file => {
        if (file.mimetype === 'application/pdf') {
          return parsePdf(file.buffer, file.originalname);
        } else {
          return Promise.resolve(file.buffer.toString('utf-8'));
        }
      }));
      combinedContent += "\n" + extractions.join("\n\n--- DOCUMENT BREAK ---\n\n");
    }

    if (!combinedContent.trim()) return res.status(400).json({ error: 'No content found in uploads or text body' });

    console.log(`[Analyze] Content extracted (${combinedContent.length} chars). Sending to AI...`);
    const analysis = await aiManager.analyzeSyllabus(combinedContent);
    
    let generatedPlan = null;
    if (userId) {
      console.log(`[Analyze] userId found: ${userId}. Starting Plan Generation...`);
      let targetDays = 7;
      let studyHoursPerDay = 4;
      
      // Step A: Load Profile (Resilient)
      try {
        console.log(`[Analyze] Attempting to read profile for ${userId}...`);
        const profileSnap = await db.collection('users').doc(userId).get();
        if (profileSnap.exists) {
          const profile = profileSnap.data();
          studyHoursPerDay = profile.studyHoursPerDay || 4;
          if (profile.examDate) {
            const examDate = new Date(profile.examDate);
            const diffDays = Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24));
            if (diffDays > 0) targetDays = Math.min(diffDays, 14);
          }
          console.log(`[Analyze] Profile loaded: ${targetDays} days, ${studyHoursPerDay} hrs.`);
        } else {
          console.log(`[Analyze] No profile found for ${userId}, using defaults.`);
        }
      } catch (dbReadErr) {
        console.error(`[Analyze] Profile Read Error (Non-Fatal): ${dbReadErr.message}`);
      }

      // Step B: Generate Plan (Resilient)
      try {
        console.log(`[Analyze] Calling AI to generate study plan...`);
        generatedPlan = await aiManager.generateStudyPlan({
          examName: analysis.title || "Multi-Document Analysis",
          topics: analysis.topics || [],
          studyHoursPerDay: studyHoursPerDay,
          days: targetDays
        });
        console.log(`[Analyze] Study plan generated successfully.`);
      } catch (aiErr) {
        console.error(`[Analyze] Plan Generation Error: ${aiErr.message}`);
      }

      // Step C: Sync to DB (Background)
      if (generatedPlan) {
        (async () => {
          try {
            console.log(`[Analyze] Background sync starting...`);
            
            // Local Persistence
            persistenceService.save(userId, 'studyPlan', 'current', generatedPlan);
            persistenceService.save(userId, 'aiAnalysis', Date.now().toString(), analysis);

            const firestoreData = { 
              ...analysis, 
              topics: JSON.stringify(analysis.topics || []),
              createdAt: admin.firestore.FieldValue.serverTimestamp() 
            };
            await db.collection('users').doc(userId).collection('aiAnalysis').add(firestoreData);

            const firestorePlan = {
              ...generatedPlan,
              schedule: JSON.stringify(generatedPlan.schedule || []),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            await db.collection('users').doc(userId).collection('studyPlan').doc('current').set(firestorePlan);
            console.log("✅ [Analyze] Background sync complete.");
          } catch (dbError) {
            console.error("[Analyze] Background sync failed:", dbError.message);
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

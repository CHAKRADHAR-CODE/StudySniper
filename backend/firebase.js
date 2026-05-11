import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// ─── Firebase Admin Initialization ──────────────────────────────────────────
try {
  if (admin.apps.length === 0) {
    let serviceAccount;

    // 1. Try Environment Variable (Secure Production Method)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      console.log(`[Firebase] Loading credentials from secure Environment Variable`);
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      } catch (e) {
        throw new Error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON env variable");
      }
    } 
    // 2. Fallback to local file (Local Development Method)
    else {
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'serviceAccount.json';
      const fullPath = path.resolve(process.cwd(), serviceAccountPath);
      console.log(`[Firebase] Attempting to load local file: ${fullPath}`);
      
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Service account not found in env vars or local file at ${fullPath}`);
      }
      serviceAccount = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    }

    // Ensure newlines in private_key are handled correctly
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    console.log(`[Firebase] Project ID: ${serviceAccount.project_id}`);
    console.log(`[Firebase] Client Email: ${serviceAccount.client_email}`);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    const dbTest = admin.firestore();
    // Immediate verification check
    dbTest.collection('_system_').doc('health').set({ 
      lastStarted: admin.firestore.FieldValue.serverTimestamp(),
      version: '2.1' 
    }).then(() => {
      console.log(`✅ [Firebase] Connection Verified! Database is ONLINE.`);
    }).catch(err => {
      console.error(`❌ [Firebase] Database Write Test Failed: ${err.message}`);
      if (err.message.includes('16 UNAUTHENTICATED')) {
        console.error("👉 TIP: This error often means your system clock is out of sync or the Service Account Key has been deleted in Google Cloud Console.");
      }
    });

    console.log(`✅ Firebase Initialized successfully.`);
  }
} catch (error) {
  console.error('❌ Firebase Initialization Critical Error:', error.message);
}

export const db = admin.firestore();
export default admin;

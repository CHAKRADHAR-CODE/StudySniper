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
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '/etc/secrets/serviceAccount.json';
      const fullPath = path.resolve(process.cwd(), serviceAccountPath);
      console.log(`[Firebase] Attempting to load local file: ${fullPath}`);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`Service account not found in env vars or local file at ${fullPath}`);
      }
      serviceAccount = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    }

    // Ensure newlines in private_key are handled correctly
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key
        .replace(/\\n/g, '\n')
        .replace(/\n/g, '\n')
        .trim();
    }

    console.log(`[Firebase] Project ID: ${serviceAccount.project_id}`);
    console.log(`[Firebase] Client Email: ${serviceAccount.client_email}`);

    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } catch (initErr) {
      console.warn("Primary Init failed, trying explicit credential mapping...");
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key
        })
      });
    }

    const dbTest = admin.firestore();
    // Immediate verification check
    dbTest.collection('_system_').doc('health').get().then(() => {
      console.log(`✅ [Firebase] Connection Verified! Database is ONLINE.`);
    }).catch(err => {
      console.error(`❌ [Firebase] Database Write Test Failed: ${err.message}`);
      if (err.message.includes('16 UNAUTHENTICATED')) {
        console.error("CRITICAL: Your Service Account Key is being rejected by Google. Please ensure you generated a FRESH key in Firebase Settings.");
      }
    });

    console.log(`✅ Firebase Initialized successfully.`);
  }
} catch (error) {
  console.error('❌ Firebase Initialization Critical Error:', error.message);
}

export const db = admin.firestore();
export default admin;

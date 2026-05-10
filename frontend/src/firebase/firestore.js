// src/firebase/firestore.js
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./config";
import axios from "axios";

// ─── Profile ───────────────────────────────────────────────
export const updateUserProfile = async (uid, data) => {
  const ref = doc(db, "users", uid, "profile", "info");
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
};

// ─── Onboarding ────────────────────────────────────────────
export const saveOnboardingData = async (uid, data) => {
  await setDoc(doc(db, "users", uid, "profile", "onboarding"), {
    ...data,
    savedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "users", uid, "profile", "info"), {
    onboardingComplete: true,
    updatedAt: serverTimestamp(),
  });
};

const clearLocal = async (uid, collection) => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  try {
    await axios.delete(`${API_BASE_URL}/clear-local/${uid}?collection=${collection || ''}`);
    if (collection === 'studyPlan') localStorage.removeItem(`studyPlan_${uid}`);
    if (collection === 'examPrepPlan') localStorage.removeItem(`examPrepPlan_${uid}`);
    if (collection === 'profile') localStorage.removeItem(`onboarding_${uid}`);
  } catch (e) {}
};

export const deleteObjective = async (uid) => {
  await deleteDoc(doc(db, "users", uid, "profile", "onboarding"));
  await deleteDoc(doc(db, "users", uid, "examPrepPlan", "current"));
  await deleteDoc(doc(db, "users", uid, "studyPlan", "current"));
  await deleteDoc(doc(db, "users", uid, "progress", "current"));
  await updateDoc(doc(db, "users", uid, "profile", "info"), {
    onboardingComplete: false,
    updatedAt: serverTimestamp(),
  });
  localStorage.removeItem(`progress_${uid}`);
  await clearLocal(uid); // Wipe everything for this user
};

export const getOnboardingData = async (uid) => {
  const snap = await getDoc(doc(db, "users", uid, "profile", "onboarding"));
  return snap.exists() ? snap.data() : null;
};

// ─── Study Plan ────────────────────────────────────────────
export const saveStudyPlan = async (uid, planData) => {
  await setDoc(doc(db, "users", uid, "studyPlan", "current"), {
    ...planData,
    generatedAt: serverTimestamp(),
  });
};

export const getStudyPlan = async (uid) => {
  try {
    const snap = await getDoc(doc(db, "users", uid, "studyPlan", "current"));
    if (snap.exists()) return snap.data();
    throw new Error("Not in Firestore");
  } catch (err) {
    console.warn("Firestore study plan failed, trying API fallback...");
    const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    try {
      const res = await axios.get(`${API_BASE_URL}/study-plan/${uid}`);
      return res.data;
    } catch (e) {
      return null;
    }
  }
};

export const getExamPrepPlan = async (uid) => {
  try {
    const snap = await getDoc(doc(db, "users", uid, "examPrepPlan", "current"));
    if (snap.exists()) return snap.data();
    throw new Error("Not in Firestore");
  } catch (err) {
    console.warn("Firestore exam prep failed, trying API fallback...");
    const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    try {
      const res = await axios.get(`${API_BASE_URL}/exam-prep/${uid}`);
      return res.data;
    } catch (e) {
      return null;
    }
  }
};
export const deleteStudyPlan = async (uid) => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  try {
    await axios.delete(`${API_BASE_URL}/delete-study-plan/${uid}`);
    localStorage.removeItem(`studyPlan_${uid}`);
    localStorage.removeItem(`progress_${uid}`);
  } catch (err) {
    console.error("Delete Study Plan Error:", err);
    // Fallback
    await deleteDoc(doc(db, "users", uid, "studyPlan", "current"));
    await deleteDoc(doc(db, "users", uid, "progress", "current"));
    await clearLocal(uid, 'studyPlan');
    localStorage.removeItem(`progress_${uid}`);
  }
};

// ─── Progress ──────────────────────────────────────────────
import { arrayUnion, arrayRemove } from "firebase/firestore";

export const toggleTaskCompletion = async (uid, taskId, isCompleted) => {
  const ref = doc(db, "users", uid, "progress", "current");
  await setDoc(ref, {
    completedTasks: isCompleted ? arrayUnion(taskId) : arrayRemove(taskId),
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const updateProgress = async (uid, progressData) => {
  await setDoc(
    doc(db, "users", uid, "progress", "current"),
    { ...progressData, updatedAt: serverTimestamp() },
    { merge: true }
  );
};

export const getProgress = async (uid) => {
  const snap = await getDoc(doc(db, "users", uid, "progress", "current"));
  return snap.exists() ? snap.data() : null;
};

// ─── Uploads / AI Analysis ─────────────────────────────────
export const saveAIAnalysis = async (uid, analysis) => {
  const ref = collection(db, "users", uid, "aiAnalysis");
  return await addDoc(ref, { ...analysis, createdAt: serverTimestamp() });
};

export const getAIAnalyses = async (uid) => {
  const ref = collection(db, "users", uid, "aiAnalysis");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const deleteAIAnalysis = async (uid, analysisId) => {
  await deleteDoc(doc(db, "users", uid, "aiAnalysis", analysisId));
};

// ─── Cheat Sheets ──────────────────────────────────────────
export const saveCheatSheet = async (uid, sheet) => {
  const ref = collection(db, "users", uid, "cheatsheets");
  return await addDoc(ref, { ...sheet, createdAt: serverTimestamp() });
};

export const getCheatSheets = async (uid) => {
  const ref = collection(db, "users", uid, "cheatsheets");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const deleteCheatSheet = async (uid, sheetId) => {
  await deleteDoc(doc(db, "users", uid, "cheatsheets", sheetId));
};

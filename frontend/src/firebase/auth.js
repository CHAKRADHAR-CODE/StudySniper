// src/firebase/auth.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";

// Register new user
export const registerUser = async (email, password, displayName) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Update display name
  await updateProfile(user, { displayName });

  // Create user profile in Firestore
  await setDoc(doc(db, "users", user.uid, "profile", "info"), {
    uid: user.uid,
    email,
    displayName,
    createdAt: serverTimestamp(),
    onboardingComplete: false,
    streak: 0,
    totalStudyHours: 0,
    preparednessScore: 0,
  });

  return user;
};

// Login user
export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

// Logout user
export const logoutUser = async () => {
  await signOut(auth);
};

// Get current user profile from Firestore
export const getUserProfile = async (uid) => {
  const docRef = doc(db, "users", uid, "profile", "info");
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) return docSnap.data();
  return null;
};

// Auth state observer
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

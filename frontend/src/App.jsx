// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Upload from "./pages/Upload";
import StudyPlan from "./pages/StudyPlan";
import CheatSheets from "./pages/CheatSheets";
import ExamPrep from "./pages/ExamPrep";
import QuestionBank from "./pages/QuestionBank";
import ForgotPassword from "./pages/ForgotPassword";

// Components
import LoadingScreen from "./components/common/LoadingScreen";
import ChatAssistant from "./components/ai/ChatAssistant";

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Public route (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
      <Route path="/study-plan" element={<ProtectedRoute><StudyPlan /></ProtectedRoute>} />
      <Route path="/cheatsheets" element={<ProtectedRoute><CheatSheets /></ProtectedRoute>} />
      <Route path="/exam-prep" element={<ProtectedRoute><ExamPrep /></ProtectedRoute>} />
      <Route path="/question-bank" element={<ProtectedRoute><QuestionBank /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="relative">
            <AppRoutes />
            <ChatAssistant />
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                borderRadius: "16px",
                fontSize: "13px",
                fontFamily: "'DM Sans', sans-serif",
                backdropFilter: "blur(12px)",
              },
              success: {
                iconTheme: { primary: "var(--green)", secondary: "var(--bg-card)" },
              },
              error: {
                iconTheme: { primary: "var(--red)", secondary: "var(--bg-card)" },
              },
            }}
          />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

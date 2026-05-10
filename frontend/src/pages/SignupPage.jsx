import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../firebase/auth";
import { authService } from "../services/authService";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield, User, Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import PremiumButton from "../components/common/PremiumButton";
import Logo from "../components/common/Logo";

const SignupPage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Form, 2: OTP
  const [otp, setOtp] = useState("");

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error("Password too short");
    setLoading(true);
    try {
      await authService.sendOTP(form.email, 'register');
      toast.success("Verification code sent to your email!");
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send OTP. Check your email.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error("Enter 6-digit code");
    setLoading(true);
    try {
      await authService.verifyOTP(form.email, otp);
      await registerUser(form.email, form.password, form.name);
      toast.success("Identity verified! Welcome to StudySniper.");
      navigate("/onboarding");
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex transition-colors duration-500">
      {/* Left Side: Hero */}
      <div className="hidden lg:flex flex-1 relative flex-col justify-between p-16 border-r border-[var(--border)] overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
        <div className="orb orb-purple w-[500px] h-[500px] -top-32 -left-32 opacity-10" />
        
        <div className="flex items-center gap-3 relative z-10 cursor-pointer" onClick={() => navigate("/")}>
          <Logo className="w-10 h-10 text-[var(--text-primary)]" />
          <div className="font-display text-2xl tracking-tighter uppercase leading-none">
            <span className="font-black text-[var(--text-primary)]">STUDY</span>
            <span className="font-light text-[var(--text-secondary)]"> SNIPER</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-display font-bold text-7xl tracking-tight leading-[0.95]"
          >
            Start Your <br /> Neural Journey.
          </motion.h1>
          <p className="text-[var(--text-secondary)] text-xl max-w-md font-medium leading-relaxed">
            Join the elite circle of scholars using AI to master their exams. Precision study tools for the modern student.
          </p>
          <div className="flex gap-4">
             <div className="badge">AI Powered</div>
             <div className="badge">Scholar Ready</div>
          </div>
        </div>

        <div className="relative z-10 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          <span className="font-black">STUDY</span>
          <span className="font-light"> SNIPER</span> AI • Intelligence for Scholars
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 relative">
        {/* Theme Toggle Top Right */}
        <button
          onClick={toggleTheme}
          className="absolute top-8 right-8 p-3 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <h2 className="text-4xl font-display font-bold tracking-tight">Create Account</h2>
            <p className="text-[var(--text-secondary)] font-medium">Begin your journey to academic excellence.</p>
          </div>

          <div className="flex p-1.5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] relative overflow-hidden group">
             <motion.div 
               layoutId="activeTab"
               className="absolute inset-y-1.5 right-1.5 w-[calc(50%-6px)] bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-0"
               transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
             />
             <button onClick={() => navigate("/login")} className="flex-1 py-2.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors relative z-10">Login</button>
             <button className="flex-1 py-2.5 text-xs font-bold text-[var(--text-primary)] relative z-10">Register</button>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.form 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSendOTP} 
                className="space-y-5"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                    <User size={12} /> Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    className="input-field"
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                    <Mail size={12} /> Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="scholar@example.com"
                    className="input-field"
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                    <Lock size={12} /> Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      placeholder="Min. 6 characters"
                      className="input-field pr-12"
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <PremiumButton loading={loading} icon={ArrowRight}>
                  Verify Email
                </PremiumButton>
              </motion.form>
            ) : (
              <motion.form 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyAndRegister} 
                className="space-y-6"
              >
                <div className="space-y-4 text-center">
                   <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] mx-auto">
                      <Shield size={28} />
                   </div>
                   <div className="space-y-1">
                      <h3 className="font-bold text-lg text-[var(--text-primary)]">Verify identity</h3>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Code sent to {form.email}</p>
                   </div>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="0 0 0 0 0 0"
                    className="input-field text-center text-2xl font-black tracking-[12px] placeholder:tracking-normal placeholder:text-sm"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                </div>

                <div className="space-y-3">
                  <PremiumButton loading={loading}>
                    Complete Registration
                  </PremiumButton>
                  <button 
                    type="button" 
                    onClick={() => setStep(1)} 
                    className="w-full text-[10px] font-bold text-[var(--text-muted)] hover:text-white uppercase tracking-widest transition-colors"
                  >
                    ← Edit Details
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;

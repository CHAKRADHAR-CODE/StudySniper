import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, ShieldCheck, Moon, Sun, ChevronLeft, CheckCircle2 } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import PremiumButton from "../components/common/PremiumButton";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(0);

  const handleSendResetLink = async (e) => {
    if (e) e.preventDefault();
    if (resendCooldown > 0) return;
    
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSubmitted(true);
      toast.success("Neural restoration link delivered!");
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown((c) => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      const msg = err.response?.data?.error || "Neural link delivery failed.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6 transition-colors duration-500">
      <div className="absolute inset-0 bg-grid opacity-5 pointer-events-none" />
      
      {/* Theme Toggle Top Right */}
      <button
        onClick={toggleTheme}
        className="absolute top-8 right-8 p-3 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-sm space-y-8 relative z-10">
        <div 
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] hover:text-white uppercase tracking-widest cursor-pointer transition-colors mb-8"
        >
          <ChevronLeft size={14} /> Back to Login
        </div>

        <div className="space-y-2">
          <h2 className="text-4xl font-display font-bold tracking-tight">Security Restoration</h2>
          <p className="text-[var(--text-secondary)] font-medium">Verify your email to recover your neural access.</p>
        </div>

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.form 
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onSubmit={handleSendResetLink} 
              className="space-y-5"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                  <Mail size={12} /> Registered Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="scholar@example.com"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <PremiumButton loading={loading} icon={ArrowRight}>
                Send Restoration Link
              </PremiumButton>
            </motion.form>
          ) : (
            <motion.div 
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-[32px] p-8 text-center space-y-6"
            >
               <div className="w-16 h-16 rounded-2xl bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center text-[var(--green)] mx-auto">
                  <CheckCircle2 size={32} />
               </div>
               <div className="space-y-2">
                  <h3 className="text-xl font-bold">Link Delivered</h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                     A secure password restoration link has been sent to <strong>{email}</strong>. Please check your inbox and follow the instructions.
                  </p>
               </div>
               <button 
                onClick={handleSendResetLink}
                disabled={resendCooldown > 0 || loading}
                className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-white transition-colors disabled:opacity-30"
               >
                 {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Didn't receive it? Resend Link"}
               </button>
               <button 
                onClick={() => navigate("/login")}
                className="btn-outline w-full py-3 text-xs font-bold uppercase tracking-widest"
               >
                 Back to Login
               </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ForgotPassword;

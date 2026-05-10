import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../firebase/auth";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import PremiumButton from "../components/common/PremiumButton";
import Logo from "../components/common/Logo";

const LoginPage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginUser(form.email, form.password);
      toast.success("Intelligence Sync Complete.");
      navigate("/dashboard");
    } catch (err) {
      toast.error("Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex transition-colors duration-500">
      {/* Left Side: Hero */}
      <div className="hidden lg:flex flex-1 relative flex-col justify-between p-16 border-r border-[var(--border)] overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
        <div className="orb orb-blue w-[500px] h-[500px] -bottom-32 -right-32 opacity-10" />
        
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
            Neural Sync <br /> Active.
          </motion.h1>
          <p className="text-[var(--text-secondary)] text-xl max-w-md font-medium leading-relaxed">
            Welcome back to your personalized study intelligence engine. Your optimized path is waiting.
          </p>
          <div className="flex gap-4">
             <div className="badge">Neural Core</div>
             <div className="badge">Verified User</div>
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

        <div className="w-full max-w-sm space-y-10">
          <div className="space-y-2">
            <h2 className="text-4xl font-display font-bold tracking-tight">Welcome back</h2>
            <p className="text-[var(--text-secondary)] font-medium">Access your intelligent study dashboard.</p>
          </div>

          <div className="flex p-1.5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] relative overflow-hidden group">
             <motion.div 
               layoutId="activeTab"
               className="absolute inset-y-1.5 left-1.5 w-[calc(50%-6px)] bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-0"
               transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
             />
             <button className="flex-1 py-2.5 text-xs font-bold text-[var(--text-primary)] relative z-10">Login</button>
             <button 
               onClick={() => navigate("/signup")} 
               className="flex-1 py-2.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors relative z-10"
             >
               Register
             </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                  <Lock size={12} /> Password
                </label>
                <button 
                  type="button" 
                  onClick={() => navigate("/forgot-password")}
                  className="text-[10px] text-[var(--accent)] font-bold hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="••••••••"
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
              Login to Sync
            </PremiumButton>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

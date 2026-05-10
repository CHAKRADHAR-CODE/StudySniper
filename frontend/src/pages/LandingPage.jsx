import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowRight, Brain, Target, 
  Zap, CheckCircle2, Shield, Moon, Sun
} from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import Logo from "../components/common/Logo";

const LandingPage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-x-hidden transition-colors duration-500">
      {/* Background Elements */}
      <div className="fixed inset-0 bg-grid opacity-10 pointer-events-none" />
      <div className="orb orb-purple w-[600px] h-[600px] -top-64 -right-32 opacity-20" />
      <div className="orb orb-blue w-[500px] h-[500px] -bottom-32 -left-32 opacity-10" />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-20 px-8 md:px-16 flex items-center justify-between backdrop-blur-md border-b border-[var(--border)]">
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-10 h-10 flex items-center justify-center transition-transform duration-500 group-hover:rotate-90 group-hover:scale-110">
             <Logo className="w-full h-full text-[var(--text-primary)] drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
          </div>
          <div className="font-display text-2xl tracking-tighter uppercase leading-none transition-colors duration-300">
            <span className="font-black text-[var(--text-primary)]">STUDY</span>
            <span className="font-light text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors"> SNIPER</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-10">
          {["Analyze", "Plan", "Cheat Sheets", "AI Chat"].map(item => (
            <button key={item} className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              {item}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={() => navigate("/login")} className="btn-primary py-2 px-6">Sign In</button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-48 pb-32 px-8 md:px-16">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10 relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="badge"
            >
              Neural Study Intelligence
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display font-bold text-6xl md:text-8xl tracking-tight leading-[0.95]"
            >
              Master Exams <br /> 
              <span className="text-[var(--text-secondary)]">with Neural</span> <br />
              Precision.
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-[var(--text-secondary)] text-xl max-w-lg font-medium leading-relaxed"
            >
              Transform your syllabus into an optimized study path. Adaptive 
              planning, instant cheat sheets, and 24/7 AI assistance — 
              all in one premium interface.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-6"
            >
              <button onClick={() => navigate("/signup")} className="btn-primary px-10 py-4 text-base w-full sm:w-auto shadow-2xl">
                Get Started Free <ArrowRight size={20} />
              </button>
            </motion.div>
          </div>

          {/* Featured Card (Right Side) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="hidden lg:block relative z-10"
          >
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[40px] p-12 aspect-[4/5] flex flex-col shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8">
                  <div className="text-[10px] font-bold text-[var(--green)] uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" /> Neural Active
                  </div>
               </div>
               <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center mb-12">
                  <Brain size={28} className="text-[var(--text-secondary)]" />
               </div>
               <div className="space-y-4 mb-auto">
                  <h3 className="font-display font-bold text-4xl">Intelligent Plan</h3>
                  <p className="text-[var(--text-secondary)] text-lg">AI-architected schedule optimized for your specific learning pace and exam dates.</p>
               </div>
               <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center gap-4 mb-8">
                  <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold">Neural Sync Passed</p>
                    <p className="text-[var(--text-muted)] mt-0.5">Optimizing retention spikes...</p>
                  </div>
               </div>
               <div className="flex items-center justify-between border-t border-[var(--border)] pt-8">
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Study Engine v2.0</div>
                  <div className="w-24 h-1 bg-[var(--border)] rounded-full" />
               </div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Trust Section */}
      <section className="py-32 px-8 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="max-w-7xl mx-auto text-center space-y-16">
          <h2 className="font-display font-bold text-5xl md:text-7xl tracking-tight">Built for Excellence.</h2>
          <p className="text-[var(--text-secondary)] text-xl max-w-2xl mx-auto">Your academic success is engineered through data-driven insights and adaptive learning patterns.</p>
          
          <div className="grid md:grid-cols-3 gap-12 text-left">
            {[
              { icon: Zap, title: "Neural Analyze", desc: "Instantly convert dense syllabi into structured, actionable topics." },
              { icon: Target, title: "Adaptive Planning", desc: "A schedule that evolves as you learn, focusing on your weak spots." },
              { icon: Shield, title: "Smart Recalls", desc: "Generate concise cheat sheets and summaries with one click." }
            ].map((f, i) => (
              <div key={i} className="space-y-6 group">
                <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center group-hover:border-[var(--accent)] transition-colors">
                  <f.icon size={24} className="text-[var(--accent)]" />
                </div>
                <h4 className="font-display font-bold text-2xl">{f.title}</h4>
                <p className="text-[var(--text-secondary)] font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 border-t border-[var(--border)] flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          <span className="font-black">STUDY</span>
          <span className="font-light"> SNIPER</span> AI • Intelligence for Scholars
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[var(--green)]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">All Systems Operational</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

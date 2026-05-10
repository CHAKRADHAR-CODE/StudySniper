// src/pages/Onboarding.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveOnboardingData, getOnboardingData } from "../firebase/firestore";
import axios from "axios";
import toast from "react-hot-toast";
import AppLayout from "../components/layout/AppLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ChevronLeft, Plus, X, Calendar, BookOpen,
  Clock, Target, CheckCircle, Sparkles, TrendingUp, Brain, ShieldCheck
} from "lucide-react";

// ── Step indicators ───────────────────────────────────────────────────────────
const StepDot = ({ active, done, label, idx }) => (
  <div className="flex flex-col items-center gap-2">
    <div
      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold font-display transition-all duration-500 ${
        done ? "bg-[var(--green)] text-black" :
        active ? "bg-[var(--purple)] text-white shadow-[0_0_20px_rgba(175,82,222,0.3)]" :
        "bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)]"
      }`}
    >
      {done ? <CheckCircle size={18} /> : idx + 1}
    </div>
    <span className={`text-[10px] font-bold uppercase tracking-widest hidden sm:block ${active ? "text-[var(--purple)]" : "text-[var(--text-muted)]"}`}>{label}</span>
  </div>
);

const SubjectTag = ({ name, onRemove }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    className="flex items-center gap-2 px-4 py-2 bg-[var(--purple)]/10 border border-[var(--purple)]/20 rounded-xl"
  >
    <span className="text-sm font-bold text-[var(--purple)]">{name}</span>
    <button onClick={() => onRemove(name)} className="hover:text-red-400 transition-colors"><X size={14} /></button>
  </motion.div>
);

const ConfidenceSlider = ({ subject, value, onChange }) => (
  <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 hover:border-[var(--purple)]/30 transition-all">
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm font-bold text-[var(--text-primary)]">{subject}</span>
      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
        value >= 70 ? "bg-[var(--green)]/10 text-[var(--green)]" : 
        value >= 40 ? "bg-[var(--amber)]/10 text-[var(--amber)]" : 
        "bg-[var(--red)]/10 text-[var(--red)]"
      }`}>
        {value >= 70 ? "Expert" : value >= 40 ? "Improving" : "Needs Work"} — {value}%
      </span>
    </div>
    <div className="relative group">
      <input
        type="range"
        min="0" max="100" value={value}
        onChange={(e) => onChange(subject, Number(e.target.value))}
        className="w-full h-2 bg-[var(--bg-surface)] rounded-full appearance-none cursor-pointer accent-[var(--purple)]"
      />
    </div>
  </div>
);

// ── Main ─────────────────────────────────────────────────────────────────────
const Onboarding = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState({
    examName: "",
    examDate: "",
    examTime: "09:00",
    subjects: [],
    confidenceLevels: {},
    studyHoursPerDay: 4,
    preferredTime: "morning",
  });

  const [subjectInput, setSubjectInput] = useState("");

  const daysLeft = useMemo(() => {
    if (!data.examDate) return 0;
    const diff = new Date(data.examDate) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [data.examDate]);

  const studyIntensity = useMemo(() => {
    if (daysLeft === 0) return "N/A";
    if (daysLeft < 7) return "Critical";
    if (daysLeft < 30) return "High";
    if (daysLeft < 90) return "Moderate";
    return "Balanced";
  }, [daysLeft]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const saved = await getOnboardingData(user.uid);
        if (saved) {
          setData(prev => ({ ...prev, ...saved }));
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [user]);

  const addSubject = () => {
    const s = subjectInput.trim();
    if (!s) return;
    if (data.subjects.includes(s)) return toast.error("Subject already added");
    setData((prev) => ({
      ...prev,
      subjects: [...prev.subjects, s],
      confidenceLevels: { ...prev.confidenceLevels, [s]: 50 },
    }));
    setSubjectInput("");
  };

  const removeSubject = (name) => {
    setData((prev) => {
      const cl = { ...prev.confidenceLevels };
      delete cl[name];
      return { ...prev, subjects: prev.subjects.filter((s) => s !== name), confidenceLevels: cl };
    });
  };

  const setConfidence = (subject, value) => {
    setData((prev) => ({ ...prev, confidenceLevels: { ...prev.confidenceLevels, [subject]: value } }));
  };

  const handleSave = async () => {
    if (!data.examName) return toast.error("Enter your exam name");
    if (!data.examDate) return toast.error("Select your exam date");
    if (data.subjects.length === 0) return toast.error("Add at least one subject");
    
    setSaving(true);
    try {
      await saveOnboardingData(user.uid, data);
      await refreshProfile();
      toast.success("Profile Setup Complete!");
      navigate("/upload"); // Move to Analyze PDF section
    } catch (err) {
      console.error(err);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const steps = ["Exam Hub", "Subject Core", "Neural Confidence", "Study Window"];
  const canNext = () => {
    if (step === 0) return data.examName && data.examDate;
    if (step === 1) return data.subjects.length > 0;
    return true;
  };

  const minDate = new Date().toISOString().split("T")[0];

  if (loading) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center py-48 space-y-4">
         <div className="w-12 h-12 border-2 border-[var(--purple)] border-t-transparent rounded-full animate-spin" />
         <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Calibrating Setup Module...</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Header */}
        <header className="text-center space-y-4">
          <div className="badge border-[var(--purple)]/30 text-[var(--purple)] inline-block mx-auto">Neural Initialization</div>
          <h1 className="text-5xl font-display font-bold tracking-tight">Configure your <span className="text-[var(--text-secondary)]">Arsenal.</span></h1>
          <p className="text-[var(--text-secondary)] text-lg font-medium">Step {step + 1} of 4: {steps[step]}</p>
        </header>

        {/* Step indicators */}
        <div className="flex items-center justify-between relative max-w-xl mx-auto">
          <div className="absolute top-5 left-0 right-0 h-[1px] bg-[var(--border)] -z-10" />
          {steps.map((label, i) => (
            <StepDot key={label} idx={i} label={label} active={i === step} done={i < step} />
          ))}
        </div>

        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {/* Step 0 — Exam Info */}
            {step === 0 && (
              <motion.div 
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Exam / Course Identity</label>
                      <input
                        type="text"
                        value={data.examName}
                        onChange={(e) => setData({ ...data, examName: e.target.value })}
                        placeholder="e.g. Advanced AI Architecture"
                        className="input-field"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Target Date</label>
                        <input
                          type="date"
                          value={data.examDate}
                          min={minDate}
                          onChange={(e) => setData({ ...data, examDate: e.target.value })}
                          className="input-field"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Time</label>
                        <input
                          type="time"
                          value={data.examTime}
                          onChange={(e) => setData({ ...data, examTime: e.target.value })}
                          className="input-field"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[32px] p-8 flex flex-col justify-center items-center text-center space-y-4">
                    {data.examDate ? (
                      <>
                        <div className="w-16 h-16 rounded-2xl bg-[var(--purple)]/10 flex items-center justify-center text-[var(--purple)]">
                          <Clock size={32} />
                        </div>
                        <div>
                          <p className="text-4xl font-display font-bold">{daysLeft}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Days Remaining</p>
                        </div>
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                          studyIntensity === 'Critical' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                          studyIntensity === 'High' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' :
                          'border-green-500/30 text-green-400 bg-green-500/10'
                        }`}>
                          Intensity: {studyIntensity}
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-[var(--text-muted)]">
                          <Target size={32} />
                        </div>
                        <p className="text-sm text-[var(--text-muted)] font-medium">Select a date to calculate preparation intensity.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 1 — Subjects */}
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={subjectInput}
                      onChange={(e) => setSubjectInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSubject()}
                      placeholder="Add a subject (e.g. Quantum Computing)"
                      className="input-field"
                    />
                    <button onClick={addSubject} className="w-14 h-14 rounded-2xl bg-[var(--purple)] text-white flex items-center justify-center hover:scale-105 transition-all">
                      <Plus size={24} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3 p-8 border border-[var(--border)] rounded-[32px] bg-white/5 min-h-[120px]">
                    {data.subjects.length === 0 ? (
                      <div className="w-full flex flex-col items-center justify-center text-[var(--text-muted)] space-y-2 opacity-50">
                        <BookOpen size={24} />
                        <p className="text-xs font-bold uppercase tracking-widest">No subjects active</p>
                      </div>
                    ) : (
                      data.subjects.map((s) => <SubjectTag key={s} name={s} onRemove={removeSubject} />)
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Neural Suggestions</p>
                   <div className="flex flex-wrap gap-2">
                    {["Mathematics", "Physics", "Computer Science", "Algorithms", "OS", "DBMS", "Networks", "Architecture"].map((s) => (
                      !data.subjects.includes(s) && (
                        <button
                          key={s}
                          onClick={() => { setData((prev) => ({ ...prev, subjects: [...prev.subjects, s], confidenceLevels: { ...prev.confidenceLevels, [s]: 50 } })); }}
                          className="px-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-medium hover:border-[var(--purple)]/30 hover:text-[var(--purple)] transition-all"
                        >
                          + {s}
                        </button>
                      )
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2 — Confidence */}
            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {data.subjects.map((s) => (
                  <ConfidenceSlider
                    key={s}
                    subject={s}
                    value={data.confidenceLevels[s] ?? 50}
                    onChange={setConfidence}
                  />
                ))}
              </motion.div>
            )}

            {/* Step 3 — Study Hours */}
            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-12"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[32px] p-8 space-y-6">
                      <div className="flex items-center justify-between">
                         <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            <Clock size={24} />
                         </div>
                         <div className="text-right">
                            <p className="text-3xl font-display font-bold text-amber-500">{data.studyHoursPerDay}h</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Daily Quota</p>
                         </div>
                      </div>
                      <input
                        type="range" min="1" max="12" value={data.studyHoursPerDay}
                        onChange={(e) => setData({ ...data, studyHoursPerDay: Number(e.target.value) })}
                        className="w-full h-2 bg-[var(--bg-surface)] rounded-full appearance-none cursor-pointer accent-amber-500"
                      />
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                        <span>Light (1h)</span><span>Grind (6h)</span><span>Beast (12h)</span>
                      </div>
                   </div>

                   <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[32px] p-8 space-y-6">
                      <div className="w-12 h-12 rounded-xl bg-[var(--purple)]/10 text-[var(--purple)] flex items-center justify-center">
                        <Sparkles size={24} />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Preferred study window</p>
                      <div className="grid grid-cols-1 gap-3">
                        {[["morning", "🌅 Neural Peak (Morning)"], ["afternoon", "☀️ Active Flow (Afternoon)"], ["evening", "🌙 Deep Focus (Evening)"]].map(([val, label]) => (
                          <button
                            key={val}
                            onClick={() => setData({ ...data, preferredTime: val })}
                            className={`px-6 py-4 rounded-2xl text-sm font-bold transition-all text-left flex items-center justify-between ${
                              data.preferredTime === val
                                ? "bg-[var(--purple)] text-white border border-[var(--purple)]"
                                : "bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--purple)]/30 hover:text-[var(--text-secondary)]"
                            }`}
                          >
                            {label}
                            {data.preferredTime === val && <CheckCircle size={16} />}
                          </button>
                        ))}
                      </div>
                   </div>
                </div>

                <div className="p-6 bg-[var(--purple)]/5 border border-[var(--purple)]/20 rounded-[32px] flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--purple)]/20 flex items-center justify-center text-[var(--purple)] shrink-0">
                    <Brain size={32} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold">Intelligent Engine Synchronized</h4>
                    <p className="text-xs text-[var(--text-secondary)]">Your schedule will prioritize {data.subjects.filter(s => (data.confidenceLevels[s] || 50) < 40).length || "your weak"} subjects during your {data.preferredTime} peak hours.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <footer className="flex items-center justify-between pt-8 border-t border-[var(--border)]">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className={`btn-outline border-none hover:bg-white/5 py-3 px-8 flex items-center gap-2 ${step === 0 ? "opacity-30 pointer-events-none" : ""}`}
          >
            <ChevronLeft size={18} /> Previous
          </button>

          {step < steps.length - 1 ? (
            <button
              onClick={() => canNext() && setStep((s) => s + 1)}
              disabled={!canNext()}
              className={`btn-primary py-4 px-10 shadow-2xl ${!canNext() ? "opacity-50 pointer-events-none" : ""}`}
            >
              Continue <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary py-4 px-10 shadow-2xl bg-[var(--purple)] text-white"
            >
              {saving ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Architecting...</> : <><ShieldCheck size={18} /> Complete Setup</>}
            </button>
          )}
        </footer>
      </div>
    </AppLayout>
  );
};

export default Onboarding;

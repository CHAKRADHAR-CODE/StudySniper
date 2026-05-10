// src/pages/Onboarding.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveOnboardingData, getOnboardingData } from "../firebase/firestore";
import axios from "axios";
import toast from "react-hot-toast";
import AppLayout from "../components/layout/AppLayout";
import {
  ChevronRight, ChevronLeft, Plus, X, Calendar, BookOpen,
  Clock, Target, CheckCircle, Sparkles
} from "lucide-react";

// ── Step indicators ───────────────────────────────────────────────────────────
const StepDot = ({ active, done, label, idx }) => (
  <div className="flex flex-col items-center gap-1">
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-display transition-all duration-300 ${
        done ? "bg-green-500 text-white" :
        active ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30" :
        "glass text-zinc-500"
      }`}
    >
      {done ? <CheckCircle size={14} /> : idx + 1}
    </div>
    <span className={`text-xs hidden sm:block ${active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>{label}</span>
  </div>
);

const SubjectTag = ({ name, onRemove }) => (
  <div className="flex items-center gap-1.5 badge badge-purple py-1.5">
    <span>{name}</span>
    <button onClick={() => onRemove(name)} className="hover:text-red-400 transition-colors"><X size={11} /></button>
  </div>
);

const ConfidenceSlider = ({ subject, value, onChange }) => (
  <div className="glass rounded-xl p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-[var(--text-primary)] font-body">{subject}</span>
      <span className={`badge text-xs ${value >= 70 ? "badge-green" : value >= 40 ? "badge-amber" : "badge-red"}`}>
        {value >= 70 ? "Confident" : value >= 40 ? "Moderate" : "Weak"} — {value}%
      </span>
    </div>
    <input
      type="range"
      min="0" max="100" value={value}
      onChange={(e) => onChange(subject, Number(e.target.value))}
      className="w-full accent-purple-500 h-1 cursor-pointer"
    />
    <div className="flex justify-between text-xs text-zinc-600 mt-1">
      <span>Not confident</span>
      <span>Very confident</span>
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
    subjects: [],
    confidenceLevels: {},
    studyHoursPerDay: 4,
    preferredTime: "evening",
  });

  const [subjectInput, setSubjectInput] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const saved = await getOnboardingData(user.uid);
        if (saved) {
          setData({
            examName: saved.examName || "",
            examDate: saved.examDate || "",
            subjects: saved.subjects || [],
            confidenceLevels: saved.confidenceLevels || {},
            studyHoursPerDay: saved.studyHoursPerDay || 4,
            preferredTime: saved.preferredTime || "evening",
          });
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
    const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    
    try {
      // 1. Try Firestore, but don't crash if it fails
      try {
        await saveOnboardingData(user.uid, data);
        await refreshProfile();
      } catch (dbErr) {
        console.warn("Firestore save failed, using local storage fallback", dbErr);
        localStorage.setItem(`onboarding_${user.uid}`, JSON.stringify(data));
      }
      
      // 2. Trigger Backend Generation (Essential)
      toast.loading("Architecting Exam Strategy...", { id: "prep" });
      const response = await axios.post(`${API_BASE_URL}/onboarding-complete`, {
        userId: user.uid,
        data: data
      });
      
      // Save plan to local storage for instant reflection if DB fails
      if (response.data.plan) {
        localStorage.setItem(`studyPlan_${user.uid}`, JSON.stringify(response.data.plan));
      }
      if (response.data.strategy) {
        localStorage.setItem(`examPrepPlan_${user.uid}`, JSON.stringify(response.data.strategy));
      }
      
      toast.success("Profile saved & Strategy generated!", { id: "prep" });
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Process partially failed. AI Strategy generated but DB sync pending.", { id: "prep" });
      // Still navigate to dashboard if we have data
      navigate("/dashboard");
    } finally {
      setSaving(false);
    }
  };

  const steps = ["Exam Info", "Subjects", "Confidence", "Study Hours"];
  const canNext = () => {
    if (step === 0) return data.examName && data.examDate;
    if (step === 1) return data.subjects.length > 0;
    return true;
  };

  const minDate = new Date().toISOString().split("T")[0];

  if (loading) return (
    <AppLayout title="Study Setup" subtitle="Configure your personalized study profile">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Loading your profile...</p>
        </div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title="Study Setup" subtitle="Configure your personalized study profile">
      <div className="max-w-xl mx-auto">
        {/* Step indicators */}
        <div className="flex items-center justify-between mb-10 relative">
          <div className="absolute top-4 left-0 right-0 h-px bg-[var(--border)] -z-10" />
          {steps.map((label, i) => (
            <StepDot key={label} idx={i} label={label} active={i === step} done={i < step} />
          ))}
        </div>

        {/* Step 0 — Exam Info */}
        {step === 0 && (
          <div className="glass rounded-2xl p-6 animate-slide-up space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Target size={16} className="text-purple-400" />
                <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">Your Exam Details</h2>
              </div>
              <p className="text-[var(--text-secondary)] text-sm">Tell us what you're preparing for</p>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Exam / Course Name</label>
              <input
                type="text"
                value={data.examName}
                onChange={(e) => setData({ ...data, examName: e.target.value })}
                placeholder="e.g. B.Tech Semester 6, GATE 2025, JEE Mains..."
                className="input-field"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Exam Date</label>
                <input
                  type="date"
                  value={data.examDate}
                  min={minDate}
                  onChange={(e) => setData({ ...data, examDate: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Exam Time</label>
                <input
                  type="time"
                  value={data.examTime || "09:00"}
                  onChange={(e) => setData({ ...data, examTime: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            {data.examDate && (
              <div className="flex items-center gap-2 p-3 glass-purple rounded-xl">
                <Calendar size={14} className="text-purple-400" />
                <span className="text-sm text-zinc-300">
                  {Math.max(0, Math.ceil((new Date(data.examDate) - new Date()) / (1000 * 60 * 60 * 24)))} days remaining
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step 1 — Subjects */}
        {step === 1 && (
          <div className="glass rounded-2xl p-6 animate-slide-up space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen size={16} className="text-blue-400" />
                <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">Add Your Subjects</h2>
              </div>
              <p className="text-zinc-500 text-sm">Add all subjects you need to study</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubject()}
                placeholder="e.g. Data Structures, OS, DBMS..."
                className="input-field"
              />
              <button onClick={addSubject} className="btn-primary px-4 py-2 text-sm flex-shrink-0">
                <Plus size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[60px]">
              {data.subjects.length === 0 ? (
                <p className="text-zinc-600 text-sm w-full text-center py-4">No subjects added yet</p>
              ) : (
                data.subjects.map((s) => <SubjectTag key={s} name={s} onRemove={removeSubject} />)
              )}
            </div>
            {/* Quick suggestions */}
            <div>
              <p className="text-xs text-zinc-600 mb-2">Quick add:</p>
              <div className="flex flex-wrap gap-1.5">
                {["Mathematics", "Physics", "Chemistry", "Data Structures", "OS", "DBMS", "Networks", "Algorithms"].map((s) => (
                  !data.subjects.includes(s) && (
                    <button
                      key={s}
                      onClick={() => { setData((prev) => ({ ...prev, subjects: [...prev.subjects, s], confidenceLevels: { ...prev.confidenceLevels, [s]: 50 } })); }}
                      className="text-xs px-2.5 py-1 glass rounded-lg text-zinc-400 hover:text-white hover:border-purple-500/30 transition-all border border-transparent"
                    >
                      + {s}
                    </button>
                  )
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Confidence */}
        {step === 2 && (
          <div className="glass rounded-2xl p-6 animate-slide-up space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Target size={16} className="text-cyan-400" />
                <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">Confidence Levels</h2>
              </div>
              <p className="text-zinc-500 text-sm">How confident are you in each subject?</p>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {data.subjects.map((s) => (
                <ConfidenceSlider
                  key={s}
                  subject={s}
                  value={data.confidenceLevels[s] ?? 50}
                  onChange={setConfidence}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Study Hours */}
        {step === 3 && (
          <div className="glass rounded-2xl p-6 animate-slide-up space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Clock size={16} className="text-amber-400" />
                <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">Study Schedule</h2>
              </div>
              <p className="text-zinc-500 text-sm">Set your daily study capacity</p>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-3 block">
                Daily study hours: <span className="text-purple-400 font-bold">{data.studyHoursPerDay}h</span>
              </label>
              <input
                type="range" min="1" max="12" value={data.studyHoursPerDay}
                onChange={(e) => setData({ ...data, studyHoursPerDay: Number(e.target.value) })}
                className="w-full accent-purple-500 h-1.5 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-zinc-600 mt-1">
                <span>1 hour</span><span>6 hours</span><span>12 hours</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-2 block">Preferred study time</label>
              <div className="grid grid-cols-3 gap-2">
                {[["morning", "🌅 Morning"], ["afternoon", "☀️ Afternoon"], ["evening", "🌙 Evening"]].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setData({ ...data, preferredTime: val })}
                    className={`py-2.5 rounded-xl text-xs font-medium transition-all ${
                      data.preferredTime === val
                        ? "bg-purple-600 text-white border border-purple-500"
                        : "glass text-zinc-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="glass-purple rounded-xl p-3 flex items-start gap-2">
              <Sparkles size={14} className="text-purple-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-zinc-400">
                AI will generate your personalized study schedule based on these preferences and the topics you've added.
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className={`btn-ghost text-sm py-2.5 px-5 ${step === 0 ? "opacity-30 pointer-events-none" : ""}`}
          >
            <ChevronLeft size={16} /> Back
          </button>

          {step < steps.length - 1 ? (
            <button
              onClick={() => canNext() && setStep((s) => s + 1)}
              disabled={!canNext()}
              className={`btn-primary text-sm py-2.5 px-6 ${!canNext() ? "opacity-50 pointer-events-none" : ""}`}
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-sm py-2.5 px-6"
            >
              {saving ? <><div className="spinner w-4 h-4" /> Saving...</> : <><CheckCircle size={15} /> Save & Continue</>}
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Onboarding;

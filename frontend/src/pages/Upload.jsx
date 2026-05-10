import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload as UploadIcon, FileText, CheckCircle2, 
  X, AlertCircle, Sparkles, Brain, ArrowRight, Loader2,
  ShieldAlert, Database, Fingerprint, Plus
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import aiService from "../services/aiService";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getOnboardingData } from "../firebase/firestore";

const Upload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getOnboardingData(user.uid);
        if (data && data.subjects) {
          setSubjects(data.subjects);
        } else {
          toast.error("Please complete Setup first.");
          navigate("/onboarding");
        }
      } catch (err) {
        console.error("Profile load failed", err);
      } finally {
        setLoadingProfile(false);
      }
    };
    if (user) loadProfile();
  }, [user]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith(".pdf") || f.type === "application/pdf");
    if (selectedFiles.length > 0) {
      setFiles(prev => [...prev, ...selectedFiles].slice(0, 5)); // Allow up to 5 files
      if (selectedFiles.length !== e.target.files.length) {
        toast.error("ONLY PDF files are allowed.");
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const selectedFiles = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith(".pdf") || f.type === "application/pdf");
    if (selectedFiles.length > 0) {
      setFiles(prev => [...prev, ...selectedFiles].slice(0, 5));
    } else {
      toast.error("Only PDF files can be analyzed.");
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startAnalysis = async () => {
    if (files.length === 0) return;
    setIsAnalyzing(true);
    try {
      toast.loading("Analyzing documents & validating subjects...", { id: "analysis" });
      const response = await aiService.analyzeSyllabus(files, user.uid, subjects);
      
      toast.success("Intelligence extraction complete!", { id: "analysis" });
      navigate("/study-plan");
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 422) {
        toast.error(err.response.data.message || "PDF does not match selected subjects.", { id: "analysis" });
      } else {
        toast.error("Analysis failed. Check your connection.", { id: "analysis" });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loadingProfile) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-48 space-y-4">
           <Loader2 className="animate-spin text-[var(--purple)]" size={40} />
           <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Verifying Subject Database...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <header className="text-center space-y-4">
          <div className="badge border-[var(--purple)]/30 text-[var(--purple)] inline-block mx-auto uppercase tracking-tighter text-[10px] font-bold">Phase 2: Neural Analysis</div>
          <h1 className="text-5xl font-display font-bold tracking-tight">Feed the <span className="text-[var(--text-secondary)]">Engine.</span></h1>
          <p className="text-[var(--text-secondary)] text-xl font-medium">Upload PDFs for {subjects.join(", ")}</p>
        </header>

        {/* Upload Card */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--purple)] to-[var(--blue)] opacity-5 blur-3xl group-hover:opacity-10 transition-opacity" />
          
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative bg-[var(--bg-secondary)] border-2 border-dashed rounded-[40px] p-12 flex flex-col items-center justify-center transition-all duration-500 overflow-hidden ${
              isDragging ? "border-[var(--purple)] bg-[var(--purple)]/5" : "border-[var(--border)]"
            }`}
          >
            <AnimatePresence mode="wait">
              {files.length === 0 ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center text-center space-y-8"
                >
                  <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center text-[var(--purple)]">
                    <UploadIcon size={32} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">Drop your documents</p>
                    <p className="text-[var(--text-muted)] font-medium">Upload up to 10 syllabus or study materials</p>
                  </div>
                  <label className="btn-primary cursor-pointer py-4 px-10 shadow-2xl bg-[var(--purple)] text-white">
                    Select Files
                    <input type="file" className="hidden" accept=".pdf" multiple onChange={handleFileChange} />
                  </label>
                </motion.div>
              ) : (
                <motion.div 
                  key="files-selected"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center space-y-8 w-full"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                    {files.map((f, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4 p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl relative group/item"
                      >
                        <div className="w-10 h-10 rounded-lg bg-[var(--purple)]/10 flex items-center justify-center text-[var(--purple)]">
                          <FileText size={20} />
                        </div>
                        <div className="flex-1 text-left overflow-hidden">
                          <p className="text-sm font-bold truncate text-[var(--text-primary)]">{f.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)] font-bold">{(f.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                        <button 
                          onClick={() => removeFile(i)}
                          className="opacity-0 group-hover/item:opacity-100 transition-opacity p-1 text-[var(--text-muted)] hover:text-[var(--red)]"
                        >
                          <X size={16} />
                        </button>
                      </motion.div>
                    ))}
                    {files.length < 10 && (
                      <label className="border-2 border-dashed border-[var(--border)] rounded-2xl p-4 flex items-center justify-center gap-2 text-[var(--text-muted)] hover:border-[var(--purple)] hover:text-[var(--purple)] transition-all cursor-pointer">
                        <Plus size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Add More</span>
                        <input type="file" className="hidden" accept=".pdf" multiple onChange={handleFileChange} />
                      </label>
                    )}
                  </div>
                  
                  {isAnalyzing ? (
                    <div className="w-full max-w-md space-y-6">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--purple)]">
                        <span>Mapping Topics</span>
                        <span>{files.length} Files</span>
                        <span>Validating</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-[var(--purple)]"
                          animate={{ width: ["0%", "100%"] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        />
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] font-medium animate-pulse">
                        Neural engine parsing documents for {subjects.length} subjects...
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 w-full max-w-sm">
                      <button 
                        onClick={startAnalysis}
                        className="btn-primary w-full py-5 text-base shadow-2xl bg-[var(--purple)] text-white font-bold"
                      >
                        Start Deep Analysis <Sparkles size={20} />
                      </button>
                      <button 
                        onClick={() => setFiles([])}
                        className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest hover:text-white transition-colors"
                      >
                        Reset Uploads
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Validation Shield */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[32px] p-6 flex items-center gap-6">
           <div className="w-12 h-12 rounded-xl bg-[var(--green)]/10 text-[var(--green)] flex items-center justify-center shrink-0">
              <ShieldAlert size={24} />
           </div>
           <div className="space-y-1">
              <h4 className="text-sm font-bold text-[var(--text-primary)]">Validation Active</h4>
              <p className="text-xs text-[var(--text-secondary)]">The AI will verify if each PDF belongs to: <span className="text-[var(--purple)] font-bold">{subjects.join(", ")}</span>. Invalid content will be flagged.</p>
           </div>
        </div>

      </div>
    </AppLayout>
  );
};

export default Upload;

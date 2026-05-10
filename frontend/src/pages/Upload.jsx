import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload as UploadIcon, FileText, CheckCircle2, 
  X, AlertCircle, Sparkles, Brain, ArrowRight, Loader2
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import aiService from "../services/aiService";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const Upload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(f => f.type === "application/pdf");
    if (selectedFiles.length > 0) {
      setFiles(prev => [...prev, ...selectedFiles].slice(0, 5)); // Limit to 5 files
      if (selectedFiles.length !== e.target.files.length) {
        toast.error("Some files were skipped. Only PDFs are supported.");
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const selectedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf");
    if (selectedFiles.length > 0) {
      setFiles(prev => [...prev, ...selectedFiles].slice(0, 5));
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startAnalysis = async () => {
    if (files.length === 0) return;
    setIsAnalyzing(true);
    try {
      toast.loading("Neural engine parsing multiple documents...", { id: "analysis" });
      const response = await aiService.analyzeSyllabus(files, user.uid);
      
      // Save plan to local storage for instant reflection
      if (response.plan) {
        localStorage.setItem(`studyPlan_${user.uid}`, JSON.stringify(response.plan));
      }
      
      toast.success("Analysis complete. Strategic path updated!", { id: "analysis" });
      navigate("/study-plan");
    } catch (err) {
      console.error(err);
      toast.error("Analysis failed. Check your API limits.", { id: "analysis" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <header className="text-center space-y-4">
          <div className="badge border-[var(--purple)]/30 text-[var(--purple)] inline-block mx-auto uppercase tracking-tighter text-[10px] font-bold">Multi-Document Processing</div>
          <h1 className="text-5xl font-display font-bold tracking-tight">Intelligence starts with <span className="text-[var(--text-secondary)]">Data.</span></h1>
          <p className="text-[var(--text-secondary)] text-xl font-medium">Upload up to 5 syllabus or study materials for cross-document analysis.</p>
        </header>

        {/* Upload Card */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--purple)] to-[var(--blue)] opacity-5 blur-3xl group-hover:opacity-10 transition-opacity" />
          
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative bg-[var(--bg-secondary)] border-2 border-dashed rounded-[40px] p-12 flex flex-col items-center justify-center transition-all duration-500 overflow-hidden ${
              isDragging ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--border)]"
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
                  <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center text-[var(--text-secondary)]">
                    <UploadIcon size={32} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">Drop your documents here</p>
                    <p className="text-[var(--text-muted)] font-medium">Support PDF files up to 10MB each</p>
                  </div>
                  <label className="btn-primary cursor-pointer py-4 px-10 shadow-2xl">
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
                        <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                          <FileText size={20} />
                        </div>
                        <div className="flex-1 text-left overflow-hidden">
                          <p className="text-sm font-bold truncate">{f.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)] font-bold">{(f.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                        <button 
                          onClick={() => removeFile(i)}
                          className="opacity-0 group-hover/item:opacity-100 transition-opacity p-1 hover:text-[var(--red)]"
                        >
                          <X size={16} />
                        </button>
                      </motion.div>
                    ))}
                    {files.length < 5 && (
                      <label className="border-2 border-dashed border-[var(--border)] rounded-2xl p-4 flex items-center justify-center gap-2 text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer">
                        <UploadIcon size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest">Add More</span>
                        <input type="file" className="hidden" accept=".pdf" multiple onChange={handleFileChange} />
                      </label>
                    )}
                  </div>
                  
                  {isAnalyzing ? (
                    <div className="w-full max-w-md space-y-4">
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-[var(--accent)]"
                          animate={{ width: ["0%", "100%"] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        />
                      </div>
                      <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest flex items-center justify-center gap-2">
                        <Loader2 size={12} className="animate-spin" /> Neural Nodes Processing {files.length} Documents...
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 w-full max-w-sm">
                      <button 
                        onClick={startAnalysis}
                        className="btn-primary w-full py-5 text-base shadow-2xl bg-[var(--accent)] text-black font-bold"
                      >
                        Analyze Documents <Sparkles size={20} />
                      </button>
                      <button 
                        onClick={() => setFiles([])}
                        className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest hover:text-white transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid md:grid-cols-2 gap-8 pt-12 border-t border-[var(--border)]">
           <div className="flex gap-6">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center flex-shrink-0">
                 <Brain size={20} className="text-[var(--text-secondary)]" />
              </div>
              <div className="space-y-2">
                 <h4 className="font-display font-bold text-lg">Smart Topic Extraction</h4>
                 <p className="text-sm text-[var(--text-secondary)] font-medium leading-relaxed">Our Gemini-powered engine identifies core concepts and filters out the noise.</p>
              </div>
           </div>
           <div className="flex gap-6">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center flex-shrink-0">
                 <CheckCircle2 size={20} className="text-[var(--text-secondary)]" />
              </div>
              <div className="space-y-2">
                 <h4 className="font-display font-bold text-lg">Automatic Importance Scoring</h4>
                 <p className="text-sm text-[var(--text-secondary)] font-medium leading-relaxed">Priority levels are assigned based on topic frequency and academic patterns.</p>
              </div>
           </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Upload;

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload as UploadIcon, FileText, CheckCircle2, 
  X, AlertCircle, Sparkles, Brain, ArrowRight, Loader2,
  Printer, Download, ShieldCheck, Zap, HelpCircle, Trash2
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import aiService from "../services/aiService";
import { useAuth } from "../context/AuthContext.jsx";
import { onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";
import axios from "axios";
import toast from "react-hot-toast";

const QuestionBank = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Real-time history listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "questionBanks"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setHistory(docs);
      setLoadingHistory(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(f => f.type === "application/pdf");
    if (selectedFiles.length > 0) {
      setFiles(prev => [...prev, ...selectedFiles].slice(0, 5));
    }
  };

  const startAnalysis = async () => {
    if (files.length === 0) return;
    setIsAnalyzing(true);
    try {
      toast.loading("Analyzing Question Bank Patterns...", { id: "qb-analysis" });
      const res = await aiService.analyzeQuestionBank(files, user.uid);
      setAnalysis(res);
      toast.success("Pattern extraction complete!", { id: "qb-analysis" });
    } catch (err) {
      toast.error("Analysis failed. Try smaller files.", { id: "qb-analysis" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteHistory = async (id, e) => {
    e.stopPropagation();
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      await axios.delete(`${API_BASE_URL}/delete-question-bank/${user.uid}/${id}`);
      if (analysis?.id === id) setAnalysis(null);
      setHistory(prev => prev.filter(item => item.id !== id));
      toast.success("Analysis removed");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 pb-24">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-12">
          {/* Header */}
          <header className="space-y-4 no-print">
            <div className="badge border-[var(--blue)]/30 text-[var(--blue)] uppercase tracking-tighter text-[10px] font-bold">Exam Intelligence</div>
            <h1 className="text-5xl font-display font-bold tracking-tight">Question Bank <span className="text-[var(--text-secondary)]">Analyzer.</span></h1>
            <p className="text-[var(--text-secondary)] text-xl font-medium">Extract repeated patterns and most probable questions from past papers.</p>
          </header>

          {/* Results Area */}
          {analysis ? (
            <div className="space-y-12 animate-slide-up print-container">
              <div className="flex items-center justify-between no-print">
                 <h2 className="text-3xl font-display font-bold">Intelligence <span className="text-[var(--blue)]">Report.</span></h2>
                 <div className="flex gap-2">
                   <button onClick={() => setAnalysis(null)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all">New Analysis</button>
                   <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-3 bg-[var(--blue)] text-black rounded-2xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all">
                      <Printer size={16} /> Save as PDF
                   </button>
                 </div>
              </div>

              <div className="grid gap-8">
                {/* Summary Briefly */}
                <section className="p-8 bg-gradient-to-br from-[var(--blue)]/10 to-[var(--purple)]/10 border border-[var(--blue)]/20 rounded-[40px] space-y-4">
                   <h3 className="text-xl font-bold flex items-center gap-2">
                      <Sparkles size={20} className="text-[var(--blue)]" /> Strategic Briefing
                   </h3>
                   <p className="text-[var(--text-secondary)] leading-relaxed font-medium">{analysis.summary}</p>
                </section>

                {/* Most Repeated Patterns */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-[var(--purple)]/10 rounded-xl text-[var(--purple)]"><Zap size={20} /></div>
                     <h3 className="text-xl font-bold">Most Repeated Patterns</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {analysis.patterns?.map((p, i) => (
                       <div key={i} className="p-6 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[32px] space-y-3">
                          <p className="font-bold text-lg leading-snug">{p.pattern}</p>
                          <div className="flex items-center gap-2">
                             <span className="px-3 py-1 bg-white/5 text-[var(--text-muted)] text-[10px] font-black rounded-full uppercase">{p.trend}</span>
                          </div>
                          <p className="text-sm text-[var(--text-secondary)] font-medium">{p.significance}</p>
                       </div>
                     ))}
                  </div>
                </section>

                {/* Most Repeated Questions */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-[var(--blue)]/10 rounded-xl text-[var(--blue)]"><HelpCircle size={20} /></div>
                     <h3 className="text-xl font-bold">Frequently Asked Questions</h3>
                  </div>
                  <div className="space-y-4">
                     {analysis.repeatedQuestions?.map((q, i) => (
                       <div key={i} className="p-6 bg-white/5 border border-white/5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                             <p className="font-bold text-lg">{q.question}</p>
                             <div className="flex gap-2">
                                {q.years?.map(y => <span key={y} className="text-[10px] font-bold text-[var(--blue)]">#{y}</span>)}
                             </div>
                          </div>
                          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--blue)]/10 rounded-xl text-[var(--blue)] text-xs font-black">
                             {q.frequency}
                          </div>
                       </div>
                     ))}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className={`no-print ${isAnalyzing ? 'pointer-events-none' : ''}`}>
               <div className={`bg-[var(--bg-secondary)] border-2 border-dashed rounded-[40px] p-12 flex flex-col items-center justify-center transition-all duration-500 ${files.length > 0 ? "border-[var(--blue)]" : "border-[var(--border)]"}`}>
                  {!isAnalyzing ? (
                    <div className="flex flex-col items-center text-center space-y-8 w-full">
                      {files.length === 0 ? (
                        <>
                           <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-[var(--text-muted)]">
                             <UploadIcon size={32} />
                           </div>
                           <div className="space-y-2">
                             <p className="text-2xl font-bold">Drop your question banks here</p>
                             <p className="text-[var(--text-muted)] font-medium text-sm">Upload up to 5 PDFs (Previous years papers)</p>
                           </div>
                           <label className="btn-primary bg-[var(--blue)] text-black cursor-pointer py-4 px-10 shadow-2xl">
                             Select Files
                             <input type="file" className="hidden" accept=".pdf" multiple onChange={handleFileChange} />
                           </label>
                        </>
                      ) : (
                        <div className="w-full max-w-2xl space-y-8">
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             {files.map((f, i) => (
                               <div key={i} className="flex items-center gap-4 p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl">
                                 <div className="w-10 h-10 rounded-lg bg-[var(--blue)]/10 flex items-center justify-center text-[var(--blue)]"><FileText size={20} /></div>
                                 <div className="flex-1 text-left overflow-hidden">
                                   <p className="text-sm font-bold truncate">{f.name}</p>
                                   <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-tight">{(f.size / 1024).toFixed(0)} KB</p>
                                 </div>
                               </div>
                             ))}
                           </div>
                           <div className="flex flex-col gap-4 max-w-sm mx-auto">
                             <button onClick={startAnalysis} className="btn-primary w-full py-5 shadow-2xl bg-[var(--blue)] text-black font-bold">Extract Patterns <Sparkles size={18} /></button>
                             <button onClick={() => setFiles([])} className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest hover:text-white">Clear All</button>
                           </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-6">
                       <Loader2 size={48} className="animate-spin text-[var(--blue)]" />
                       <div className="text-center space-y-2">
                         <p className="text-xl font-bold">Identifying Repeats...</p>
                         <p className="text-sm text-[var(--text-muted)]">Cross-referencing multiple PDFs to find high-frequency questions.</p>
                       </div>
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>

        {/* Sidebar History */}
        <div className="lg:col-span-4 space-y-6 no-print">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">Previous Analyses</h4>
            <span className="bg-[var(--bg-surface)] px-2 py-1 rounded-md border border-[var(--border)] text-[10px] font-bold">{history.length}</span>
          </div>
          
          <div className="space-y-3 overflow-y-auto max-h-[700px] pr-2 custom-scrollbar">
            {loadingHistory ? (
              [1,2,3].map(i => <div key={i} className="h-24 bg-[var(--bg-secondary)] rounded-2xl animate-pulse" />)
            ) : history.length === 0 ? (
              <div className="text-center py-10 opacity-30">
                <FileText className="mx-auto mb-2" size={24} />
                <p className="text-xs">No history found</p>
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} onClick={() => setAnalysis(item)} className={`p-5 rounded-2xl border transition-all cursor-pointer group ${analysis?.id === item.id ? 'bg-[var(--bg-surface)] border-[var(--blue)]/30 shadow-lg' : 'bg-[var(--bg-secondary)] border-[var(--border)] hover:border-[var(--border-hover)]'}`}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-sm font-bold truncate pr-4">
                        {item.title || `Pattern Extraction - ${item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'Recent'}`}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-tight">
                        {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleTimeString() : "Just now"}
                      </p>
                    </div>
                    <button onClick={(e) => handleDeleteHistory(item.id, e)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red)]/10 transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-container { background: white !important; color: black !important; padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
          .bg-\\[var\\(--bg-secondary\\)\\], .bg-white\\/5, .bg-white\\[0\\.02\\] { background: #f9f9f9 !important; border: 1px solid #ddd !important; }
          h1, h2, h3, p, span { color: black !important; }
          .text-\\[var\\(--text-secondary\\)\\] { color: #444 !important; }
          .text-\\[var\\(--text-muted\\)\\] { color: #666 !important; }
          .glass, .glass-purple { background: white !important; border: 1px solid #eee !important; box-shadow: none !important; }
          .orb { display: none !important; }
        }
      `}} />
    </AppLayout>
  );
};

export default QuestionBank;

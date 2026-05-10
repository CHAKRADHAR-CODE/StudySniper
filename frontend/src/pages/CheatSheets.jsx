import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, FileText, Search, Plus, 
  Trash2, Download, ExternalLink, Brain, Loader2,
  Clock, AlertTriangle, X, ChevronRight, List,
  Table as TableIcon, Layout, MessageSquare, Zap,
  BookOpen, HelpCircle
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { useAuth } from "../context/AuthContext.jsx";
import { getCheatSheets, deleteCheatSheet } from "../firebase/firestore";
import axios from "axios";
import toast from "react-hot-toast";

import { onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";

const CheatSheets = () => {
  const { user } = useAuth();
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [topicName, setTopicName] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSheet, setSelectedSheet] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    const q = query(collection(db, "users", user.uid, "cheatsheets"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => {
        const sheet = { id: d.id, ...d.data() };
        // Robust parsing
        ['tables', 'interviewQuestions', 'formulas', 'highlights', 'keyConcepts', 'importantPoints', 'flowExplanations'].forEach(field => {
          if (sheet[field] && typeof sheet[field] === 'string') {
            try { sheet[field] = JSON.parse(sheet[field]); } catch (e) {}
          }
        });
        return sheet;
      });
      
      setSheets(docs);
      if (docs.length > 0) {
        localStorage.setItem(`cheatsheets_${user.uid}`, JSON.stringify(docs));
      }
      
      // Keep selectedSheet in sync with the new data
      if (selectedSheet) {
        const updated = docs.find(s => s.id === selectedSheet.id);
        if (updated) setSelectedSheet(updated);
      }

      setLoading(false);
    }, (err) => {
      console.error("CheatSheet Sync Error:", err);
      // Fallback
      const local = localStorage.getItem(`cheatsheets_${user.uid}`);
      if (local) setSheets(JSON.parse(local));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!topicName.trim()) return toast.error("Enter a topic name");
    setGenerateLoading(true);
    toast.loading("Generating AI Cheat Sheet...", { id: "generate" });
    try {
      const response = await axios.post(`${API_BASE_URL}/generate-cheatsheet`, {
        userId: user.uid,
        content: topicName
      }, {
        timeout: 90000 
      });

      // Save to local storage for instant reflection
      const newSheet = { ...response.data, id: `local-${Date.now()}`, createdAt: { seconds: Date.now()/1000 } };
      const updatedSheets = [newSheet, ...sheets];
      setSheets(updatedSheets);
      localStorage.setItem(`cheatsheets_${user.uid}`, JSON.stringify(updatedSheets));

      toast.success("Cheat Sheet Ready!", { id: "generate" });
      setIsCreating(false);
      setTopicName("");
      // fetchSheets(); // Don't refetch, we already updated locally
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Generation failed. Try a different topic.";
      toast.error(errorMsg, { id: "generate" });
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteCheatSheet(user.uid, id);
      setSheets(prev => prev.filter(s => s.id !== id));
      if (selectedSheet?.id === id) setSelectedSheet(null);
      toast.success("Removed from repository");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const downloadAsPDF = (sheet) => {
    const printContent = `
      <html>
        <head>
          <title>${sheet.title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.5; background: #fff; }
            .header { border-bottom: 4px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .brand { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #666; margin-bottom: 10px; }
            h1 { font-size: 36px; font-weight: 800; margin: 0; color: #000; letter-spacing: -1px; }
            h2 { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0071e3; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
            .summary { background: #f9f9fb; padding: 20px; border-radius: 12px; font-style: italic; color: #444; border-left: 4px solid #af52de; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 8px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
            th { background: #f4f4f7; padding: 12px; text-align: left; font-weight: 800; border: 1px solid #ddd; }
            td { padding: 12px; border: 1px solid #ddd; }
            .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 10px; color: #999; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">StudySniper Neural Infrastructure</div>
            <h1>${sheet.title}</h1>
            <p style="color: #666; font-size: 12px;">Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="summary">${sheet.summary}</div>
          <div class="grid">
            <div>
              <h2>Key Concepts</h2>
              <ul>${(sheet.keyConcepts || []).map(c => `<li>${c}</li>`).join('')}</ul>
            </div>
            <div>
              <h2>Important Points</h2>
              <ul>${(sheet.importantPoints || []).map(p => `<li>${p}</li>`).join('')}</ul>
            </div>
          </div>
          ${sheet.tables && sheet.tables.length > 0 ? sheet.tables.map(table => `
            <h2>Comparative Analysis</h2>
            <table>
              <thead><tr>${table.header.map(h => `<th>${h}</th>`).join('')}</tr></thead>
              <tbody>${table.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
            </table>
          `).join('') : ''}
          <h2>Neural Formula Network</h2>
          <ul>${(sheet.formulas || ["No formulas identified."]).map(f => `<li>${f}</li>`).join('')}</ul>
          <h2>Process & Flow</h2>
          <ul>${(sheet.flowExplanations || []).map(f => `<li>${f}</li>`).join('')}</ul>
          <div class="footer">
            StudySniper AI • Intelligence for Scholars • Protected Neural Data
          </div>
        </body>
      </html>
    `;
    const win = window.open("", "_blank");
    win.document.write(printContent);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  const filteredSheets = sheets.filter(s => (s.title || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout>
      <div className="space-y-12 pb-20">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
             <div className="badge border-[var(--purple)]/30 text-[var(--purple)]">Neural Library</div>
              <h1 className="text-5xl font-display font-bold tracking-tight text-[var(--text-primary)]">Cheat <span className="text-[var(--text-secondary)]">Sheets.</span></h1>
              <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xl font-medium">
                 <Sparkles size={20} className="text-[var(--amber)]" />
                 <p>AI-Powered High-Density Revision Engine.</p>
              </div>
          </div>
          <button onClick={() => setIsCreating(true)} className="btn-primary py-4 px-10 shadow-2xl flex items-center gap-2">
            <Plus size={20} /> Generate Sheet
          </button>
        </header>

        <div className="relative max-w-xl">
           <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
           <input type="text" placeholder="Search topic..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl pl-16 pr-6 py-5 text-sm outline-none focus:border-[var(--text-secondary)] transition-all placeholder:text-[var(--text-muted)]" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between px-2 mb-6 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
              <h3>Available Sheets</h3>
              <span className="bg-[var(--bg-surface)] px-2 py-1 rounded-md border border-[var(--border)]">{filteredSheets.length}</span>
            </div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border)]">
                 <Loader2 className="animate-spin text-[var(--text-muted)]" size={24} />
                 <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Retrieving Data...</p>
              </div>
            ) : filteredSheets.length === 0 ? (
              <div className="bg-[var(--bg-secondary)] border border-[var(--border)] border-dashed rounded-3xl p-12 text-center space-y-4">
                 <FileText size={24} className="mx-auto text-[var(--text-muted)]" />
                 <p className="text-xs text-[var(--text-muted)]">No sheets generated yet.</p>
                 <button onClick={() => setIsCreating(true)} className="text-[10px] font-bold text-[var(--accent)] uppercase hover:underline">Start Now</button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredSheets.map((sheet) => (
                  <motion.div key={sheet.id} layoutId={sheet.id} onClick={() => setSelectedSheet(sheet)} className={`p-6 rounded-3xl border transition-all cursor-pointer group ${selectedSheet?.id === sheet.id ? 'bg-[var(--bg-surface)] border-[var(--accent)]/30 shadow-lg' : 'bg-[var(--bg-secondary)] border-[var(--border)] hover:border-[var(--border-hover)]'}`}>
                    <div className="flex justify-between items-start">
                       <div className="space-y-1">
                          <h4 className="font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{sheet.title}</h4>
                          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-tight font-bold">{new Date(sheet.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                       </div>
                       <button onClick={(e) => handleDelete(sheet.id, e)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red)]/5 transition-all"><Trash2 size={14} /></button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-8 min-h-[600px]">
            {selectedSheet ? (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={selectedSheet.id} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-[100px] -mr-32 -mt-32" />
                <div className="relative z-10 space-y-10">
                  <header className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-[var(--border)] pb-8">
                    <div className="space-y-2">
                       <div className="flex items-center gap-2">
                          <Zap size={16} className="text-[var(--amber)]" />
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Verified AI Concept Sheet</span>
                       </div>
                       <h2 className="text-4xl font-display font-bold tracking-tight">{selectedSheet.title}</h2>
                    </div>
                    <button onClick={() => downloadAsPDF(selectedSheet)} className="btn-outline py-3 px-8 flex items-center gap-2 hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-all"><Download size={16} /> Export to PDF</button>
                  </header>
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-[var(--accent)]"><Layout size={18} /><h3 className="text-xs font-bold uppercase tracking-widest">Strategic Overview</h3></div>
                    <p className="text-[var(--text-secondary)] text-lg leading-relaxed italic bg-[var(--bg-surface)] p-8 rounded-3xl border border-[var(--border)]">"{selectedSheet?.summary}"</p>
                  </section>
                  <div className="grid md:grid-cols-2 gap-8">
                     <div className="space-y-4 bg-[var(--bg-surface)] p-8 rounded-[32px] border border-[var(--border)]">
                        <div className="flex items-center gap-2 text-[var(--purple)]"><Brain size={18} /><h3 className="text-xs font-bold uppercase tracking-widest">Key Concepts</h3></div>
                        <ul className="space-y-3">{selectedSheet?.keyConcepts?.map((c, i) => (
                          <li key={i} className="flex gap-3 text-sm text-[var(--text-secondary)]">
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--purple)] mt-2 shrink-0" /> 
                            {typeof c === 'object' ? (c.concept || c.description || JSON.stringify(c)) : c}
                          </li>
                        ))}</ul>
                     </div>
                     <div className="space-y-4 bg-[var(--bg-surface)] p-8 rounded-[32px] border border-[var(--border)]">
                        <div className="flex items-center gap-2 text-[var(--blue)]"><List size={18} /><h3 className="text-xs font-bold uppercase tracking-widest">Important Points</h3></div>
                        <ul className="space-y-3">{selectedSheet?.importantPoints?.map((p, i) => (
                          <li key={i} className="flex gap-3 text-sm text-[var(--text-secondary)]">
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--blue)] mt-2 shrink-0" /> 
                            {typeof p === 'object' ? (p.point || p.description || JSON.stringify(p)) : p}
                          </li>
                        ))}</ul>
                     </div>
                  </div>
                  {selectedSheet?.tables && selectedSheet.tables.length > 0 && (
                    <section className="space-y-4">
                       <div className="flex items-center gap-2 text-[var(--amber)]"><TableIcon size={18} /><h3 className="text-xs font-bold uppercase tracking-widest">Comparative Analysis</h3></div>
                       <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse bg-[var(--bg-surface)] rounded-3xl overflow-hidden border border-[var(--border)]">
                             <thead><tr className="bg-[var(--bg-primary)]">{selectedSheet.tables[0].header?.map((h, i) => (<th key={i} className="p-6 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border)]">{h}</th>))}</tr></thead>
                             <tbody>{selectedSheet.tables[0].rows?.map((row, i) => (<tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-white/5 transition-colors">{row?.map((cell, j) => (<td key={j} className="p-6 text-sm text-[var(--text-secondary)]">{cell}</td>))}</tr>))}</tbody>
                          </table>
                       </div>
                    </section>
                  )}
                  <div className="grid md:grid-cols-2 gap-8">
                     <div className="space-y-4 border border-[var(--border)] p-8 rounded-[32px]">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Formula Network</h3>
                        <div className="space-y-3">{selectedSheet?.formulas?.map((f, i) => (
                          <div key={i} className="text-sm font-mono bg-black/20 p-4 rounded-xl text-[var(--accent)] border border-white/5">
                            {typeof f === 'object' ? (f.formula || f.description || JSON.stringify(f)) : f}
                          </div>
                        ))}</div>
                     </div>
                     <div className="space-y-4 border border-[var(--border)] p-8 rounded-[32px]">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Pro Highlights</h3>
                        <div className="space-y-3">{selectedSheet?.highlights?.map((h, i) => (
                          <div key={i} className="text-sm bg-amber-500/5 p-4 rounded-xl text-amber-500 border border-amber-500/10 flex gap-3">
                            <Sparkles size={16} className="shrink-0" /> 
                            {typeof h === 'object' ? (h.highlight || h.description || JSON.stringify(h)) : h}
                          </div>
                        ))}</div>
                     </div>
                  </div>
                  <section className="space-y-6 pt-10 border-t border-[var(--border)]">
                     <div className="flex items-center gap-2 text-[var(--green)]"><MessageSquare size={18} /><h3 className="text-xs font-bold uppercase tracking-widest">Interview & Exam Drills</h3></div>
                     <div className="grid gap-4">{selectedSheet?.interviewQuestions?.map((q, i) => (<div key={i} className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] space-y-2"><p className="font-bold text-[var(--text-primary)]">Q: {q?.question}</p><p className="text-sm text-[var(--text-secondary)] leading-relaxed">A: {q?.answer}</p></div>))}</div>
                  </section>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 bg-[var(--bg-secondary)]/50 border border-[var(--border)] border-dashed rounded-[40px] opacity-50">
                 <div className="w-24 h-24 rounded-full bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)] border border-[var(--border)]"><BookOpen size={40} /></div>
                 <div className="space-y-2"><h3 className="text-xl font-bold">Select a Record</h3><p className="text-xs text-[var(--text-muted)]">Choose a sheet or generate a new one.</p></div>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isCreating && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreating(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[var(--bg-secondary)] border border-[var(--border)] w-full max-w-xl rounded-[32px] p-10 relative z-10 shadow-2xl">
                <div className="flex justify-between items-center mb-10"><h3 className="text-2xl font-bold">Neural Generator</h3><button onClick={() => setIsCreating(false)} className="text-[var(--text-muted)] hover:text-white transition-all"><X size={20} /></button></div>
                <form onSubmit={handleCreate} className="space-y-8">
                  <div className="space-y-4"><label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Topic Name</label><input type="text" className="input-field py-6 px-8 text-lg font-bold" placeholder="e.g. Operating System" value={topicName} onChange={(e) => setTopicName(e.target.value)} required /></div>
                  <button type="submit" disabled={generateLoading} className="w-full btn-primary py-5 shadow-2xl flex items-center justify-center gap-3">{generateLoading ? <><Loader2 className="animate-spin" size={24} /> Generating...</> : <><Sparkles size={20} /> Synthesize Knowledge</>}</button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default CheatSheets;

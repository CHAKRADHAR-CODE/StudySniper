import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Clock, CheckCircle2, ChevronRight, 
  Brain, Sparkles, Target, AlertCircle, Loader2,
  FileQuestion, Trash2
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { useAuth } from "../context/AuthContext.jsx";
import { getStudyPlan, deleteStudyPlan, toggleTaskCompletion, getProgress } from "../firebase/firestore";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const StudyPlan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState([]);

  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    // Real-time listener for "instant reflection"
    const unsubscribe = onSnapshot(doc(db, "users", user.uid, "studyPlan", "current"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.schedule && typeof data.schedule === 'string') {
          try { data.schedule = JSON.parse(data.schedule); } catch (e) {}
        }
        setPlan(data);
        setLoading(false);
      } else {
        // Try local storage if firestore is empty
        const localPlan = localStorage.getItem(`studyPlan_${user.uid}`);
        if (localPlan) {
          setPlan(JSON.parse(localPlan));
        } else {
          setPlan(null);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch progress separately or add another snapshot if needed
  useEffect(() => {
    if (!user) return;
    const fetchProg = async () => {
      const p = await getProgress(user.uid);
      if (p) setCompletedTasks(p.completedTasks || []);
    };
    fetchProg();
  }, [user]);

  const toggleTask = async (taskId) => {
    const isDone = completedTasks.includes(taskId);
    setCompletedTasks(prev => 
      isDone ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
    try {
      await toggleTaskCompletion(user.uid, taskId, !isDone);
    } catch (err) {
      toast.error("Sync failed");
    }
  };

  const handleDeletePlan = async () => {
    if (window.confirm("Are you sure you want to delete this study plan? All progress stats will be reset.")) {
      try {
        setLoading(true);
        await deleteStudyPlan(user.uid);
        setPlan(null);
        toast.success("Schedule deleted successfully");
        navigate("/upload");
      } catch (err) {
        toast.error("Failed to delete plan");
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-48 space-y-4">
           <Loader2 className="animate-spin text-[var(--accent)]" size={40} />
           <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Building Your Path...</p>
        </div>
      </AppLayout>
    );
  }

  if (!plan || !plan.schedule) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-20 space-y-12">
          <header className="text-center space-y-4">
            <div className="badge">Planning Infrastructure</div>
            <h1 className="text-5xl font-display font-bold">Your schedule is <span className="text-[var(--text-secondary)]">empty.</span></h1>
            <p className="text-[var(--text-secondary)] text-xl">Upload a syllabus to generate a week-by-week neural study plan.</p>
          </header>

          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[40px] p-20 flex flex-col items-center text-center space-y-8 shadow-2xl relative overflow-hidden">
             <div className="absolute inset-0 bg-grid opacity-5" />
             <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center text-[var(--text-muted)] relative z-10">
                <FileQuestion size={40} />
             </div>
             <div className="space-y-2 relative z-10">
                <h3 className="text-2xl font-bold">No active plan found</h3>
                <p className="text-[var(--text-secondary)] max-w-sm mx-auto">Our AI needs a syllabus to understand your exam requirements and build an optimized path.</p>
             </div>
             <button onClick={() => navigate("/upload")} className="btn-primary py-4 px-10 text-base shadow-2xl relative z-10">Generate Plan Now</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
             <div className="badge border-[var(--green)]/30 text-[var(--green)]">Neural Optimization Active</div>
             <h1 className="text-5xl font-display font-bold tracking-tight text-[var(--text-primary)]">Academic <span className="text-[var(--text-secondary)]">Schedule.</span></h1>
             <p className="text-[var(--text-secondary)] text-xl font-medium">Strategic Path: Cryptographically optimized for maximum retention.</p>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={handleDeletePlan} className="btn-outline border-red-500/30 text-red-400 hover:bg-red-500/10 py-4 px-8 shadow-2xl flex items-center gap-2">
               <Trash2 size={18} /> Delete Plan
             </button>
             <button onClick={() => navigate("/upload")} className="btn-primary py-4 px-10 shadow-2xl">Re-Optimize</button>
          </div>
        </header>

        {/* Schedule Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {plan.schedule.map((dayData, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[24px] p-4 flex flex-col h-full group hover:border-[var(--accent)]/30 transition-all ${
                i === 0 ? "border-[var(--accent)]/50 ring-1 ring-[var(--accent)]/20" : ""
              }`}
            >
               <div className="flex justify-between items-center mb-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${i === 0 ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>
                    Day {i + 1}
                  </span>
                  {i === 0 && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />}
               </div>
               
               <div className="space-y-3 flex-1">
                  {dayData.tasks?.map((task, j) => {
                    const taskId = `task-${i}-${j}`;
                    const isDone = completedTasks.includes(taskId);
                    return (
                      <div 
                        key={j} 
                        onClick={() => toggleTask(taskId)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative group/task ${
                          isDone 
                          ? "bg-[var(--green)]/5 border-[var(--green)]/20" 
                          : "bg-[var(--bg-surface)] border-[var(--border)] hover:border-[var(--accent)]/40 hover:bg-[var(--bg-card)] shadow-sm"
                        }`}
                      >
                         <div className="flex justify-between items-start gap-2">
                           <div className="flex-1">
                             <p className={`text-[11px] font-bold leading-tight transition-all ${isDone ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                               {task.topic || task.task}
                             </p>
                             {!isDone && task.goal && <p className="text-[9px] text-[var(--text-muted)] italic mt-1 leading-tight">{task.goal}</p>}
                           </div>
                           {isDone && <CheckCircle2 size={14} className="text-[var(--green)] flex-shrink-0" />}
                         </div>
                         {!isDone && (
                           <p className="text-[9px] text-[var(--accent)] font-black mt-2 uppercase tracking-tighter opacity-70">
                             {task.duration || "2 Hours"}
                           </p>
                         )}
                      </div>
                    );
                  })}
               </div>
            </motion.div>
          ))}
        </div>

      </div>
    </AppLayout>
  );
};

export default StudyPlan;

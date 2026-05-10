import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Clock, CheckCircle2, ChevronRight, 
  Brain, Sparkles, Target, AlertCircle, Loader2,
  FileQuestion, Trash2, Download, TrendingUp,
  BarChart3, Layout, Layers, Zap, Info, ShieldAlert
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { useAuth } from "../context/AuthContext.jsx";
import { getStudyPlan, deleteStudyPlan, toggleTaskCompletion, getProgress } from "../firebase/firestore";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';

const StudyPlan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [activeDay, setActiveDay] = useState(0);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsubscribe = onSnapshot(doc(db, "users", user.uid, "studyPlan", "current"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.schedule && typeof data.schedule === 'string') {
          try { data.schedule = JSON.parse(data.schedule); } catch (e) {}
        }
        setPlan(data);
        setLoading(false);
      } else {
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
    if (window.confirm("Are you sure you want to delete this study plan?")) {
      try {
        setLoading(true);
        await deleteStudyPlan(user.uid);
        setPlan(null);
        setCompletedTasks([]);
        toast.success("Schedule deleted");
        navigate("/onboarding");
      } catch (err) {
        toast.error("Failed to delete plan");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const progressData = useMemo(() => {
    if (!plan || !plan.schedule) return [];
    return plan.schedule.map((day, idx) => {
      const dayTasks = day.tasks || [];
      const done = dayTasks.filter((_, tIdx) => completedTasks.includes(`task-${idx}-${tIdx}`)).length;
      return {
        name: `Day ${idx + 1}`,
        completed: done,
        total: dayTasks.length,
        percent: dayTasks.length > 0 ? (done / dayTasks.length) * 100 : 0
      };
    });
  }, [plan, completedTasks]);

  const overallProgress = useMemo(() => {
    if (progressData.length === 0) return 0;
    const total = progressData.reduce((acc, d) => acc + d.total, 0);
    const completed = progressData.reduce((acc, d) => acc + d.completed, 0);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [progressData]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-48 space-y-4">
           <div className="w-12 h-12 border-2 border-[var(--purple)] border-t-transparent rounded-full animate-spin" />
           <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Assembling Neural Dashboard...</p>
        </div>
      </AppLayout>
    );
  }

  if (!plan || !plan.schedule) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-20 text-center space-y-8">
          <div className="w-20 h-20 rounded-3xl bg-white/5 mx-auto flex items-center justify-center text-[var(--text-muted)]">
            <Layout size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-display font-bold text-[var(--text-primary)]">Schedule <span className="text-[var(--text-secondary)]">Required.</span></h2>
            <p className="text-[var(--text-secondary)] text-lg">Please complete the setup and upload your syllabus to generate a plan.</p>
          </div>
          <button onClick={() => navigate("/onboarding")} className="btn-primary py-4 px-10">Initialize Engine</button>
        </div>
      </AppLayout>
    );
  }

  const currentDayData = plan.schedule[activeDay] || plan.schedule[0];

  return (
    <AppLayout>
      <div className="space-y-12 pb-20 printable-area">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 no-print">
          <div className="space-y-4">
             <div className="badge border-[var(--purple)]/30 text-[var(--purple)]">Active Intelligence Schedule</div>
             <h1 className="text-6xl font-display font-bold tracking-tighter">Study <span className="text-[var(--text-secondary)]">Command.</span></h1>
             <p className="text-[var(--text-secondary)] text-xl font-medium">Synchronized with your {plan.analytics?.studyIntensity || "Beast Mode"} profile.</p>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => navigate("/onboarding")} className="btn-outline border-[var(--purple)]/20 text-[var(--purple)] py-4 px-8 flex items-center gap-2">
               <Zap size={18} /> Redo Setup
             </button>
             <button onClick={handleDownloadPDF} className="btn-outline border-[var(--border)] py-4 px-8 flex items-center gap-2">
               <Download size={18} /> Export PDF
             </button>
             <button onClick={handleDeletePlan} className="btn-outline border-red-500/20 text-red-400 hover:bg-red-500/5 py-4 px-6">
               <Trash2 size={18} />
             </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Timeline / Day Selector */}
          <div className="lg:col-span-3 space-y-6 no-print">
            <div className="flex items-center justify-between px-2">
               <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Timeline</p>
               <Layers size={14} className="text-[var(--text-muted)]" />
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {plan.schedule.map((day, idx) => {
                const isActive = activeDay === idx;
                const isDayDone = progressData[idx]?.percent === 100;
                return (
                  <button 
                    key={idx}
                    onClick={() => setActiveDay(idx)}
                    className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center justify-between group ${
                      isActive 
                      ? "bg-[var(--purple)] border-[var(--purple)] text-white shadow-xl shadow-[var(--purple)]/10" 
                      : "bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--purple)]/30"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-black uppercase tracking-tighter">Day {idx + 1}</p>
                      <p className={`text-[10px] mt-0.5 ${isActive ? 'text-white/70' : 'text-[var(--text-muted)]'}`}>
                        {day.label || `Phase ${Math.floor(idx/3) + 1}`}
                      </p>
                    </div>
                    {isDayDone && <CheckCircle2 size={16} className={isActive ? "text-white" : "text-[var(--green)]"} />}
                    {isActive && !isDayDone && <ChevronRight size={16} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day Detail & Tasks */}
          <div className="lg:col-span-6 space-y-8">
             <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[40px] p-10 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 text-[120px] font-black text-white/5 pointer-events-none italic">
                   {activeDay + 1}
                </div>
                
                <div className="space-y-2 relative z-10">
                   <h2 className="text-3xl font-display font-bold text-[var(--text-primary)]">
                      {currentDayData.label || `Day ${activeDay + 1} Operations`}
                   </h2>
                </div>

                <div className="space-y-4 relative z-10">
                   {currentDayData.tasks?.map((task, tidx) => {
                     const id = `task-${activeDay}-${tidx}`;
                     const isDone = completedTasks.includes(id);
                     return (
                       <motion.div 
                        key={tidx}
                        layout
                        onClick={() => toggleTask(id)}
                        className={`p-6 rounded-3xl border transition-all cursor-pointer flex items-center justify-between group/task ${
                          isDone 
                          ? "bg-[var(--green)]/5 border-[var(--green)]/20 opacity-60" 
                          : "bg-[var(--bg-surface)] border-[var(--border)] hover:border-[var(--purple)]/40 hover:bg-[var(--bg-card)]"
                        }`}
                       >
                          <div className="flex items-center gap-6">
                             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                               isDone ? "bg-[var(--green)] text-black" : "bg-white/5 text-[var(--text-secondary)] group-hover/task:bg-[var(--purple)] group-hover/task:text-white"
                             }`}>
                                {isDone ? <CheckCircle2 size={24} /> : <span className="text-[10px] font-black">{task.time}:00</span>}
                             </div>
                             <div>
                                <h4 className={`text-lg font-bold ${isDone ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                                   {task.task}
                                </h4>
                                <div className="flex items-center gap-3 mt-1">
                                   <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--purple)]">{task.type || 'Deep Dive'}</span>
                                   <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">|</span>
                                   <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{task.duration}</span>
                                </div>
                             </div>
                          </div>
                          {!isDone && <div className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center group-hover/task:border-[var(--purple)] transition-all">
                             <ChevronRight size={14} className="text-[var(--text-muted)] group-hover/task:text-[var(--purple)]" />
                          </div>}
                       </motion.div>
                     );
                   })}
                </div>
             </div>
          </div>

          {/* Analytics Sidebar */}
          <div className="lg:col-span-3 space-y-8 no-print">
             <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[32px] p-8 space-y-6">
                <div className="flex items-center justify-between">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Progress Curve</p>
                   <BarChart3 size={14} className="text-[var(--text-muted)]" />
                </div>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={progressData.slice(0, 7)}>
                      <Bar dataKey="percent" radius={[4, 4, 0, 0]}>
                        {progressData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.percent === 100 ? 'var(--green)' : 'var(--purple)'} fillOpacity={0.6} />
                        ))}
                      </Bar>
                      <XAxis dataKey="name" hide />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '10px' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                   <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)] font-medium">Tasks Completed</span>
                      <span className="font-bold">{completedTasks.length} / {progressData.reduce((acc, d) => acc + d.total, 0)}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)] font-medium">Velocity</span>
                      <span className="font-bold text-[var(--green)]">Steady</span>
                   </div>
                </div>
             </div>
           </div>
         </div>
 
         <style dangerouslySetInnerHTML={{ __html: `
           @media print {
             .no-print { display: none !important; }
             .printable-area { background: white !important; color: black !important; padding: 0 !important; }
             .bg-[var(--bg-secondary)], .bg-[var(--bg-surface)] { background: transparent !important; border: 1px solid #eee !important; }
             .text-[var(--text-primary)], .text-[var(--text-secondary)] { color: black !important; }
             .text-[var(--purple)] { color: #af52de !important; }
             .rounded-[40px], .rounded-[32px] { border-radius: 12px !important; }
             body { background: white !important; }
             header, .badge { margin-bottom: 20px !important; }
             .btn-outline, .btn-primary { display: none !important; }
           }
         `}} />
       </div>
     </AppLayout>
   );
 };
 
 export default StudyPlan;

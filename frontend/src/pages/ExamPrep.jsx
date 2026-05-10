import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Target, TrendingUp, Sparkles, 
  Brain, CheckCircle2, Loader2,
  ShieldCheck, Clock, ArrowRight, Trash2
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { useAuth } from "../context/AuthContext.jsx";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { deleteObjective } from "../firebase/firestore";

const ExamPrep = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    const unsubscribe = onSnapshot(doc(db, "users", user.uid, "examPrepPlan", "current"), (snapshot) => {
      if (snapshot.exists()) {
        const planData = snapshot.data();
        if (planData.phases && typeof planData.phases === 'string') {
          try { planData.phases = JSON.parse(planData.phases); } catch (e) {}
        }
        if (planData.StrategicPhases && typeof planData.StrategicPhases === 'string') {
          try { planData.StrategicPhases = JSON.parse(planData.StrategicPhases); } catch (e) {}
        }
        setPlan(planData);
        setLoading(false);
      } else {
        const localPlan = localStorage.getItem(`examPrepPlan_${user.uid}`);
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

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete your strategic path and onboarding data?")) return;
    try {
      setLoading(true);
      await deleteObjective(user.uid);
      toast.success("Strategy Deleted");
      navigate("/onboarding");
    } catch (err) {
      toast.error("Delete failed");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-48 space-y-4">
           <Loader2 className="animate-spin text-[var(--accent)]" size={40} />
           <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Accessing Neural Strategy...</p>
        </div>
      </AppLayout>
    );
  }

  // Simplified Strategy UI
  const phases = plan?.phases || plan?.StrategicPhases || [];

  if (phases.length === 0) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-20 text-center space-y-8">
          <div className="w-20 h-20 rounded-3xl bg-white/5 mx-auto flex items-center justify-center text-[var(--text-muted)]">
            <ShieldCheck size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-display font-bold">Strategy <span className="text-[var(--text-secondary)]">Pending.</span></h2>
            <p className="text-[var(--text-secondary)] text-lg">Your long-term roadmap will appear here once setup is complete.</p>
          </div>
          <button onClick={() => navigate("/onboarding")} className="btn-primary py-4 px-10">Initialize Setup</button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
             <div className="badge border-[var(--purple)]/30 text-[var(--purple)]">Neural Roadmap</div>
             <h1 className="text-5xl font-display font-bold">Strategic <span className="text-[var(--text-secondary)]">Path.</span></h1>
             <p className="text-[var(--text-secondary)] font-medium text-lg">Granular pillars for your upcoming examination.</p>
          </div>
          <button onClick={handleDelete} className="btn-outline border-red-500/30 text-red-400 hover:bg-red-500/10 py-3 px-8 shadow-2xl flex items-center gap-2">
            <Trash2 size={16} /> Delete Strategy
          </button>
        </header>

        {/* Small, Compact Grid of Phases */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {phases.map((phase, i) => (
             <motion.div 
               key={i}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.05 }}
               className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[32px] p-6 space-y-4 hover:border-[var(--purple)]/30 transition-all group"
             >
                <div className="flex justify-between items-start">
                   <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[var(--purple)]">
                      <Sparkles size={18} />
                   </div>
                   <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{phase.duration || `Phase ${i+1}`}</span>
                </div>
                <div className="space-y-1">
                   <h3 className="text-lg font-bold group-hover:text-[var(--purple)] transition-colors">{phase.name || phase.title}</h3>
                   <p className="text-xs text-[var(--text-muted)] line-clamp-2">{phase.goal || phase.description}</p>
                </div>
                <div className="pt-4 border-t border-[var(--border)]">
                   <ul className="space-y-2">
                      {(phase.milestones || []).slice(0, 2).map((m, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-[10px] font-medium text-[var(--text-secondary)]">
                           <CheckCircle2 size={10} className="text-[var(--green)]" /> {m}
                        </li>
                      ))}
                   </ul>
                </div>
             </motion.div>
           ))}
        </div>


      </div>
    </AppLayout>
  );
};

export default ExamPrep;

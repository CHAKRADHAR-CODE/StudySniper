import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Brain, Clock, Target, TrendingUp, Calendar, 
  ArrowRight, Sparkles, BookOpen, CheckCircle2,
  FileQuestion, Trash2
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { useAuth } from "../context/AuthContext.jsx";
import { getProgress, getStudyPlan, toggleTaskCompletion, getOnboardingData, deleteObjective, getAIAnalyses } from "../firebase/firestore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const StatCard = ({ icon: Icon, label, value, color, trend }) => (
  <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-3xl p-8 relative overflow-hidden group hover:border-[var(--border-hover)] transition-all">
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 group-hover:opacity-10 transition-opacity`} style={{ backgroundColor: color }} />
    <div className="flex justify-between items-start relative z-10">
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
        <Icon size={22} className="text-[var(--text-secondary)]" />
      </div>
      {trend && value !== "0" && value !== "0%" && value !== "Null" && (
        <span className="text-[10px] font-bold text-[var(--green)] uppercase tracking-widest flex items-center gap-1">
          <TrendingUp size={12} /> {trend}
        </span>
      )}
    </div>
    <div className="mt-8 relative z-10">
      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{label}</p>
      <h3 className="text-4xl font-display font-bold mt-2">{value}</h3>
    </div>
  </div>
);

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    preparedness: 0,
    studyHours: 0,
    streak: 0,
    topicsCovered: 0
  });
  const [currentPlan, setCurrentPlan] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [pdfCount, setPdfCount] = useState(0);

  const [completedTasks, setCompletedTasks] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        let prog = null;
        let plan = null;
        let onboard = null;
        let analyses = [];

        try {
          [prog, plan, onboard, analyses] = await Promise.all([
            getProgress(user.uid),
            getStudyPlan(user.uid),
            getOnboardingData(user.uid),
            getAIAnalyses(user.uid)
          ]);
        } catch (dbErr) {
          console.warn("Firestore fetch failed on dashboard, checking local storage...", dbErr);
        }

        // Fallbacks
        if (!prog) {
          const localProg = localStorage.getItem(`progress_${user.uid}`);
          if (localProg) prog = JSON.parse(localProg);
        }
        if (!plan) {
          const localPlan = localStorage.getItem(`studyPlan_${user.uid}`);
          if (localPlan) plan = JSON.parse(localPlan);
        }
        if (!onboard) {
          const localOnboard = localStorage.getItem(`onboarding_${user.uid}`);
          if (localOnboard) onboard = JSON.parse(localOnboard);
        }

        if (prog) {
          setStats(prog);
          setCompletedTasks(prog.completedTasks || []);
        }
        if (plan) {
          // Parse stringified schedule if it exists
          if (typeof plan.schedule === 'string') {
            try {
              plan.schedule = JSON.parse(plan.schedule);
            } catch (e) {
              console.error("Failed to parse dashboard plan JSON");
            }
          }
          setCurrentPlan(plan);
        }
        if (onboard) setOnboarding(onboard);
        if (analyses) setPdfCount(analyses.length);
      } catch (err) {
        console.error("Dashboard data load failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  const toggleTask = async (taskId) => {
    const isDone = completedTasks.includes(taskId);
    // Optimistic Update
    setCompletedTasks(prev => 
      isDone ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
    try {
      await toggleTaskCompletion(user.uid, taskId, !isDone);
    } catch (err) {
      toast.error("Sync failed");
    }
  };

  const handleDeleteObjective = async () => {
    if (!window.confirm("Are you sure you want to delete this objective and prep plan?")) return;
    try {
      await deleteObjective(user.uid);
      setOnboarding(null);
      setCurrentPlan(null);
      setCompletedTasks([]);
      setStats({ preparedness: 0, studyHours: 0, streak: 0, topicsCovered: 0 });
      toast.success("Objective deleted successfully.");
    } catch (err) {
      toast.error("Failed to delete objective.");
    }
  };

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  
  useEffect(() => {
    if (!onboarding?.examDate) return;
    
    const timer = setInterval(() => {
      const examTime = onboarding.examTime || "09:00";
      const target = new Date(`${onboarding.examDate}T${examTime}`);
      const now = new Date();
      const diff = target - now;
      
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0 });
        clearInterval(timer);
        return;
      }
      
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        mins: Math.floor((diff / (1000 * 60)) % 60),
        secs: Math.floor((diff / 1000) % 60)
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [onboarding]);

  // Extract today's tasks from plan if available
  const todayTasks = currentPlan?.schedule?.[0]?.tasks || [];
  
  // Real-time calculations
  const totalTasks = currentPlan?.schedule?.reduce((acc, day) => acc + (day.tasks?.length || 0), 0) || 0;
  const prepPercentage = currentPlan && totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  
  let calculatedStudyHours = 0;
  let calculatedStreak = 0;

  if (currentPlan?.schedule) {
    let streakCount = 0;
    for (let d = 0; d < currentPlan.schedule.length; d++) {
      const day = currentPlan.schedule[d];
      let dayCompleted = true;
      if (day.tasks && day.tasks.length > 0) {
        day.tasks.forEach((task, tIdx) => {
           const tId = `task-${d}-${tIdx}`;
           if (completedTasks.includes(tId)) {
             const durationStr = String(task.duration || "0h").toLowerCase();
             let totalHrs = 0;
             if (durationStr.includes("h") && durationStr.includes("m")) {
                const parts = durationStr.split("h");
                const h = parseFloat(parts[0].replace(/[^\d.]/g, '')) || 0;
                const m = parseFloat(parts[1].replace(/[^\d.]/g, '')) || 0;
                totalHrs = h + (m / 60);
             } else if (durationStr.includes("m") && !durationStr.includes("h")) {
                const m = parseFloat(durationStr.replace(/[^\d.]/g, '')) || 0;
                totalHrs = m / 60;
             } else {
                const h = parseFloat(durationStr.replace(/[^\d.]/g, '')) || 0;
                totalHrs = h;
             }
             calculatedStudyHours += totalHrs;
           } else {
             dayCompleted = false;
           }
        });
      } else {
        dayCompleted = false;
      }
      if (dayCompleted) {
        streakCount++;
      } else {
        break;
      }
    }
    calculatedStreak = streakCount;
  }
  
  calculatedStudyHours = Math.round(calculatedStudyHours * 10) / 10;

  return (
    <AppLayout>
      <div className="space-y-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="badge border-[var(--accent)]/30 text-[var(--accent)]">System Active</div>
            <h1 className="text-5xl font-display font-bold tracking-tight">
              Welcome back, <span className="text-[var(--text-secondary)]">{profile?.displayName?.split(' ')[0] || "Scholar"}</span>
            </h1>
            <p className="text-[var(--text-secondary)] font-medium text-lg">
              {currentPlan && prepPercentage > 0 
                ? `Your academic schedule is currently ${prepPercentage}% complete.`
                : "Initialize your first analysis to begin tracking performance."}
            </p>
          </div>
          <button onClick={() => navigate("/onboarding")} className="btn-primary py-4 px-10 shadow-2xl">
            Quick Analysis <Sparkles size={18} />
          </button>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={Brain} label="Preparedness" value={currentPlan ? `${prepPercentage}%` : "Null"} color="var(--purple)" trend={currentPlan ? "+0%" : null} />
          <StatCard icon={Clock} label="Study Hours" value={currentPlan ? `${calculatedStudyHours}h` : "Null"} color="var(--blue)" trend={currentPlan && calculatedStudyHours > 0 ? "+1h" : null} />
          <StatCard icon={Target} label="Current Streak" value={currentPlan ? `${calculatedStreak}d` : "Null"} color="var(--green)" />
          <StatCard icon={BookOpen} label="PDFs Analyzed" value={pdfCount} color="var(--amber)" />
        </div>

        {/* Exam Intelligence Card */}
        {onboarding && currentPlan && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[var(--purple)]/10 via-transparent to-[var(--blue)]/10 border border-[var(--purple)]/20 rounded-[40px] p-10 flex flex-col md:flex-row items-center gap-10 shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-grid opacity-5" />
            <div className="w-20 h-20 rounded-3xl bg-[var(--purple)]/20 border border-[var(--purple)]/30 flex items-center justify-center text-[var(--purple)] relative z-10">
               <Target size={40} />
            </div>
            <div className="flex-1 space-y-2 relative z-10">
               <div className="flex justify-between items-start">
                  <div className="badge border-[var(--purple)]/30 text-[var(--purple)]">Active Objective</div>
                  <button 
                    onClick={handleDeleteObjective}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete Objective"
                  >
                     <Trash2 size={18} />
                  </button>
               </div>
               <h2 className="text-4xl font-display font-bold">{onboarding.examName}</h2>
               <p className="text-[var(--text-secondary)] font-medium">Preparedness sequence active for {onboarding.subjects?.length} subjects.</p>
            </div>
            <div className="text-center md:text-right relative z-10">
               <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Countdown to Exam</p>
               <div className="flex gap-4 justify-center md:justify-end">
                  <div className="text-center">
                    <p className="text-4xl font-display font-bold text-[var(--text-primary)]">{timeLeft.days}</p>
                    <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Days</p>
                  </div>
                  <div className="text-center">
                    <p className="text-4xl font-display font-bold text-[var(--text-primary)]">{String(timeLeft.hours).padStart(2, '0')}</p>
                    <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Hrs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-4xl font-display font-bold text-[var(--text-primary)]">{String(timeLeft.mins).padStart(2, '0')}</p>
                    <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Min</p>
                  </div>
                  <div className="text-center">
                    <p className="text-4xl font-display font-bold text-[var(--purple)]">{String(timeLeft.secs).padStart(2, '0')}</p>
                    <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Sec</p>
                  </div>
               </div>
            </div>
          </motion.div>
        )}

        {/* Main Grid */}
        <div className="space-y-6">
          {/* Active Schedule */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-display font-bold flex items-center gap-3 text-[var(--text-primary)]">
                <Calendar className="text-[var(--text-secondary)]" size={20} />
                Daily Neural Path
              </h3>
              {todayTasks.length > 0 && <button onClick={() => navigate("/study-plan")} className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">View All</button>}
            </div>
            
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[32px] overflow-hidden min-h-[300px] flex flex-col shadow-2xl">
               {todayTasks.length > 0 ? (
                 todayTasks.map((item, i) => {
                   const taskId = `task-0-${i}`; // Match StudyPlan's indexing for Day 1
                   const isDone = completedTasks.includes(taskId);
                   return (
                     <div 
                       key={i} 
                       onClick={() => toggleTask(taskId)}
                        className={`p-8 flex items-center gap-8 border-b border-[var(--border)] last:border-0 transition-all cursor-pointer group ${isDone ? 'bg-[var(--green)]/5' : i === 0 ? 'bg-[var(--bg-surface)] shadow-inner' : 'hover:bg-[var(--bg-surface)]/50'}`}
                     >
                        <div className={`text-[10px] font-bold uppercase tracking-widest w-20 transition-colors ${isDone ? 'text-[var(--green)]' : 'text-[var(--text-muted)]'}`}>
                          {item.time || (isDone ? "DONE" : "Slot " + (i+1))}
                        </div>
                         <div className="flex-1">
                            <p className={`font-bold transition-all ${isDone ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>{item.task || item.topic}</p>
                            <p className="text-[10px] text-[var(--text-muted)] font-bold mt-1 uppercase tracking-widest">{item.duration || "Session"}</p>
                         </div>
                        <div className="flex items-center justify-center">
                           {isDone ? (
                             <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[var(--green)]">
                               <CheckCircle2 size={24} />
                             </motion.div>
                           ) : (
                             <div className="w-6 h-6 rounded-full border border-[var(--border)] group-hover:border-[var(--accent)] transition-colors" />
                           )}
                        </div>
                     </div>
                   );
                 })
               ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
                     <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
                        <FileQuestion size={24} />
                     </div>
                    <div className="space-y-2">
                       <p className="font-bold text-xl">No active schedule</p>
                       <p className="text-sm text-[var(--text-muted)] max-w-xs">Upload a syllabus to generate your AI-optimized study path.</p>
                    </div>
                    <button onClick={() => navigate("/onboarding")} className="btn-outline py-2 px-6 text-xs">Configure your Arsenal</button>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;

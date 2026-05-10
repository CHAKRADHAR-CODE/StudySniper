import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { logoutUser } from "../../firebase/auth";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Upload, Calendar, Zap, LogOut, Menu, X, Target, Sparkles, Moon, Sun, ChevronRight, ShieldCheck
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext.jsx";
import Logo from "../common/Logo";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { to: "/study-plan", icon: Calendar, label: "Schedule" },
  { to: "/exam-prep", icon: ShieldCheck, label: "Strategy" },
  { to: "/upload", icon: Upload, label: "Analyze" },
  { to: "/question-bank", icon: Target, label: "Question Bank" },
  { to: "/cheatsheets", icon: Zap, label: "Cheat Sheets" },
  { to: "/onboarding", icon: Target, label: "Setup" },
];

const Sidebar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast.success("Intelligence Sync Terminated");
      navigate("/");
    } catch {
      toast.error("Logout failed");
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full py-8 px-6">
      {/* Brand */}
      <div className="mb-12 px-2">
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-10 h-10 flex items-center justify-center transition-transform duration-500 group-hover:rotate-90">
            <Logo className="w-full h-full text-[var(--text-primary)]" />
          </div>
          <div className="font-display text-2xl tracking-tighter uppercase leading-none">
            <span className="font-black text-[var(--text-primary)]">STUDY</span>
            <span className="font-light text-[var(--text-secondary)]"> SNIPER</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between px-4 py-4 rounded-2xl text-sm font-bold transition-all ${
                isActive
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hover)] shadow-xl"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/50"
              }`
            }
          >
            <div className="flex items-center gap-3">
              <Icon size={18} />
              <span>{label}</span>
            </div>
            <ChevronRight size={14} className="opacity-20" />
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto space-y-4 pt-6 border-t border-[var(--border)]">
        {/* Theme Toggle */}
        <div className="p-1 bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] flex items-center">
           <button 
             onClick={() => theme === 'light' && toggleTheme()}
             className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-lg border border-[var(--border)]' : 'text-[var(--text-muted)]'}`}
           >
             <Moon size={14} /> Dark
           </button>
           <button 
             onClick={() => theme === 'dark' && toggleTheme()}
             className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${theme === 'light' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-lg border border-[var(--border)]' : 'text-[var(--text-muted)]'}`}
           >
             <Sun size={14} /> Light
           </button>
        </div>

        {/* Profile */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--purple)] to-[var(--blue)] flex items-center justify-center text-xs font-bold text-white shadow-xl">
            {(profile?.displayName || user?.email || "U")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">{profile?.displayName || "Scholar"}</p>
            <p className="text-[10px] text-[var(--text-muted)] truncate font-bold uppercase tracking-tight">{user?.email?.split('@')[0]}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-[var(--red)] hover:bg-[var(--red)]/10 border border-transparent hover:border-[var(--red)]/20 transition-all"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        className="lg:hidden fixed top-6 right-6 z-[60] w-12 h-12 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl flex items-center justify-center shadow-2xl"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-md"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed top-0 left-0 h-full z-50 bg-[var(--bg-primary)] border-r border-[var(--border)] transition-all duration-500 ease-out ${
          mobileOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0 w-72"
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;

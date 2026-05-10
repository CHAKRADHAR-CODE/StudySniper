import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

/**
 * PremiumButton: A cinematic, high-fidelity button component
 * designed to maintain its aesthetic during loading states.
 */
const PremiumButton = ({ 
  onClick, 
  loading, 
  children, 
  className = "", 
  type = "submit",
  disabled = false,
  icon: Icon = null
}) => {
  return (
    <motion.button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98, y: 0 }}
      className={`
        relative group w-full py-4 rounded-2xl font-bold text-sm tracking-tight
        overflow-hidden transition-all duration-500
        ${loading ? 'cursor-wait' : 'cursor-pointer'}
        bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.1)]
        hover:shadow-[0_0_60px_rgba(255,255,255,0.2)]
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-3
        ${className}
      `}
    >
      {/* Cinematic Shine Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none" />
      
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3"
          >
            <Loader2 className="animate-spin" size={18} />
            <span className="uppercase text-[10px] tracking-[2px] font-black">{children}</span>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3"
          >
            <span className="uppercase text-[10px] tracking-[2px] font-black">{children}</span>
            {Icon && <Icon size={18} className="group-hover:translate-x-1 transition-transform" />}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default PremiumButton;

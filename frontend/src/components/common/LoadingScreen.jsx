// src/components/common/LoadingScreen.jsx
import React, { useEffect, useState } from "react";
import Logo from "./Logo";

const LoadingScreen = ({ message = "Loading..." }) => {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center z-50">
      {/* Background orbs */}
      <div className="orb orb-purple w-96 h-96 -top-20 -left-20 opacity-30" />
      <div className="orb orb-blue w-80 h-80 bottom-20 right-20 opacity-20" />

      {/* Logo */}
      <div className="relative mb-8 animate-pulse">
        <div className="w-24 h-24 flex items-center justify-center">
          <Logo className="w-full h-full text-white" />
        </div>
      </div>

      {/* Brand */}
      <div className="font-display text-3xl tracking-tighter uppercase mb-2">
        <span className="font-black text-white">STUDY</span>
        <span className="font-light text-zinc-400"> SNIPER</span>
      </div>
      <p className="text-zinc-500 text-sm font-body mb-8">AI-Powered Exam Prep</p>

      {/* Loading bar */}
      <div className="w-48 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 rounded-full animate-shimmer"
          style={{
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s linear infinite",
          }}
        />
      </div>

      <p className="text-zinc-600 text-xs mt-4 font-mono">
        {message}{dots}
      </p>
    </div>
  );
};

export default LoadingScreen;

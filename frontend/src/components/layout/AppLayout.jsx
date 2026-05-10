import React from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "../../context/AuthContext.jsx";
import LoadingScreen from "../common/LoadingScreen";

const AppLayout = ({ children }) => {
  const { loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-500">
      {/* Sidebar - Fixed width on desktop */}
      <div className="hidden lg:block w-72 flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar is absolute/fixed inside Sidebar component */}
      <div className="lg:hidden">
        <Sidebar />
      </div>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col relative">
        {/* Grid Overlay for Premium Feel */}
        <div className="fixed inset-0 bg-grid opacity-10 pointer-events-none" />
        
        {/* Gradient Orbs for internal pages too */}
        <div className="orb orb-purple w-[800px] h-[800px] -top-96 -right-96 opacity-10" />
        <div className="orb orb-blue w-[600px] h-[600px] bottom-0 -left-96 opacity-5" />

        <div className="relative z-10 p-8 lg:p-12 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;

import React from "react";

const Logo = ({ className = "w-10 h-10", ...props }) => {
  return (
    <img 
      src="/logo.jpeg" 
      alt="StudySniper Logo" 
      className={`${className} object-contain logo-themed transition-all duration-300`} 
      style={{
        filter: 'var(--logo-filter, none)'
      }}
      {...props} 
    />
  );
};

export default Logo;

// src/components/shared/QuadraLogo.jsx
// Logo oficial de Quadra Finances
import React from 'react';

export const QuadraLogo = ({ isDarkMode = false, className = "", size = 36 }) => {
  const purpleColor = isDarkMode ? "#B39DDB" : "#4A148C";
  const viewBox = "0 0 100 100";
  
  return (
    <svg
      viewBox={viewBox}
      className={`quadra-logo ${className}`}
      style={{ 
        width: size, 
        height: size, 
        display: 'inline-block',
        flexShrink: 0,
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g 
        stroke={purpleColor} 
        strokeWidth="6" 
        fill="none" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <rect x="20" y="20" width="24" height="24" rx="4" />
        <rect x="56" y="56" width="24" height="24" rx="4" />
        <path d="M 44 32 L 68 32 L 68 56" />
        <path d="M 56 68 L 32 68 L 32 44" />
      </g>
    </svg>
  );
};

export default QuadraLogo;
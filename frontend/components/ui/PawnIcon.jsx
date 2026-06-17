import React from 'react';

export default function PawnIcon({ color, className }) {
  const safeColorId = color ? 'pawn-' + color.replace('#', '') : 'default';
  console.log("PawnIcon render - color:", color, "safeColorId:", safeColorId);

  
  return (
    <svg 
      viewBox="0 0 100 120" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Glossy Highlight for Body */}
        <linearGradient id={`glossy-body-${safeColorId}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="black" stopOpacity="0.5" />
          <stop offset="15%" stopColor="black" stopOpacity="0.1" />
          <stop offset="30%" stopColor="white" stopOpacity="0.8" />
          <stop offset="45%" stopColor="white" stopOpacity="0.1" />
          <stop offset="80%" stopColor="black" stopOpacity="0.4" />
          <stop offset="100%" stopColor="black" stopOpacity="0.7" />
        </linearGradient>

        {/* Glossy Highlight for Head */}
        <radialGradient id={`glossy-head-${safeColorId}`} cx="35%" cy="30%" r="60%">
          <stop offset="0%" stopColor="white" stopOpacity="0.9" />
          <stop offset="25%" stopColor="white" stopOpacity="0.3" />
          <stop offset="70%" stopColor="black" stopOpacity="0.3" />
          <stop offset="100%" stopColor="black" stopOpacity="0.7" />
        </radialGradient>
        
        <filter id={`shadow-${safeColorId}`}>
          <feDropShadow dx="0" dy="8" stdDeviation="4" floodOpacity="0.4"/>
        </filter>
      </defs>

      <g className="drop-shadow-md">
        {/* Flared Body Cone */}
        <path 
          d="M 36 40 C 36 70, 25 85, 15 100 L 85 100 C 75 85, 64 70, 64 40 Z" 
          fill={color} 
        />
        
        {/* Base Rounded Bottom (3D floor perspective) */}
        <ellipse cx="50" cy="100" rx="35" ry="10" fill={color} />
        <path d="M 15 100 C 15 113, 85 113, 85 100" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="2" />

        {/* Head Sphere */}
        <circle cx="50" cy="26" r="22" fill={color} />
      </g>
    </svg>
  );
}

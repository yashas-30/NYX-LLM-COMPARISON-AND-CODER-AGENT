import React from 'react';
import Lottie from 'lottie-react';
import birdAnimation from './bird.json';

/**
 * NYX - Custom Icons & Logos
 */

export const Logo = React.memo(({ size = 24, className = "" }: { size?: number; className?: string }) => {
  return (
    <div 
      style={{ width: size, height: size }} 
      className={`inline-flex items-center justify-center overflow-hidden ${className}`}
    >
      <Lottie 
        animationData={birdAnimation} 
        loop={true} 
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
});

Logo.displayName = 'Logo';

// Fresh versions of common icons matching SF Symbols weight
export const StudioIcon = React.memo(() => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
  </svg>
));

StudioIcon.displayName = 'StudioIcon';

export const RegistryIcon = React.memo(() => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
  </svg>
));

RegistryIcon.displayName = 'RegistryIcon';

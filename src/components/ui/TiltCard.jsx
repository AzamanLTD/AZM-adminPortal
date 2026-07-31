// src/components/ui/TiltCard.jsx
// Drop-in wrapper that gives any card a subtle 3D perspective tilt on hover.
// Usage: <TiltCard className="az-card p-6">...</TiltCard>

import { useRef, useCallback, useEffect } from 'react';

export default function TiltCard({ children, className = '', intensity = 8, glare = true }) {
  const cardRef = useRef(null);
  const glareRef = useRef(null);
  const rafRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;

      const rotateX = -y * intensity;
      const rotateY =  x * intensity;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02,1.02,1.02)`;

      if (glare && glareRef.current) {
        const glareX = (x + 0.5) * 100;
        const glareY = (y + 0.5) * 100;
        glareRef.current.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.12) 0%, transparent 60%)`;
        glareRef.current.style.opacity = '1';
      }
    });
  }, [intensity, glare]);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (card) {
      card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)`;
    }
    if (glareRef.current) glareRef.current.style.opacity = '0';
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ 
        transition: 'transform 0.1s ease-out',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {glare && (
        <div
          ref={glareRef}
          style={{
            position: 'absolute', inset: 0, opacity: 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none', zIndex: 10,
            borderRadius: 'inherit',
          }}
        />
      )}
      <div style={{ transform: 'translateZ(0)', position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}

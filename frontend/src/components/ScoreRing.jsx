import React from 'react';

export default function ScoreRing({ score = 0, label = 'Match score', size = 132 }) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  const deg = safeScore * 3.6;
  return (
    <div className="score-ring-wrap" style={{ '--ring-size': `${size}px` }}>
      <div className="score-ring" style={{ '--score': `${deg}deg` }}>
        <div className="score-inner"><strong>{safeScore}</strong><span>/100</span></div>
      </div>
      <span className="score-label">{label}</span>
    </div>
  );
}

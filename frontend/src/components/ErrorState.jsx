import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorState({ message = 'We could not complete the analysis.', onRetry }) {
  return (
    <div className="error-state">
      <div className="error-icon"><AlertTriangle size={18} /></div>
      <div><strong>Analysis needs another try</strong><span>{message}</span></div>
      {onRetry && <button type="button" className="soft-btn compact-btn" onClick={onRetry}><RefreshCw size={14} /> Retry</button>}
    </div>
  );
}

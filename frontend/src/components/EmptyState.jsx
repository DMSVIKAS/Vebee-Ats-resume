import React from 'react';
import { Sparkles } from 'lucide-react';

export default function EmptyState({ title = 'Ready when you are', body = 'Upload your resume to generate an evidence-backed analysis.' }) {
  return (
    <div className="empty-state-card">
      <div className="empty-icon"><Sparkles size={20} /></div>
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

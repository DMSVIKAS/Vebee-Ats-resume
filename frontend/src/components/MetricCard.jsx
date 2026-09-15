import React from 'react';
export default function MetricCard({ label, value, hint, tone = '' }) {
  return <div className={`metric-card ${tone}`}><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>;
}

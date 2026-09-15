import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppShell from './components/AppShell';
import Overview from './pages/Overview';
import JDChecker from './pages/JDChecker';
import ResumeScreener from './pages/ResumeScreener';
import ResumeOptimizer from './pages/ResumeOptimizer';
import AISuggester from './pages/AISuggester';

function NotFound(){return <div className="page section"><div className="empty-state large">Page not found. <a href="/">Return to Overview</a></div></div>}
export default function App(){return <AppShell><Routes><Route path="/" element={<Overview/>}/><Route path="/jd-checker" element={<JDChecker/>}/><Route path="/resume-screener" element={<ResumeScreener/>}/><Route path="/resume-optimizer" element={<ResumeOptimizer/>}/><Route path="/ai-suggester" element={<AISuggester/>}/><Route path="*" element={<NotFound/>}/></Routes></AppShell>}

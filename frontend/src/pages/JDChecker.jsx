import React, { useEffect, useMemo, useState } from 'react';

import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Sparkles,
  Target,
  AlertCircle,
} from 'lucide-react';

import Dropzone from '../components/Dropzone';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Tag from '../components/Tag';

import { useVeeBee } from '../context';
import { analyzeJDWithAPI } from '../lib/analysis';


export default function JDChecker() {
  const { resume, setJd } = useVeeBee();

  const [jd, setLocalJd] = useState('');
  const [resumeText, setResumeText] = useState(
    resume?.text || '',
  );

  const [resumeFileName, setResumeFileName] =
    useState(resume?.name || '');

  const [engine, setEngine] = useState('nlp');

  const [status, setStatus] = useState('idle');

  const [error, setError] = useState('');

  const [nlpReport, setNlpReport] = useState(null);
  const [llmReport, setLlmReport] = useState(null);
  const [activeReportEngine, setActiveReportEngine] =
    useState('nlp');


  useEffect(() => {
    if (resume?.text) {
      setResumeText(resume.text);
    }

    if (resume?.name) {
      setResumeFileName(resume.name);
    }

    setNlpReport(null);
    setLlmReport(null);
    setActiveReportEngine('nlp');
    setStatus('idle');
  }, [resume?.text, resume?.name]);


  const handleResumeFile = (file) => {
    setResumeFileName(file?.name || '');
  };


  const handleResumeText = (text) => {
    setResumeText(text || '');

    setNlpReport(null);
    setLlmReport(null);
    setActiveReportEngine('nlp');
    setStatus('idle');

    if (text) {
      setError('');
    }
  };


  const handleJDChange = (event) => {
    const value = event.target.value;

    setLocalJd(value);

    setJd(value);

    setNlpReport(null);
    setLlmReport(null);
    setActiveReportEngine('nlp');
    setStatus('idle');
    setError('');
  };


  const handleEngineChange = (value) => {
    setEngine(value);
    setError('');

    if (value === 'nlp' && nlpReport) {
      setActiveReportEngine('nlp');
      setStatus('result');
      return;
    }

    if (value === 'llm' && llmReport) {
      setActiveReportEngine('llm');
      setStatus('result');
      return;
    }

    if (status === 'error') {
      setStatus('idle');
    }
  };


  const generateReport = async () => {
    if (!resumeText.trim()) {
      setError(
        'Please upload a readable PDF resume first.',
      );

      setStatus('error');

      return;
    }

    if (!jd.trim()) {
      setError(
        'Please paste the complete job description first.',
      );

      setStatus('error');

      return;
    }

    setError('');
    setStatus('loading');

    try {
      const response = await analyzeJDWithAPI({
        resumeText,
        jdText: jd,
        engine,
      });

      if (engine === 'nlp') {
        setNlpReport(response.data);
        setActiveReportEngine('nlp');
      } else {
        setLlmReport(response.data);
        setActiveReportEngine('llm');
      }

      setStatus('result');
    } catch (err) {
      setError(
        err?.message ||
          'Unable to generate the JD analysis report.',
      );

      setStatus('error');
    }
  };


  const resetReport = () => {
    setStatus('idle');
    setError('');
    setNlpReport(null);
    setLlmReport(null);
    setActiveReportEngine('nlp');
  };


  const isReady = useMemo(
    () =>
      Boolean(resumeText.trim()) &&
      Boolean(jd.trim()) &&
      Boolean(engine),
    [resumeText, jd, engine],
  );


  const report =
    activeReportEngine === 'nlp'
      ? nlpReport
      : llmReport;

  const jobDescription =
    report?.job_description || {};

  const resumeProfile =
    report?.resume || {};

  const rawMatching =
    report?.matching || {};

  const llmMatchedSkills = Array.isArray(
    rawMatching?.matched_skills,
  )
    ? rawMatching.matched_skills
    : [];

  const llmMissingSkills = Array.isArray(
    rawMatching?.missing_skills,
  )
    ? rawMatching.missing_skills
    : [];

  const llmSkillTotal =
    llmMatchedSkills.length +
    llmMissingSkills.length;

  const llmSkillScore = llmSkillTotal
    ? Math.round(
        (llmMatchedSkills.length /
          llmSkillTotal) *
          100,
      )
    : null;

    const normalizeLLMStatus = (value) => {
      const status = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
    
      if (
        status === 'match' ||
        status === 'matched' ||
        status === 'strong_match'
      ) {
        return 'matched';
      }
    
      if (
        status === 'partial' ||
        status === 'partial_match' ||
        status === 'moderate' ||
        status === 'moderate_match'
      ) {
        return 'partial';
      }
    
      if (
        status === 'weak_match' ||
        status === 'weak'
      ) {
        return 'weak_match';
      }
    
      if (
        status === 'no_match' ||
        status === 'missing'
      ) {
        return 'missing';
      }
    
      return 'unknown';
    };
    
    
    const scoreLLMStatus = (value) => {
      const status = normalizeLLMStatus(value);
    
      if (status === 'matched') {
        return 100;
      }
    
      if (status === 'partial') {
        return 60;
      }
    
      if (status === 'weak_match') {
        return 30;
      }
    
      if (status === 'missing') {
        return 0;
      }
    
      return null;
    };
    
    
    const matching =
      activeReportEngine === 'llm'
        ? {
            overall_score: rawMatching.overall_score,
    
            role: {
              status: normalizeLLMStatus(
                rawMatching?.role_analysis?.status,
              ),
              score: scoreLLMStatus(
                rawMatching?.role_analysis?.status,
              ),
              reason:
                rawMatching?.role_analysis?.reason || '',
            },
    
            skills: {
              matched: llmMatchedSkills.map((skill) => ({
                skill,
              })),
              missing: llmMissingSkills.map((skill) => ({
                skill,
              })),
              matched_count:
                llmMatchedSkills.length,
              missing_count:
                llmMissingSkills.length,
              jd_skill_count:
                llmSkillTotal,
              skill_match_score:
                llmSkillScore,
            },
    
            experience: {
              status: normalizeLLMStatus(
                rawMatching?.experience_analysis?.status,
              ),
              score: scoreLLMStatus(
                rawMatching?.experience_analysis?.status,
              ),
              reason:
                rawMatching?.experience_analysis?.reason || '',
            },
    
            education: {
              status: normalizeLLMStatus(
                rawMatching?.education_analysis?.status,
              ),
              score: scoreLLMStatus(
                rawMatching?.education_analysis?.status,
              ),
              reason:
                rawMatching?.education_analysis?.reason || '',
            },
          }
        : rawMatching;

  const skillMatch =
    matching?.skills || {};

  const roleMatch =
    matching?.role || {};

  const experienceMatch =
    matching?.experience || {};

  const educationMatch =
    matching?.education || {};


  return (
    <>
      <style>{`
        .report-engine-switch {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px;
          margin-left: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.025);
        }

        .report-engine-switch button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 12px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: inherit;
          opacity: 0.52;
          cursor: pointer;
          font: inherit;
          font-size: 11px;
          transition: opacity 0.2s ease, background 0.2s ease, transform 0.2s ease;
        }

        .report-engine-switch button:hover {
          opacity: 0.82;
        }

        .report-engine-switch button.active {
          opacity: 1;
          background: rgba(130, 165, 255, 0.10);
          transform: translateY(-1px);
        }

        @media (max-width: 900px) {
          .report-engine-switch {
            margin-left: 0;
            margin-top: 10px;
          }
        }
      `}</style>

    <div className="page section">

      {/* ------------------------------------------------ */}
      {/* PAGE HEADER */}
      {/* ------------------------------------------------ */}

      <div className="page-head">

        <div>

          <div className="eyebrow">
            01 · JD CHECKER
          </div>

          <h1>
            Know your fit{' '}
            <span>before you apply.</span>
          </h1>

          <p>
            Analyze a job description against your actual
            resume evidence using the VeeBee NLP engine
            or an NVIDIA NIM.
          </p>

        </div>


        <div className="head-chip">
          <BriefcaseBusiness size={16} />
          JD → Resume Intelligence
        </div>

      </div>


      <div className="workspace two-col">


        {/* ================================================= */}
        {/* LEFT PANEL — INPUTS */}
        {/* ================================================= */}

        <div className="panel input-panel">


          {/* STEP 01 ------------------------------------- */}

          <div className="panel-heading">

            <div>
              <span className="step">
                STEP 01
              </span>

              <h3>
                Upload resume
              </h3>
            </div>

            <span className="muted">
              PDF only
            </span>

          </div>


          <Dropzone
            label="Upload your resume PDF"
            accept=".pdf,application/pdf"
            helper="PDF only"
            onFile={handleResumeFile}
            onText={handleResumeText}
          />


          <div className="resume-text-note">

            {resumeText ? (
              <>
                <CheckCircle2 size={14} />

                <span>
                  {resumeFileName
                    ? `${resumeFileName} · `
                    : ''}

                  {
                    resumeText
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean)
                      .length
                      .toLocaleString()
                  }{' '}
                  words extracted
                </span>
              </>
            ) : (
              <>
                <FileText size={14} />

                <span>
                  Upload a PDF to extract resume evidence.
                </span>
              </>
            )}

          </div>


          {/* STEP 02 ------------------------------------- */}

          <div className="panel-heading sub-heading">

            <div>
              <span className="step">
                STEP 02
              </span>

              <h3>
                Paste job description
              </h3>
            </div>

            <span className="muted">
              Required
            </span>

          </div>


          <textarea
            className="jd-input"
            value={jd}
            onChange={handleJDChange}
            placeholder={`Paste the complete job description here...

Example:

Software Engineer

Requirements:
• 2+ years of experience
• Python
• FastAPI
• PostgreSQL
• AWS
• REST APIs
• Bachelor's degree

Responsibilities:
• Build backend services
• Design scalable APIs
• Work with engineering teams`}
          />


          <div className="input-helper">

            <span>
              {jd.trim()
                ? `${jd
                    .trim()
                    .split(/\s+/)
                    .length.toLocaleString()} words`
                : 'Paste the complete JD for best results'}
            </span>

          </div>


          {/* STEP 03 ------------------------------------- */}

          <div className="panel-heading sub-heading">

            <div>
              <span className="step">
                STEP 03
              </span>

              <h3>
                Choose analysis engine
              </h3>
            </div>

            <span className="muted">
              Select one
            </span>

          </div>


          <div className="engine-options">


            {/* NLP */}

            <button
              type="button"
              className={`engine-card ${
                engine === 'nlp'
                  ? 'selected'
                  : ''
              }`}
              onClick={() =>
                handleEngineChange('nlp')
              }
            >

              <div className="engine-icon">
                <Target size={19} />
              </div>


              <div className="engine-content">

                <strong>
                  VeeBee NLP
                </strong>

                <span>
                  VeeBee's NLP
                </span>

              </div>


              {engine === 'nlp' && (
                <CheckCircle2
                  className="engine-check"
                  size={18}
                />
              )}

            </button>


            {/* LLM */}

            <button
              type="button"
              className={`engine-card ${
                engine === 'llm'
                  ? 'selected'
                  : ''
              }`}
              onClick={() =>
                handleEngineChange('llm')
              }
            >

              <div className="engine-icon">
                <Sparkles size={19} />
              </div>


              <div className="engine-content">

                <strong>
                  NVIDIA NIM
                </strong>

                <span>
                NVIDIA NIM.
                </span>

              </div>


              {engine === 'llm' && (
                <CheckCircle2
                  className="engine-check"
                  size={18}
                />
              )}

            </button>

          </div>


          {/* STEP 04 ------------------------------------- */}

          <div className="panel-heading sub-heading">

            <div>
              <span className="step">
                STEP 04
              </span>

              <h3>
                Generate report
              </h3>
            </div>

            <span className="muted">
              {engine === 'nlp'
                ? 'NLP selected'
                : 'LLM selected'}
            </span>

          </div>


          <div className="analysis-actions">

            <button
              type="button"
              className="gradient-btn full"
              onClick={generateReport}
              disabled={
                status === 'loading' ||
                !isReady
              }
            >

              {status === 'loading'
                ? 'Analyzing...'
                : 'Generate JD Analysis Report'}

              <ArrowRight size={18} />

            </button>


            <span className="tiny-note">

              <Sparkles size={13} />

              JD role, skills, experience,
              education and resume evidence
              will be compared.

            </span>

          </div>


          {error && status === 'error' && (
            <div className="inline-error">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

        </div>


        {/* ================================================= */}
        {/* RIGHT PANEL — REPORT */}
        {/* ================================================= */}

        <div className="panel results-panel">


          <div className="panel-heading">

            <div>

              <span className="step">
                REPORT
              </span>

              <h3>
                JD → Resume analysis
              </h3>

            </div>


            <Tag
              tone={
                status === 'result'
                  ? 'success'
                  : 'default'
              }
            >
              {status === 'result'
                ? activeReportEngine === 'nlp'
                  ? 'NLP GENERATED'
                  : 'NIM GENERATED'
                : 'WAITING'}
            </Tag>

            {nlpReport && llmReport && (
              <div className="report-engine-switch">
                <button
                  type="button"
                  className={
                    activeReportEngine === 'nlp'
                      ? 'active'
                      : ''
                  }
                  onClick={() => {
                    setActiveReportEngine('nlp');
                    setEngine('nlp');
                    setStatus('result');
                    setError('');
                  }}
                >
                  <Target size={14} />
                  VeeBee NLP
                </button>

                <button
                  type="button"
                  className={
                    activeReportEngine === 'llm'
                      ? 'active'
                      : ''
                  }
                  onClick={() => {
                    setActiveReportEngine('llm');
                    setEngine('llm');
                    setStatus('result');
                    setError('');
                  }}
                >
                  <Sparkles size={14} />
                  NVIDIA NIM
                </button>
              </div>
            )}

          </div>


          {/* IDLE ----------------------------------------- */}

          {status === 'idle' && (
            <EmptyState
              title="Your report will appear here"
              body="Upload your resume PDF, paste the job description, choose an analysis engine, and generate the report."
            />
          )}


          {/* LOADING -------------------------------------- */}

          {status === 'loading' && (
            <LoadingState
              title="Building your JD analysis"
              steps={[
                'Reading resume evidence',
                'Analyzing job description',
                'Extracting role and requirements',
                'Detecting dataset-backed skills',
                'Matching resume against JD',
                'Preparing final report',
              ]}
            />
          )}


          {/* ERROR ---------------------------------------- */}

          {status === 'error' && (
            <ErrorState
              onRetry={resetReport}
              message={
                error ||
                'The analysis could not be completed.'
              }
            />
          )}


          {/* RESULT --------------------------------------- */}

          {status === 'result' && report && (
            <div className="jd-report">


              {/* OVERALL SCORE */}

              <div className="jd-score-card">

                <div>

                  <span className="result-label">
                    OVERALL JD MATCH
                  </span>

                  <div className="jd-score-value">
                    {matching.overall_score ?? '—'}
                    <span>%</span>
                  </div>

                </div>


                <div className="jd-score-summary">

                  <strong>
                    {matching.overall_score >= 80
                      ? 'Strong alignment'
                      : matching.overall_score >= 60
                        ? 'Moderate alignment'
                        : 'Needs improvement'}
                  </strong>

                  <span>
                    Based on the available role,
                    skill, experience and education
                    evidence.
                  </span>

                </div>

              </div>


              {/* EXTRACTED JD */}

              <div className="report-section">

                <span className="result-label">
                  JOB DESCRIPTION ANALYSIS
                </span>


                <div className="analysis-grid">

                  <div className="analysis-item">
                    <span>ROLE</span>
                    <strong>
                      {jobDescription.role ||
                        'Not detected'}
                    </strong>
                  </div>


                  <div className="analysis-item">
                    <span>EXPERIENCE</span>
                    <strong>
                      {jobDescription?.experience
                        ?.minimum_years != null
                        ? `${jobDescription.experience.minimum_years}+ years`
                        : 'Not specified'}
                    </strong>
                  </div>


                  <div className="analysis-item">
                    <span>EDUCATION</span>
                    <strong>
                      {jobDescription.education
                        ?.length
                        ? jobDescription.education[0]
                        : 'Not specified'}
                    </strong>
                  </div>

                </div>


                {jobDescription.skills
                  ?.length > 0 && (
                  <div className="report-subsection">

                    <span className="result-label">
                      REQUIRED SKILLS
                    </span>

                    <div className="tag-row">

                      {jobDescription.skills.map(
                        (skill) => (
                          <Tag
                            key={skill}
                          >
                            {skill}
                          </Tag>
                        ),
                      )}

                    </div>

                  </div>
                )}


                {jobDescription.responsibilities
                  ?.length > 0 && (
                  <div className="report-subsection">

                    <span className="result-label">
                      RESPONSIBILITIES
                    </span>

                    <div className="responsibility-list">

                      {jobDescription.responsibilities
                        .slice(0, 8)
                        .map(
                          (item) => (
                            <div
                              className="responsibility-item"
                              key={item}
                            >
                              <ArrowRight
                                size={14}
                              />
                              <span>
                                {item}
                              </span>
                            </div>
                          ),
                        )}

                    </div>

                  </div>
                )}

              </div>


              {/* RESUME */}

              <div className="report-section">

                <span className="result-label">
                  RESUME ANALYSIS
                </span>


                <div className="analysis-grid">

                  <div className="analysis-item">
                    <span>NAME</span>
                    <strong>
                      {resumeProfile.name ||
                        'Not detected'}
                    </strong>
                  </div>


                  <div className="analysis-item">
                    <span>EXPERIENCE</span>
                    <strong>
                      {resumeProfile.experience_years != null
                        ? `${resumeProfile.experience_years} years`
                        : 'Not detected'}
                    </strong>
                  </div>

                </div>


                {resumeProfile.skills
                  ?.length > 0 && (
                  <div className="report-subsection">

                    <span className="result-label">
                      DETECTED RESUME SKILLS
                    </span>

                    <div className="tag-row">

                      {resumeProfile.skills.map(
                        (skill) => (
                          <Tag
                            tone="success"
                            key={skill}
                          >
                            {skill}
                          </Tag>
                        ),
                      )}

                    </div>

                  </div>
                )}

              </div>


              {/* MATCH BREAKDOWN */}

              <div className="report-section">

                <span className="result-label">
                  MATCH BREAKDOWN
                </span>


                <div className="breakdown-grid">


                  <div className="breakdown-card">

                    <span>
                      ROLE ALIGNMENT
                    </span>

                    <strong>
                      {roleMatch.score != null
                        ? `${roleMatch.score}%`
                        : 'Unknown'}
                    </strong>

                    <Tag
                      tone={
                        roleMatch.status ===
                        'matched'
                          ? 'success'
                          : 'default'
                      }
                    >
                      {roleMatch.status}
                    </Tag>

                  </div>


                  <div className="breakdown-card">

                    <span>
                      SKILL ALIGNMENT
                    </span>

                    <strong>
                      {skillMatch.skill_match_score != null
                        ? `${skillMatch.skill_match_score}%`
                        : 'Unknown'}
                    </strong>

                    <Tag
                      tone={
                        skillMatch.missing_count === 0
                          ? 'success'
                          : 'default'
                      }
                    >
                      {skillMatch.matched_count || 0}
                      {' matched'}
                    </Tag>

                  </div>


                  <div className="breakdown-card">

                    <span>
                      EXPERIENCE
                    </span>

                    <strong>
                      {experienceMatch.score != null
                        ? `${experienceMatch.score}%`
                        : 'Unknown'}
                    </strong>

                    <Tag
                      tone={
                        experienceMatch.status ===
                        'matched'
                          ? 'success'
                          : 'default'
                      }
                    >
                      {experienceMatch.status}
                    </Tag>

                  </div>


                  <div className="breakdown-card">

                    <span>
                      EDUCATION
                    </span>

                    <strong>
                      {educationMatch.score != null
                        ? `${educationMatch.score}%`
                        : 'Unknown'}
                    </strong>

                    <Tag
                      tone={
                        educationMatch.status ===
                        'matched'
                          ? 'success'
                          : 'default'
                      }
                    >
                      {educationMatch.status}
                    </Tag>

                  </div>

                </div>

              </div>


              {/* MATCHED SKILLS */}

              {skillMatch.matched?.length > 0 && (
                <div className="report-section">

                  <span className="result-label">
                    MATCHED REQUIREMENTS
                  </span>


                  <div className="evidence-list">

                    {skillMatch.matched.map(
                      (item) => (
                        <div
                          className="evidence-row"
                          key={item.skill}
                        >

                          <CheckCircle2
                            size={15}
                          />

                          <div>

                            <strong>
                              {item.skill}
                            </strong>

                            <span>
                              Evidence detected
                              in the resume.
                            </span>

                          </div>

                        </div>
                      ),
                    )}

                  </div>

                </div>
              )}


              {/* MISSING */}

              {skillMatch.missing?.length > 0 && (
                <div className="report-section">

                  <span className="result-label">
                    MISSING / NOT FOUND
                  </span>


                  <div className="evidence-list">

                    {skillMatch.missing.map(
                      (item) => (
                        <div
                          className="evidence-row warning-row"
                          key={item.skill}
                        >

                          <AlertCircle
                            size={15}
                          />

                          <div>

                            <strong>
                              {item.skill}
                            </strong>

                            <span>
                              No direct evidence
                              detected in the
                              resume.
                            </span>

                          </div>

                        </div>
                      ),
                    )}

                  </div>

                </div>
              )}


              {/* RECOMMENDATION */}

              <div className="report-insight">

                <div>

                  <span className="result-label">
                    NEXT MOVE
                  </span>

                  <strong>
                    {skillMatch.missing?.length
                      ? `Review ${skillMatch.missing
                          .slice(0, 2)
                          .map(
                            (item) =>
                              item.skill,
                          )
                          .join(' and ')} evidence before applying.`
                      : 'Your detected resume evidence aligns well with the analyzed JD.'}
                  </strong>

                  <p>
                    Use the Resume Optimizer after this
                    analysis to improve ordering and wording
                    without inventing unsupported claims.
                  </p>

                </div>

              </div>


              {/* ENGINE */}

              <div className="confidence-line">

                Analysis engine:{' '}

                <strong>
                  {activeReportEngine === 'nlp'
                    ? 'VeeBee NLP'
                    : 'NVIDIA NIM'}
                </strong>

                {' · '}

                Skill knowledge source:{' '}

                <strong>
                  VeeBee dataset
                </strong>

              </div>


            </div>
          )}

        </div>

      </div>


      {/* FLOW */}

      <div className="subtle-flow">

        <span>
          Resume PDF
        </span>

        <ArrowRight size={15} />

        <span>
          JD
        </span>

        <ArrowRight size={15} />

        <span>
          {activeReportEngine === 'nlp'
            ? 'VeeBee NLP'
            : 'NVIDIA NIM'}
        </span>

        <ArrowRight size={15} />

        <span>
          Analysis Report
        </span>

      </div>

    </div>
    </>
  );
}
import React, { useEffect, useMemo, useState } from 'react';

import {
  ArrowRight,
  Building2,
  Sparkles,
  RotateCcw,
  Download,
  CheckCircle2,
  Target,
  FileText,
  XCircle,
  Lightbulb
} from 'lucide-react';

import Dropzone from '../components/Dropzone';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Tag from '../components/Tag';

import { useVeeBee } from '../context';


// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function normalizeText(value) {
  return String(value || '')
    .replace(/\\s+/g, ' ')
    .trim();
}

function extractKeywords(jd) {
  if (!jd) return [];

  const common = [
    'python',
    'java',
    'javascript',
    'typescript',
    'c++',
    'c#',
    'sql',
    'mysql',
    'postgresql',
    'mongodb',
    'react',
    'angular',
    'vue',
    'node.js',
    'nodejs',
    'express',
    'fastapi',
    'django',
    'flask',
    'rest api',
    'rest apis',
    'graphql',
    'aws',
    'azure',
    'gcp',
    'docker',
    'kubernetes',
    'terraform',
    'git',
    'github',
    'jenkins',
    'ci/cd',
    'machine learning',
    'deep learning',
    'nlp',
    'natural language processing',
    'tensorflow',
    'pytorch',
    'scikit-learn',
    'pandas',
    'numpy',
    'data analysis',
    'data science',
    'power bi',
    'tableau',
    'excel',
    'spark',
    'hadoop',
    'kafka',
    'redis',
    'microservices',
    'system design',
    'linux',
  ];

  const lower = jd.toLowerCase();

  return common.filter((keyword) => lower.includes(keyword));
}

function findMissingSkills(resume, jd) {
  const skills = extractKeywords(jd);
  const lowerResume = resume.toLowerCase();

  return skills.filter((skill) => !lowerResume.includes(skill.toLowerCase()));
}

function findMatchedSkills(resume, jd) {
  const skills = extractKeywords(jd);
  const lowerResume = resume.toLowerCase();

  return skills.filter((skill) => lowerResume.includes(skill.toLowerCase()));
}

function buildOptimizationSuggestions(resume, jd, matched, missing) {
  const resumeLower = normalizeText(resume).toLowerCase();
  const hasSummary = /summary|profile|objective/.test(resumeLower);
  const hasMetrics = /\b\d+(?:\.\d+)?\s*(?:%|percent|users?|clients?|ms|sec|seconds?|minutes?|hours?|x|k|m|million|billion)\b/.test(resumeLower);

  const suggestions = [];

  if (missing.length) {
    suggestions.push({
      title: `Your resume is missing ${missing.length} JD keyword${missing.length === 1 ? '' : 's'} that matter for this role`,
      severity: missing.length >= 4 ? 'HIGH' : 'MEDIUM',
      tags: ['ATS', 'JOB MATCH'],
      before: missing.slice(0, 4).join(' · '),
      after: 'Add only missing skills you genuinely have, with evidence in Skills, Experience, or Projects.',
      description: 'Important requirements found in the job description are not currently visible in the resume.',
    });
  }

  if (matched.length) {
    suggestions.push({
      title: 'Your strongest matching skills should be easier to find',
      severity: 'HIGH',
      tags: ['ATS', 'RELEVANCE'],
      before: matched.slice(0, 5).join(' · '),
      after: `${matched.slice(0, 5).join(' · ')} — place these naturally in relevant bullets and the skills section.`,
      description: 'You already have useful evidence. Improve visibility instead of adding unsupported claims.',
    });
  }

  suggestions.push({
    title: hasMetrics ? 'Keep measurable evidence prominent in your strongest bullets' : 'Your experience bullets need stronger measurable evidence',
    severity: hasMetrics ? 'MEDIUM' : 'HIGH',
    tags: ['IMPACT', 'EXPERIENCE'],
    before: hasMetrics ? '(metrics exist, but the strongest ones may be buried)' : '(responsibility-focused wording without clear outcomes)',
    after: '(action + technology + genuine measurable result)',
    description: 'Explain what you did, how you did it, and the verified result. Never invent numbers.',
  });

  suggestions.push({
    title: hasSummary ? 'Tune the professional summary toward the target role' : 'Add a targeted professional summary',
    severity: 'MEDIUM',
    tags: ['RELEVANCE', 'SUMMARY'],
    before: hasSummary ? '(generic profile statement)' : '(no clear Summary/Profile section detected)',
    after: '(2–3 lines connecting your real experience to the target role)',
    description: 'Use only strengths and technologies that are genuinely supported by the resume.',
  });

  if (missing.length) {
    suggestions.push({
      title: 'A practical project could close one genuine skill gap',
      severity: 'LOW',
      tags: ['PROJECT', 'BUILD FIRST'],
      before: '(missing skill without project evidence)',
      after: `(build a real project demonstrating ${missing[0]})`,
      description: 'This is a project idea, not experience to claim. Build and complete it before adding it to your resume.',
    });
  }

  return suggestions.slice(0, 5);
}

const RESUME_TEMPLATES = [
  {
    id: 1,
    name: 'Simple Hipster CV',
    description:
      'A distinctive two-column CV with a strong visual sidebar and structured sections.',
    bestFor: 'Creative · Engineering · General Applications',
    compatibility: '95%',
    preview: '/templates/1.png',
  },

  {
    id: 2,
    name: 'Professional CV',
    description:
      'A clean traditional resume layout designed for professional and corporate applications.',
    bestFor: 'Corporate · Engineering · Business',
    compatibility: '98%',
    preview: '/templates/2.png',
  },

  {
    id: 3,
    name: 'Academic CV',
    description:
      'A detailed CV format designed for academic, research and technical profiles.',
    bestFor: 'Research · Academic · Engineering',
    compatibility: '94%',
    preview: '/templates/3.png',
  },

  {
    id: 4,
    name: 'Modern Professional CV',
    description:
      'A structured professional resume focused on experience, technical skills and achievements.',
    bestFor: 'Software · IT · Data · Engineering',
    compatibility: '98%',
    preview: '/templates/4.png',
  },

  {
    id: 5,
    name: 'Twenty Seconds CV',
    description:
      'A compact, highly structured CV with a distinctive profile sidebar.',
    bestFor: 'Experienced · Technical · Academic',
    compatibility: '93%',
    preview: '/templates/5.png',
  },

  {
    id: 6,
    name: 'Developer Resume',
    description:
      'A developer-focused resume emphasizing technical skills, experience and projects.',
    bestFor: 'Software · Full Stack · Developers',
    compatibility: '99%',
    preview: '/templates/6.png',
  },
];
// ------------------------------------------------------------
// COMPONENT
// ------------------------------------------------------------

export default function AISuggester() {
  
  const { resume, setLastAnalysis } = useVeeBee();

  const [resumeText, setResumeText] = useState(resume?.text || '');
  const [jdText, setJdText] = useState('');

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');

  const [status, setStatus] = useState('idle');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const [analysis, setAnalysis] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (resume?.text) {
      setResumeText(resume.text);
    }
  }, [resume?.text]);


  // ----------------------------------------------------------
  // DERIVED JD / RESUME SIGNALS
  // ----------------------------------------------------------

  const matchedSkills = useMemo(
    () => findMatchedSkills(resumeText, jdText),
    [resumeText, jdText]
  );

  const missingSkills = useMemo(
    () => findMissingSkills(resumeText, jdText),
    [resumeText, jdText]
  );

  const jdKeywords = useMemo(
    () => extractKeywords(jdText),
    [jdText]
  );


  // ----------------------------------------------------------
  // ANALYZE
  // ----------------------------------------------------------
  const downloadTemplate = async (template) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/templates/${template.id}`
      );
  
      if (!response.ok) {
        throw new Error('Unable to download template.');
      }
  
      const blob = await response.blob();
  
      const url = window.URL.createObjectURL(blob);
  
      const link = document.createElement('a');
  
      link.href = url;
      link.download = `${template.id}.tex`;
  
      document.body.appendChild(link);
  
      link.click();
  
      link.remove();
  
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Template download failed:', error);
    }
  };
  const generate = () => {
    if (!normalizeText(resumeText)) {
      setError('Upload a readable resume first.');
      setStatus('error');
      return;
    }

    if (!normalizeText(jdText)) {
      setError('Upload or paste the target job description first.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setError('');
    setAnalysis(null);

    window.setTimeout(() => {
      try {
        /*
         * Your existing analysis engine is still used here.
         *
         * Third argument receives the JD so the analysis layer
         * can use the job description as the target signal.
         */
        const ranked = buildOptimizationSuggestions(
          resumeText,
          jdText,
          matchedSkills,
          missingSkills
        );

        setResults(Array.isArray(ranked) ? ranked : []);

        const keywordCount = jdKeywords.length;

        const skillScore =
          keywordCount > 0
            ? Math.round((matchedSkills.length / keywordCount) * 100)
            : 0;

        const missingCount = missingSkills.length;

        const estimatedFit = Math.max(
          0,
          Math.min(
            100,
            Math.round(
              skillScore * 0.65 +
              Math.min(100, normalizeText(resumeText).length / 18) * 0.35
            )
          )
        );

        const generatedAnalysis = {
          score: estimatedFit,
          matchedSkills,
          missingSkills,
          jdKeywords,
          company,
          role,
        };

        setAnalysis(generatedAnalysis);

        setLastAnalysis({
          type: 'suggestions',
          data: {
            ranked,
            jdAnalysis: generatedAnalysis,
          },
          timestamp: Date.now(),
        });

        setStatus('result');
        setReportOpen(true);
      } catch (err) {
        setError(
          err?.message ||
          'Unable to analyze the resume against this job description.'
        );
        setStatus('error');
      }
    }, 850);
  };


  // ----------------------------------------------------------
  // RESET
  // ----------------------------------------------------------

  const reset = () => {
    setReportOpen(false);
    setStatus('idle');
    setResults([]);
    setAnalysis(null);
    setError('');
  };


  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <div className="page section">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="page-head">
        <div>
          <div className="eyebrow">04 · AI SUGGESTER</div>

          <h1>
            Make your resume
            <span> impossible to ignore.</span>
          </h1>

          <p>
            Compare your resume against a real job description,
            identify missing evidence, and discover practical ways
            to strengthen your application.
          </p>
        </div>

        <div className="head-chip">
          <Sparkles size={16} />
          Explainable recommendations
        </div>
      </div>


      {/* ======================================================
          TWO MAIN SECTIONS
      ====================================================== */}

      <div className="suggest-grid">


      <div className="panel template-panel">

<div className="panel-heading">

  <div>
    <span className="step">
      01 · RESUME TEMPLATES
    </span>

    <h3>
      Choose your template
    </h3>
  </div>

  <Download size={17} />

</div>


<p className="panel-description">
  Download clean, ATS-friendly LaTeX templates and use
  the one you prefer for your resume.
</p>


<div className="template-list">

  {RESUME_TEMPLATES.map((template) => (

    <div
      className="template-card"
      key={template.id}
    >

      {/* Preview */}

      <div className="template-preview">

        <img
          src={template.preview}
          alt={`${template.name} preview`}
        />

        <span>
          {template.compatibility}
        </span>

      </div>


      {/* Information */}

      <div className="template-content">

        <div className="template-title">

          <strong>
            {template.name}
          </strong>

        </div>


        <p>
          {template.description}
        </p>


        <small>
          Best for: {template.bestFor}
        </small>
        <div className="template-actions">

          <button
            type="button"
            className="gradient-btn full"
            onClick={() => downloadTemplate(template)}
          >
            <Download size={13} />
            Download
          </button>

        </div>

      </div>

    </div>

  ))}

</div>

</div>

        {/* ====================================================
            RIGHT — AI SUGGESTER
        ==================================================== */}

        <div className="panel">

          <div className="panel-heading">

            <div>
              <span className="step">
                02 · AI RESUME SUGGESTER
              </span>

              <h3>
                Optimize for a specific JD
              </h3>
            </div>

            <Target size={18} />

          </div>


          {/* RESUME */}

          <div className="upload-section">

            <label className="upload-label">
              <FileText size={14} />
              Your resume
            </label>

            <Dropzone
              label="Upload resume for analysis"
              onText={setResumeText}
            />

          </div>


          {/* JD */}

          <div className="upload-section">

            <label className="upload-label">
              <FileText size={14} />
              Target job description
            </label>

            <Dropzone
              label="Upload job description"
              onText={setJdText}
            />

            <textarea
              className="jd-textarea"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Or paste the job description here..."
              rows={5}
            />

          </div>


          {/* TARGET */}

          <div className="target-fields">

            <div className="target-field">

              <label>
                Target company
              </label>

              <div className="input-with-icon">

                <Building2 size={15} />

                <input
                  value={company}
                  onChange={(e) =>
                    setCompany(e.target.value)
                  }
                  placeholder="e.g. Google"
                />

              </div>

            </div>


            <div className="target-field">

              <label>
                Target role
              </label>

              <div className="input-with-icon">

                <Target size={15} />

                <input
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value)
                  }
                  placeholder="e.g. Software Engineer"
                />

              </div>

            </div>

          </div>

          <button
            className="gradient-btn full"
            onClick={generate}
            disabled={status === 'loading'}
          >
            Analyze & optimize resume

            <ArrowRight size={17} />
          </button>

        </div>

      </div>

      {/* ======================================================
          ANALYSIS RESULTS
      ====================================================== */}

      {status === 'idle' && (

        <div className="suggest-note">

          <Sparkles size={18} />

          <div>
            <strong>
              How VeeBee improves your application
            </strong>

            <span>
              Upload both your resume and the target JD.
              VeeBee will identify what is already strong,
              what is missing, and what you can genuinely
              improve before applying.
            </span>
          </div>

        </div>

      )}


      {status === 'loading' && (

        <div className="panel analysis-loading">

          <LoadingState
            title="Analyzing your resume against the JD"
            steps={[
              'Reading resume evidence',
              'Extracting job requirements',
              'Comparing skills and experience',
              'Finding missing evidence',
              'Generating practical improvements',
              'Creating project recommendations',
            ]}
          />

        </div>

      )}


      {status === 'error' && (

        <div className="panel">

          <ErrorState
            onRetry={() => setStatus('idle')}
            message={error}
          />

        </div>

      )}


      {status === 'result' && analysis && !reportOpen && (
        <div className="report-launch-row">
          <button type="button" className="gradient-btn report-launch-btn" onClick={() => setReportOpen(true)}>
            <Sparkles size={16} />
            View AI Suggestion Report
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {status === 'result' && analysis && reportOpen && (
        <div
          className="report-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="AI Suggestion Report"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setReportOpen(false);
          }}
        >
          <div className="report-modal">
            <div className="report-modal-header">
              <div>
                <span className="step">VEEBEE · AI ANALYSIS</span>
                <h2>Resume Suggestion Report</h2>
                <p>Resume vs. target job description analysis</p>
              </div>
              <button type="button" className="report-close-btn" onClick={() => setReportOpen(false)} aria-label="Close report">
                <XCircle size={20} />
              </button>
            </div>

            <div className="analysis-results">

          <div className="analysis-score-panel">
            <div>
              <span className="step">RESUME · JD FIT</span>
              <h2>{analysis.score}%</h2>
              <p>
                Estimated alignment between your resume and the supplied job description.
                Existing evidence, missing keywords, and practical improvements are shown separately.
              </p>
            </div>

            <div className="score-breakdown">
              <div><span>JD keywords</span><strong>{jdKeywords.length}</strong></div>
              <div><span>Matched</span><strong>{matchedSkills.length}</strong></div>
              <div><span>Missing</span><strong>{missingSkills.length}</strong></div>
            </div>
          </div>

          <div className="panel optimization-report-panel">
            <div className="panel-heading">
              <div>
                <span className="step">AI SUGGESTION REPORT</span>
                <h3>Optimization Suggestions</h3>
                <p className="panel-description">
                  Actionable recommendations based on your resume and target JD. Click a suggestion to expand it.
                </p>
              </div>
              <Lightbulb size={19} />
            </div>

            <div className="optimization-list">
              {results.map((item, index) => (
                <details className="optimization-item" key={`${item.title}-${index}`} open={index === 0}>
                  <summary>
                    <span className="optimization-number">{index + 1}</span>
                    <span className="optimization-title">{item.title}</span>
                    <span className="optimization-tags">
                      {item.tags.map((tag) => <span className="report-tag" key={tag}>{tag}</span>)}
                      <span className={`severity-badge severity-${String(item.severity).toLowerCase()}`}>{item.severity}</span>
                      <span className="optimization-chevron">⌄</span>
                    </span>
                  </summary>

                  <div className="optimization-body">
                    <p>{item.description}</p>
                    <div className="before-after-grid">
                      <div className="report-example report-before">
                        <span>BEFORE</span>
                        <code>{item.before}</code>
                      </div>
                      <div className="report-example report-after">
                        <span>AFTER</span>
                        <code>{item.after}</code>
                      </div>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>

          <div className="panel keyword-analysis-panel">
            <div className="keyword-heading">
              <div className="keyword-title-wrap">
                <FileText size={19} />
                <h3>Keyword Analysis</h3>
              </div>
              <strong className="keyword-match-rate">
                {jdKeywords.length ? Math.round((matchedSkills.length / jdKeywords.length) * 100) : 0}% Match Rate
              </strong>
            </div>

            <div className="keyword-progress-track">
              <div
                className="keyword-progress-fill"
                style={{ width: `${jdKeywords.length ? Math.min(100, Math.round((matchedSkills.length / jdKeywords.length) * 100)) : 0}%` }}
              />
            </div>

            <div className="keyword-group">
              <div className="keyword-group-heading matched-heading">
                <CheckCircle2 size={15} />
                <span>Matched Keywords ({matchedSkills.length})</span>
              </div>
              <div className="keyword-chips">
                {matchedSkills.length ? matchedSkills.map((skill) => (
                  <span className="keyword-chip keyword-chip-matched" key={skill}>{skill}</span>
                )) : <span className="keyword-empty">No matching technical keywords detected.</span>}
              </div>
            </div>

            <div className="keyword-group">
              <div className="keyword-group-heading missing-heading">
                <XCircle size={15} />
                <span>Missing Keywords ({missingSkills.length})</span>
              </div>
              <div className="keyword-chips">
                {missingSkills.length ? missingSkills.map((skill) => (
                  <span className="keyword-chip keyword-chip-missing" key={skill}>{skill}</span>
                )) : <span className="keyword-empty">No obvious technical keyword gaps detected.</span>}
              </div>
            </div>
          </div>

          {missingSkills.length > 0 && (
            <div className="panel project-builder-panel">
              <div className="panel-heading">
                <div>
                  <span className="step">PROJECT BUILDER</span>
                  <h3>Projects that could close genuine gaps</h3>
                </div>
                <Target size={19} />
              </div>

              <div className="project-warning">
                <Lightbulb size={16} />
                <span>
                  These are <strong>project ideas</strong>, not experiences to claim. Build and complete them before adding them to your resume.
                </span>
              </div>

              <div className="project-grid">
                {missingSkills.slice(0, 4).map((skill, index) => (
                  <div className="project-card" key={skill}>
                    <span className="project-number">0{index + 1}</span>
                    <div>
                      <h4>{skill.charAt(0).toUpperCase() + skill.slice(1)} practical project</h4>
                      <p>Build a small end-to-end project that demonstrates genuine hands-on experience with {skill}.</p>
                      <div className="tag-row">
                        <Tag tone="info">Suggested project</Tag>
                        <Tag tone="warning">Build first</Tag>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="suggest-note">
            <Sparkles size={18} />
            <div>
              <strong>Recommendation principle</strong>
              <span>
                VeeBee separates existing resume evidence from suggested improvements. Never claim a project, skill, certification, metric, or experience you have not actually earned.
                <button type="button" className="inline-btn" onClick={reset}>Reset</button>
              </span>
            </div>
          </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
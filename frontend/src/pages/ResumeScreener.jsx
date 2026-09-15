import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Building2,
  BriefcaseBusiness,
  ChevronDown,
  Download,
  FileText,
  UploadCloud,
  Target,
  AlertTriangle,
  CheckCircle2,
  Search,
  Plus,
} from 'lucide-react';

import Dropzone from '../components/Dropzone';
import ScoreRing from '../components/ScoreRing';
import Tag from '../components/Tag';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';

import { analyzeScreeningWithAPI } from '../lib/analysis';
import {
  companyProfiles,
  companyCatalog,
  softwareRoles,
} from '../lib/mock';

import { useVeeBee } from '../context';


/* =========================================================
   SCORE COLOR SYSTEM

   0 - 39   = RED
   40 - 69  = ORANGE
   70 - 100 = GREEN
   ========================================================= */

function scoreTone(score) {
  const value = Number(score) || 0;

  if (value < 40) {
    return {
      color: '#ff4d5e',
      bar: '#ff4d5e',
      background: 'rgba(255, 77, 94, 0.08)',
      border: 'rgba(255, 77, 94, 0.28)',
    };
  }

  if (value < 70) {
    return {
      color: '#ffb020',
      bar: '#ffb020',
      background: 'rgba(255, 176, 32, 0.08)',
      border: 'rgba(255, 176, 32, 0.28)',
    };
  }

  return {
    color: '#25d98a',
    bar: '#25d98a',
    background: 'rgba(37, 217, 138, 0.08)',
    border: 'rgba(37, 217, 138, 0.28)',
  };
}


/* =========================================================
   COMPANY BADGE
   ========================================================= */

function CompanyBadge({ company }) {
  const label =
    company?.symbol ||
    company?.name?.slice(0, 1) ||
    'C';

  return (
    <span
      className={`company-badge badge-${(
        company?.name || 'company'
      )
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 8)}`}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}


/* =========================================================
   SEARCHABLE SELECT
   ========================================================= */

function SearchableSelect({
  label,
  value,
  onChange,
  items,
  placeholder,
  type = 'company',
  allowCustom = true,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState('');
  

  const rootRef = useRef(null);

  const normalizedItems = useMemo(
    () =>
      items.map((item) =>
        typeof item === 'string'
          ? { name: item }
          : item,
      ),
    [items],
  );

  const selectedItem = normalizedItems.find(
    (item) => item.name === value,
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      return normalizedItems;
    }

    return normalizedItems.filter((item) =>
      item.name.toLowerCase().includes(q),
    );
  }, [normalizedItems, query]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleOutside,
    );

    return () =>
      document.removeEventListener(
        'mousedown',
        handleOutside,
      );
  }, []);

  const choose = (name) => {
    onChange(name);
    setQuery('');
    setCustom('');
    setOpen(false);
  };

  const chooseCustom = () => {
    const name = custom.trim();

    if (!name) {
      return;
    }

    choose(name);
  };

  return (
    <div
      className="screen-input-group"
      ref={rootRef}
    >
      {label && <label>{label}</label>}

      <button
        type="button"
        className={`screen-select-trigger ${
          open ? 'open' : ''
        }`}
        onClick={() =>
          setOpen((state) => !state)
        }
      >
        {type === 'company' ? (
          <Building2 size={16} />
        ) : (
          <BriefcaseBusiness size={16} />
        )}

        {selectedItem &&
          type === 'company' && (
            <CompanyBadge
              company={selectedItem}
            />
          )}

        <span
          className={
            value ? '' : 'placeholder'
          }
        >
          {value || placeholder}
        </span>

        <ChevronDown
          size={16}
          className="screen-select-chevron"
        />
      </button>

      {open && (
        <div className="screen-select-menu">
          <div className="screen-select-search">
            <Search size={14} />

            <input
              autoFocus
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder={`Search ${
                type === 'company'
                  ? 'companies'
                  : 'positions'
              }...`}
            />
          </div>

          <div className="screen-select-list">
            {filtered
              .slice(0, 140)
              .map((item) => (
                <button
                  type="button"
                  className={`screen-option ${
                    item.name === value
                      ? 'selected'
                      : ''
                  }`}
                  key={item.name}
                  onClick={() =>
                    choose(item.name)
                  }
                >
                  {type === 'company' ? (
                    <CompanyBadge
                      company={item}
                    />
                  ) : (
                    <span className="role-badge">
                      <BriefcaseBusiness
                        size={13}
                      />
                    </span>
                  )}

                  <span>
                    {item.name}
                  </span>

                  {item.name === value && (
                    <CheckCircle2
                      size={14}
                    />
                  )}
                </button>
              ))}

            {!filtered.length && (
              <div className="screen-select-empty">
                No match found. Use the custom
                option below.
              </div>
            )}
          </div>

          {allowCustom && (
            <div className="custom-entry-block">
              <div className="custom-entry-row">
                <input
                  value={custom}
                  onChange={(event) =>
                    setCustom(
                      event.target.value,
                    )
                  }
                  placeholder={
                    type === 'company'
                      ? 'Enter company name (not in list)'
                      : 'Enter position (not in list)'
                  }
                />

                <button
                  type="button"
                  className="custom-entry-btn"
                  onClick={chooseCustom}
                  disabled={!custom.trim()}
                  title="Use custom value"
                >
                  <Plus size={15} />
                </button>
              </div>

              <button
                type="button"
                className="custom-entry-link"
                onClick={chooseCustom}
                disabled={!custom.trim()}
              >
                <Plus size={14} />

                {type === 'company'
                  ? 'Use entered company name'
                  : 'Use entered position'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


/* =========================================================
   MAIN SCREENER
   ========================================================= */

export default function ResumeScreener() {
  const {
    resume,
    setLastAnalysis,
  } = useVeeBee();

  const [company, setCompany] =
    useState('NVIDIA');

  const [role, setRole] =
    useState('Software Engineer');

  const [resumeText, setResumeText] =
    useState(resume.text || '');

  const [status, setStatus] =
    useState('idle');

  const [analysis, setAnalysis] =
    useState(null);

  const [error, setError] =
    useState('');

  const [expandedAts, setExpandedAts] = 
  useState(null);  

  const [jd, setJd] =
    useState('');

  useEffect(() => {
    if (resume.text) {
      setResumeText(resume.text);
    }
  }, [resume.text]);

  const selectedCompany =
    companyCatalog.find(
      (item) => item.name === company,
    );

  const selectedProfile =
    companyProfiles.find(
      (item) => item.name === company,
    );

  const resetResults = () => {
    setAnalysis(null);
    setError('');
    setStatus('idle');
  };
  const downloadReport = () => {
    if (!analysis) {
      return;
    }
  
    const atsCards =
      analysis.atsPlatforms || [];
  
    const safeCompany =
      companyForDisplay?.name ||
      company ||
      'Company';
  
    const safeRole =
      role || 'Target Role';
  
    const reportWindow =
      window.open(
        '',
        '_blank',
        'width=1100,height=900',
      );
  
    if (!reportWindow) {
      setError(
        'Please allow pop-ups to generate the report.',
      );
      setStatus('error');
      return;
    }
  
    const scoreClass = (value) => {
      const score =
        Number(value) || 0;
  
      if (score < 40) {
        return 'bad';
      }
  
      if (score < 70) {
        return 'medium';
      }
  
      return 'good';
    };
  
    const escapeHtml = (value) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
  
    reportWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>
            VeeBee ATS Report - ${escapeHtml(
              safeCompany,
            )} - ${escapeHtml(safeRole)}
          </title>
  
          <meta
            charset="UTF-8"
          />
  
          <style>
            * {
              box-sizing: border-box;
            }
  
            body {
              margin: 0;
              padding: 40px;
              font-family:
                Inter,
                Arial,
                sans-serif;
              color: #171922;
              background: #ffffff;
            }
  
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              padding-bottom: 24px;
              border-bottom: 2px solid #eceef2;
            }
  
            .brand {
              font-size: 26px;
              font-weight: 900;
            }
  
            .brand span {
              color: #487cff;
            }
  
            .eyebrow {
              margin-bottom: 8px;
              font-size: 10px;
              font-weight: 800;
              letter-spacing: .12em;
              color: #6b7280;
            }
  
            h1 {
              margin: 0;
              font-size: 26px;
            }
  
            .meta {
              margin-top: 8px;
              color: #6b7280;
              font-size: 13px;
            }
  
            .overall {
              margin-top: 30px;
              padding: 24px;
              border: 1px solid #e5e7eb;
              border-radius: 16px;
            }
  
            .overall-score {
              font-size: 44px;
              font-weight: 900;
              color: ${
                analysis.score < 40
                  ? '#e5484d'
                  : analysis.score < 70
                    ? '#d98a00'
                    : '#139b5b'
              };
            }
  
            .summary {
              margin-top: 12px;
              color: #4b5563;
              line-height: 1.6;
            }
  
            .grid {
              display: grid;
              grid-template-columns:
                repeat(2, minmax(0, 1fr));
              gap: 18px;
              margin-top: 24px;
            }
  
            .card {
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              padding: 18px;
              page-break-inside: avoid;
            }
  
            .card h2 {
              margin: 0 0 5px;
              font-size: 18px;
            }
  
            .vendor {
              color: #6b7280;
              font-size: 11px;
              margin-bottom: 12px;
            }
  
            .score {
              font-size: 28px;
              font-weight: 900;
            }
  
            .good {
              color: #139b5b;
            }
  
            .medium {
              color: #d98a00;
            }
  
            .bad {
              color: #e5484d;
            }
  
            .status {
              margin-top: 5px;
              font-size: 10px;
              font-weight: 800;
              letter-spacing: .04em;
            }
  
            .metric {
              margin-top: 12px;
            }
  
            .metric-head {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              margin-bottom: 5px;
            }
  
            .track {
              height: 6px;
              background: #eceef2;
              border-radius: 999px;
              overflow: hidden;
            }
  
            .fill {
              height: 100%;
              border-radius: inherit;
            }
  
            .fill.good {
              background: #139b5b;
            }
  
            .fill.medium {
              background: #d98a00;
            }
  
            .fill.bad {
              background: #e5484d;
            }
  
            .tags {
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
              margin-top: 10px;
            }
  
            .tag {
              padding: 5px 8px;
              border-radius: 999px;
              font-size: 10px;
              background: #f4f5f7;
            }
  
            .tag.matched {
              color: #139b5b;
              background: #ecfbf3;
            }
  
            .tag.missing {
              color: #e5484d;
              background: #fff0f1;
            }
  
            .section-title {
              margin-top: 28px;
              margin-bottom: 12px;
              font-size: 14px;
              font-weight: 900;
            }
  
            .two-column {
              display: grid;
              grid-template-columns:
                1fr 1fr;
              gap: 20px;
            }
  
            .footer {
              margin-top: 35px;
              padding-top: 15px;
              border-top: 1px solid #e5e7eb;
              color: #9ca3af;
              font-size: 10px;
            }
  
            @media print {
              body {
                padding: 20px;
              }
  
              .card {
                break-inside: avoid;
              }
            }
          </style>
        </head>
  
        <body>
  
          <div class="header">
            <div>
              <div class="brand">
                Vee<span>Bee</span>
              </div>
  
              <div class="eyebrow">
                ATS SCREENING REPORT
              </div>
  
              <h1>
                ${escapeHtml(
                  safeCompany,
                )}
                ·
                ${escapeHtml(
                  safeRole,
                )}
              </h1>
  
              <div class="meta">
                Generated ${new Date().toLocaleString()}
              </div>
            </div>
          </div>
  
          <div class="overall">
  
            <div class="eyebrow">
              OVERALL MATCH
            </div>
  
            <div class="overall-score">
              ${Number(
                analysis.score || 0,
              )}/100
            </div>
  
            <div class="status ${scoreClass(
              analysis.score,
            )}">
              ${escapeHtml(
                analysis.recommendation ||
                  (
                    analysis.score < 40
                      ? 'LOW MATCH'
                      : analysis.score < 55
                        ? 'REVIEW'
                        : analysis.score < 75
                          ? 'SHORTLIST'
                          : 'STRONG MATCH'
                  ),
              )}
            </div>
  
            <p class="summary">
              ${escapeHtml(
                analysis.summary ||
                  '',
              )}
            </p>
  
            <p class="meta">
              Confidence:
              <strong>
                ${escapeHtml(
                  analysis.confidence ||
                    'N/A',
                )}
              </strong>
            </p>
  
          </div>
  
          <div class="section-title">
            ATS PLATFORM ANALYSIS
          </div>
  
          <div class="grid">
  
            ${atsCards
              .map((item) => {
                const itemScore =
                  Number(
                    item?.score || 0,
                  );
  
                const metrics = [
                  [
                    'Formatting',
                    item?.formatting,
                  ],
                  [
                    'Keywords',
                    item?.keywords,
                  ],
                  [
                    'Sections',
                    item?.sections,
                  ],
                  [
                    'Experience',
                    item?.experience,
                  ],
                  [
                    'Education',
                    item?.education,
                  ],
                  [
                    'Quantification',
                    item?.quantification,
                  ],
                ];
  
                return `
                  <div class="card">
  
                    <h2>
                      ${escapeHtml(
                        item?.platform ||
                          'ATS Platform',
                      )}
                    </h2>
  
                    <div class="vendor">
                      ${escapeHtml(
                        item?.vendor ||
                          '',
                      )}
                    </div>
  
                    <div class="score ${scoreClass(
                      itemScore,
                    )}">
                      ${itemScore}/100
                    </div>
  
                    <div class="status ${scoreClass(
                      itemScore,
                    )}">
                      ${escapeHtml(
                        item?.status ||
                          (
                            itemScore < 40
                              ? 'MAY BE FILTERED'
                              : itemScore < 70
                                ? 'NEEDS REVIEW'
                                : 'LIKELY TO PASS'
                          ),
                      )}
                    </div>
  
                    ${metrics
                      .map(
                        ([label, value]) => {
                          const metric =
                            Number(
                              value || 0,
                            );
  
                          return `
                            <div class="metric">
  
                              <div class="metric-head">
                                <span>
                                  ${label}
                                </span>
  
                                <strong
                                  class="${scoreClass(
                                    metric,
                                  )}"
                                >
                                  ${metric}
                                </strong>
                              </div>
  
                              <div class="track">
                                <div
                                  class="fill ${scoreClass(
                                    metric,
                                  )}"
                                  style="
                                    width:
                                      ${metric}%;
                                  "
                                ></div>
                              </div>
  
                            </div>
                          `;
                        },
                      )
                      .join('')}
  
                    <div class="section-title">
                      Matched
                    </div>
  
                    <div class="tags">
                      ${(item?.matched || [])
                        .map(
                          (skill) => `
                            <span class="tag matched">
                              ${escapeHtml(
                                skill,
                              )}
                            </span>
                          `,
                        )
                        .join('')}
  
                      ${
                        !(item?.matched || [])
                          .length
                          ? '<span class="tag">None detected</span>'
                          : ''
                      }
                    </div>
  
                    <div class="section-title">
                      Missing
                    </div>
  
                    <div class="tags">
                      ${(item?.missing || [])
                        .map(
                          (skill) => `
                            <span class="tag missing">
                              ${escapeHtml(
                                skill,
                              )}
                            </span>
                          `,
                        )
                        .join('')}
  
                      ${
                        !(item?.missing || [])
                          .length
                          ? '<span class="tag">None detected</span>'
                          : ''
                      }
                    </div>
  
                  </div>
                `;
              })
              .join('')}
  
          </div>
  
          <div class="section-title">
            SCREENING SIGNALS
          </div>
  
          <div class="two-column">
  
            <div class="card">
              <h2>
                Matched Signals
              </h2>
  
              <div class="tags">
                ${(analysis.positive || [])
                  .map(
                    (signal) => `
                      <span class="tag matched">
                        ${escapeHtml(
                          signal,
                        )}
                      </span>
                    `,
                  )
                  .join('')}
              </div>
            </div>
  
            <div class="card">
              <h2>
                Priority Gaps
              </h2>
  
              <div class="tags">
                ${(analysis.gaps || [])
                  .map(
                    (gap) => `
                      <span class="tag missing">
                        ${escapeHtml(
                          gap,
                        )}
                      </span>
                    `,
                  )
                  .join('')}
              </div>
            </div>
  
          </div>
  
          <div class="section-title">
            ROLE & COMPANY FIT
          </div>
  
          <div class="card">
  
            <div class="two-column">
  
              <div>
                <div class="eyebrow">
                  ROLE FIT
                </div>
  
                <div class="score ${scoreClass(
                  analysis.roleProfile?.score,
                )}">
                  ${Number(
                    analysis.roleProfile?.score ||
                      0,
                  )}/100
                </div>
  
                <p class="summary">
                  ${escapeHtml(
                    analysis.roleProfile?.reason ||
                      'Role-specific evidence analysis.',
                  )}
                </p>
              </div>
  
              <div>
                <div class="eyebrow">
                  COMPANY FIT
                </div>
  
                <div class="score ${scoreClass(
                  analysis.companyFit?.score,
                )}">
                  ${Number(
                    analysis.companyFit?.score ||
                      0,
                  )}/100
                </div>
  
                <p class="summary">
                  ${escapeHtml(
                    analysis.company?.gap ||
                      '',
                  )}
                </p>
              </div>
  
            </div>
  
          </div>
  
          <div class="footer">
            VeeBee ATS · Research-based screening simulation.
            ATS scores represent VeeBee's analysis model and are
            not proprietary vendor scores.
          </div>
  
        </body>
      </html>
    `);
  
    reportWindow.document.close();
  
    setTimeout(() => {
      reportWindow.focus();
      reportWindow.print();
    }, 500);
  };
  const handleResumeText = (text) => {
    setResumeText(text || '');
    resetResults();
  };

  const run = async () => {
    if (!resumeText.trim()) {
      setError('Upload a readable resume first.');
      setStatus('error');
      return;
    }

    if (!role.trim()) {
      setError('Select or enter a target role first.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const result = await analyzeScreeningWithAPI({
        resumeText,
        company,
        role,
        jdText: jd,
        engine: 'llm',
      });

      setAnalysis(result);

      setLastAnalysis({
        type: 'screening',
        data: result,
        timestamp: Date.now(),
      });

      setStatus('result');
    } catch (err) {
      setError(
        err.message ||
          'Screening failed.',
      );
      setStatus('error');
    }
  };

  const companyForDisplay =
    selectedProfile || {
      name: company,
      strengths: [],
      gap:
        'Add company-specific hiring context for deeper analysis.',
    };

  return (
    <div className="page section screener-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="page-head screener-head">
        <div>
          <div className="eyebrow">
            02 · RESUME SCREENER
          </div>

          <h1>
            Analyze your resume for any{' '}
            <span>
              company and role.
            </span>
          </h1>

          <p>
            Get ATS-based insights tailored
            to your target company and role.
            Understand strengths, gaps, and
            screening signals.
          </p>
        </div>

        <div className="head-chip">
          <BarChart3 size={16} />
          100-company screening dataset
        </div>
      </div>


      {/* =====================================================
          INPUT BAR
          ===================================================== */}

      <section className="screener-input-bar">

        {/* Resume */}

        <div className="screener-input-cell resume-cell">
          <div className="screen-input-heading">
            <span className="input-icon">
              <UploadCloud size={15} />
            </span>

            <span>
              Upload Resume
            </span>
          </div>

          <Dropzone
            label="Drag & drop your PDF/DOCX/TXT or click to upload"
            onText={handleResumeText}
          />
        </div>


        {/* Company */}

        <div className="screener-input-cell">
          <div className="screen-input-heading">
            <span className="input-icon">
              <Building2 size={15} />
            </span>

            <span>
              Select Company
            </span>

            <small>
              100+ companies
            </small>
          </div>

          <SearchableSelect
            value={company}
            onChange={(value) => {
              setCompany(value);
              resetResults();
            }}
            items={companyCatalog}
            placeholder="Search or select a company..."
            type="company"
          />
        </div>


        {/* Role */}

        <div className="screener-input-cell">
          <div className="screen-input-heading">
            <span className="input-icon">
              <BriefcaseBusiness
                size={15}
              />
            </span>

            <span>
              Select Role
            </span>

            <small>
              All software roles
            </small>
          </div>

          <SearchableSelect
            value={role}
            onChange={(value) => {
              setRole(value);
              resetResults();
            }}
            items={softwareRoles}
            placeholder="Search or select a role..."
            type="role"
          />
        </div>


        {/* JD */}

        <div className="screener-input-cell jd-cell">
          <div className="screen-input-heading">
            <span className="input-icon">
              <FileText size={15} />
            </span>

            <span>
              Job Description
            </span>

            <small>
              Optional
            </small>
          </div>

          <textarea
            className="screen-jd"
            value={jd}
            onChange={(event) => {
              setJd(
                event.target.value,
              );
              resetResults();
            }}
            placeholder="Paste the job description here..."
            maxLength={5000}
          />
        </div>


        {/* Run */}

        <div className="screener-run-cell">
          <button
            className="gradient-btn screen-run-btn"
            onClick={run}
            disabled={
              status === 'loading' ||
              !resumeText.trim()
            }
          >
            Run Screening
            <Target size={17} />
          </button>

          <p className="tiny-note">
            <span className="secure-dot">
              ●
            </span>{' '}
            Your data is secure and never
            stored permanently.
          </p>
        </div>

      </section>


      {/* =====================================================
          CONTEXT ROW
          ===================================================== */}

      <div className="screener-context-row">

        <div>
          <span>
            Selected company
          </span>

          <strong>
            {selectedCompany?.name ||
              company}
          </strong>
        </div>

        <div>
          <span>
            Target role
          </span>

          <strong>
            {role}
          </strong>
        </div>

        <div>
          <span>
            Company profile
          </span>

          <strong>
            {selectedProfile
              ? 'Dataset ready'
              : 'Custom company'}
          </strong>
        </div>

        <div>
          <span>
            JD
          </span>

          <strong>
            {analysis?.mode || (jd.trim() ? 'JD + role profile' : 'Role profile')}
          </strong>
        </div>

      </div>


      {/* =====================================================
          REPORT
          ===================================================== */}

      <div className="result-panel screener-report-panel">

      <div className="result-top">

<div>
  <span className="step">
    SCREENING REPORT
  </span>

  <h3>
    {companyForDisplay.name} ·{' '}
    {role}
  </h3>
</div>

<div
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  }}
>

  {status === 'result' && analysis && (
    <button
      type="button"
      className="report-download-btn"
      onClick={downloadReport}
    >
      <Download size={15} />
      Download Report
    </button>
  )}

  {status === 'result' &&
    (() => {
      const tone =
        scoreTone(
          analysis?.score,
        );

      return (
        <span
          style={{
            display:
              'inline-flex',
            alignItems:
              'center',
            border:
              `1px solid ${tone.border}`,
            color:
              tone.color,
            background:
              tone.background,
            borderRadius:
              999,
            padding:
              '6px 10px',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing:
              '0.04em',
          }}
        >
          {analysis.score < 40
            ? 'MAY BE FILTERED'
            : analysis.score < 70
              ? 'REVIEW'
              : 'LIKELY TO PASS'}
        </span>
      );
    })()}

</div>

</div>


        {/* Empty */}

        {status === 'idle' && (
          <EmptyState
            title="Upload a resume to screen it"
            body="Choose a company and software role, add the job description when available, and VeeBee will score the candidate against structured screening signals."
          />
        )}


        {/* Loading */}

        {status === 'loading' && (
          <LoadingState
            title="Running screening simulation"
            steps={[
              'Parsing candidate profile',
              'Checking company signals',
              'Scoring role alignment',
              'Generating ATS explanations',
            ]}
          />
        )}


        {/* Error */}

        {status === 'error' && (
          <ErrorState
            onRetry={() =>
              setStatus('idle')
            }
            message={error}
          />
        )}


        {/* Result */}

        {status === 'result' &&
          analysis && (
            <>

              {/* =================================================
                  SUMMARY
                  ================================================= */}

              <div className="screen-result-summary">

                <div className="screen-score">

                  <ScoreRing
                    score={
                      analysis.score
                    }
                    label="Overall score"
                  />

                  <div>

                    <div className="big-number">
                      {analysis.score >=
                      70
                        ? 'Strong match'
                        : analysis.score >=
                            40
                          ? 'Review candidate'
                          : 'Needs targeted improvement'}
                    </div>

                    <p>
                      {analysis.summary ||
                        `The strongest signals come from the overlap between the candidate evidence, ${companyForDisplay.name}, and the ${role} role profile.`}
                    </p>

                    <Tag tone="success">
                      Evidence confidence:{' '}
                      {
                        analysis.confidence
                      }
                    </Tag>

                  </div>
                </div>


                {/* Percentage bars */}

                <div className="bar-list">

                  {analysis.sections.map(
                    ([name, val]) => {
                      const tone =
                        scoreTone(
                          val,
                        );

                      return (
                        <div
                          key={name}
                          className="bar-item"
                        >

                          <div>
                            <span>
                              {name}
                            </span>

                            <strong
                              style={{
                                color:
                                  tone.color,
                              }}
                            >
                              {val}%
                            </strong>
                          </div>

                          <div className="bar">
                            <i
                              style={{
                                width: `${val}%`,
                                background:
                                  tone.bar,
                                boxShadow:
                                  `0 0 10px ${tone.bar}35`,
                              }}
                            />
                          </div>

                        </div>
                      );
                    },
                  )}

                </div>

              </div>


             {/* =================================================
    ATS PLATFORM CARDS
    ================================================= */}

<div className="ats-report-grid">
  {analysis.atsPlatforms?.length ? (
    analysis.atsPlatforms.map((item, index) => {
      const platform =
        typeof item === 'string'
          ? item
          : item?.platform || 'ATS Platform';

      const score = Math.max(
        0,
        Math.min(
          100,
          Number(item?.score ?? 0),
        ),
      );

      const tone = scoreTone(score);

      const isExpanded =
        expandedAts === platform;

      const statusText =
        item?.status ||
        (score < 40
          ? 'MAY BE FILTERED'
          : score < 70
            ? 'NEEDS REVIEW'
            : 'LIKELY TO PASS');

      return (
        <div
          key={`${platform}-${index}`}
          className={`ats-mini-card ${
            isExpanded
              ? 'ats-mini-card-expanded'
              : ''
          }`}
          style={{
            borderColor: isExpanded
              ? tone.border
              : undefined,
          }}
        >
          <button
            type="button"
            className="ats-mini-card-button"
            onClick={() =>
              setExpandedAts(
                isExpanded
                  ? null
                  : platform,
              )
            }
            aria-expanded={isExpanded}
          >
            <div className="ats-mini-top">
              <div>
                <strong>
                  {platform}
                </strong>

                {item?.vendor && (
                  <span className="ats-mini-vendor">
                    {item.vendor}
                  </span>
                )}
              </div>

              <span
                style={{
                  color: tone.color,
                  fontWeight: 800,
                }}
              >
                {score}
              </span>
            </div>

            <div className="bar">
              <i
                style={{
                  width: `${score}%`,
                  background: tone.bar,
                  boxShadow:
                    `0 0 8px ${tone.bar}30`,
                }}
              />
            </div>

            <div
              className="ats-mini-status"
              style={{
                color: tone.color,
              }}
            >
              {statusText}

              <ChevronDown
                size={14}
                className={
                  isExpanded
                    ? 'ats-chevron-open'
                    : ''
                }
              />
            </div>
          </button>

          {isExpanded && (
            <div className="ats-expanded-content">

              <div className="ats-expanded-header">
                <div>
                  <span className="result-label">
                    ATS SCORE BREAKDOWN
                  </span>

                  <h4>
                    {platform}
                  </h4>
                </div>

                <span
                  className="ats-expanded-score"
                  style={{
                    color: tone.color,
                  }}
                >
                  {score}/100
                </span>
              </div>

              <div className="ats-expanded-metrics">

                {[
                  ['Formatting', item?.formatting],
                  ['Keywords', item?.keywords],
                  ['Sections', item?.sections],
                  ['Experience', item?.experience],
                  ['Education', item?.education],
                  [
                    'Quantification',
                    item?.quantification,
                  ],
                ].map(
                  ([label, value]) => {
                    const metric =
                      Number(value ?? 0);

                    const metricTone =
                      scoreTone(metric);

                    return (
                      <div
                        className="ats-expanded-metric"
                        key={`${platform}-${label}`}
                      >
                        <div className="ats-expanded-metric-head">
                          <span>
                            {label}
                          </span>

                          <strong
                            style={{
                              color:
                                metricTone.color,
                            }}
                          >
                            {metric}
                          </strong>
                        </div>

                        <div className="bar">
                          <i
                            style={{
                              width: `${metric}%`,
                              background:
                                metricTone.bar,
                              boxShadow:
                                `0 0 8px ${metricTone.bar}30`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  },
                )}

              </div>

              <div className="ats-expanded-columns">

                <div className="ats-expanded-section">
                  <span className="result-label">
                    MATCHED
                  </span>

                  <div className="ats-expanded-tags">
                    {(item?.matched || [])
                      .length ? (
                      item.matched.map(
                        (skill) => (
                          <span
                            key={`${platform}-matched-${skill}`}
                            className="ats-detail-tag matched"
                          >
                            {skill}
                          </span>
                        ),
                      )
                    ) : (
                      <span className="ats-empty">
                        No direct matches
                      </span>
                    )}
                  </div>
                </div>

                <div className="ats-expanded-section">
                  <span className="result-label">
                    MISSING
                  </span>

                  <div className="ats-expanded-tags">
                    {(item?.missing || [])
                      .length ? (
                      item.missing.map(
                        (skill) => (
                          <span
                            key={`${platform}-missing-${skill}`}
                            className="ats-detail-tag missing"
                          >
                            {skill}
                          </span>
                        ),
                      )
                    ) : (
                      <span className="ats-empty">
                        No missing keywords
                      </span>
                    )}
                  </div>
                </div>

              </div>

              {(item?.synonymMatched || [])
                .length > 0 && (
                <div className="ats-expanded-section">
                  <span className="result-label">
                    SEMANTIC / SYNONYM MATCHES
                  </span>

                  <div className="ats-expanded-tags">
                    {item.synonymMatched.map(
                      (skill) => (
                        <span
                          key={`${platform}-synonym-${skill}`}
                          className="ats-detail-tag synonym"
                        >
                          {skill}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

              {(item?.missingSections || [])
                .length > 0 && (
                <div className="ats-expanded-section">
                  <span className="result-label">
                    MISSING SECTIONS
                  </span>

                  <div className="ats-expanded-tags">
                    {item.missingSections.map(
                      (section) => (
                        <span
                          key={`${platform}-section-${section}`}
                          className="ats-detail-tag missing"
                        >
                          {section}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

              <div className="ats-profile-info">
                <div>
                  <span>
                    Keyword strategy
                  </span>

                  <strong>
                    {item?.profile
                      ?.keywordStrategy ||
                      'Standard'}
                  </strong>
                </div>

                <div>
                  <span>
                    Parsing strictness
                  </span>

                  <strong>
                    {Math.round(
                      Number(
                        item?.profile
                          ?.strictness || 0,
                      ) * 100,
                    )}
                    %
                  </strong>
                </div>

                <div>
                  <span>
                    Passing score
                  </span>

                  <strong>
                    {item?.passingScore ??
                      '—'}
                  </strong>
                </div>
              </div>

            </div>
          )}
        </div>
      );
    })
  ) : (
    <div className="screen-select-empty">
      No ATS compatibility report was returned by the backend.
    </div>
  )}
</div>


              {/* =================================================
                  SIGNALS
                  ================================================= */}

              <div className="screen-detail-grid">

                <div className="screen-detail-card">

                  <span className="result-label">
                    MATCHED SIGNALS
                  </span>

                  {(
                    analysis.positive ||
                    []
                  )
                    .slice(0, 7)
                    .map((x, index) => (
                      <div
                        className="signal-row"
                        key={`${x}-${index}`}
                      >
                        <CheckCircle2
                          size={15}
                        />
                        {x}
                      </div>
                    ))}

                </div>


                <div className="screen-detail-card">

                  <span className="result-label">
                    PRIORITY GAPS
                  </span>

                  {(
                    analysis.gaps ||
                    []
                  )
                    .slice(0, 7)
                    .map((x, index) => (
                      <div
                        className="signal-row warn"
                        key={`${x}-${index}`}
                      >
                        <AlertTriangle
                          size={15}
                        />
                        {x}
                      </div>
                    ))}

                </div>

              </div>


              {/* =================================================
                  WHY SCORE
                  ================================================= */}

              <div className="insight">

                <strong>
                  Why this score?
                </strong>

                <p>
                  Skill coverage, role
                  alignment, projects,
                  experience, education,
                  and explicit evidence
                  are scored separately.
                  Missing evidence is
                  surfaced as a gap rather
                  than treated as a
                  definitive hiring outcome.
                </p>

              </div>

            </>
          )}

      </div>


      {/* =====================================================
          FACTS
          ===================================================== */}

      <section className="screen-facts">

        <div>
          <strong>
            {analysis
              ? `${
                  analysis.sections.filter(
                    ([, v]) => v >= 75,
                  ).length
                }/5`
              : '—'}
          </strong>

          <span>
            Core signals covered
          </span>
        </div>

        <div>
          <strong>
            {analysis
              ? analysis.gaps.length
              : '—'}
          </strong>

          <span>
            Priority skill gaps
          </span>
        </div>

        <div>
          <strong>
            100+
          </strong>

          <span>
            Company profiles ready
          </span>
        </div>

        <div>
          <strong>
            6
          </strong>

          <span>
            ATS report systems
          </span>
        </div>

      </section>

    </div>
  );
}
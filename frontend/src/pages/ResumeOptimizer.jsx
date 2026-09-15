import React, { useEffect, useMemo, useState } from 'react';

import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileCog,
  FileText,
  Lightbulb,
  LoaderCircle,
  UploadCloud,
  X,
} from 'lucide-react';

import Dropzone from '../components/Dropzone';

import Tag from '../components/Tag';

import ScoreRing from '../components/ScoreRing';

import LoadingState from '../components/LoadingState';

import EmptyState from '../components/EmptyState';

import ErrorState from '../components/ErrorState';

import { extractDocumentText } from '../lib/documentReader';

import { useVeeBee } from '../context';


const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8000';


/* ============================================================================
   GENERIC LOCAL DOCUMENT UPLOAD
   ========================================================================== */

function DocumentUpload({
  label,
  value,
  onChange,
  optional = false,
}) {
  const [file, setFile] = useState(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');

  const inputId =
    `optimizer-file-${label}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');

  async function readFile(nextFile) {
    if (!nextFile) return;

    setError('');
    setFile(nextFile);
    setReading(true);

    try {
      const text =
        await extractDocumentText(
          nextFile,
        );

      /*
       * Report is optional.
       * We store an empty value if a file contains no
       * machine-readable text, but we do not block the
       * complete optimizer workflow.
       */
      onChange(
        typeof text === 'string'
          ? text
          : '',
      );
    } catch (err) {
      setFile(null);
      onChange('');

      setError(
        err?.message ||
          'Unable to read this document.',
      );
    } finally {
      setReading(false);
    }
  }


  function clearFile(event) {
    event.stopPropagation();

    setFile(null);
    setError('');
    onChange('');

    const input =
      document.getElementById(
        inputId,
      );

    if (input) {
      input.value = '';
    }
  }


  return (
    <div>
      <div
        className={`dropzone ${
          file ? 'has-file' : ''
        }`}
        role="button"
        tabIndex={0}
        onClick={() =>
          document
            .getElementById(inputId)
            ?.click()
        }
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDragLeave={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();

          readFile(
            event.dataTransfer.files?.[0],
          );
        }}
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' ||
            event.key === ' '
          ) {
            event.preventDefault();

            document
              .getElementById(inputId)
              ?.click();
          }
        }}
      >
        <input
          id={inputId}
          type="file"
          accept=".pdf,.docx,.txt"
          hidden
          onChange={(event) =>
            readFile(
              event.target.files?.[0],
            )
          }
        />

        <div className="drop-icon">
          {reading ? (
            <LoaderCircle
              className="spin"
            />
          ) : file ? (
            <CheckCircle2 />
          ) : (
            <UploadCloud />
          )}
        </div>

        <div className="drop-copy">
          <strong>
            {file
              ? file.name
              : label}
          </strong>

          <span>
            {reading
              ? 'Reading document text…'
              : file
                ? `${Math.max(
                    1,
                    Math.round(
                      file.size / 1024,
                    ),
                  )} KB · extracted and ready`
                : 'Drop here or click to browse · PDF / DOCX / TXT'}
          </span>
        </div>

        {file ? (
          <button
            type="button"
            className="drop-clear"
            aria-label={`Remove ${label}`}
            onClick={clearFile}
          >
            <X size={16} />
          </button>
        ) : (
          <FileText
            size={20}
            className="drop-file"
          />
        )}
      </div>

      {optional &&
        !file && (
          <div className="tiny-note">
            Optional. The optimizer can work
            without this report.
          </div>
        )}

      {error && (
        <div className="file-error">
          {error}
        </div>
      )}

      {file &&
        !reading &&
        !value && (
          <div className="tiny-note">
            This document did not expose readable
            text. The optimizer can still continue
            without the report.
          </div>
        )}
    </div>
  );
}


/* ============================================================================
   PDF DOWNLOAD
   ========================================================================== */

function base64ToPdf(
  base64,
) {
  const binary =
    window.atob(base64);

  const bytes =
    new Uint8Array(
      binary.length,
    );

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(index);
  }

  return new Blob(
    [bytes],
    {
      type: 'application/pdf',
    },
  );
}


function downloadBlob(
  blob,
  filename,
) {
  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement('a');

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);

  anchor.click();

  anchor.remove();

  URL.revokeObjectURL(url);
}


/* ============================================================================
   PAGE
   ========================================================================== */

export default function ResumeOptimizer() {
  const {
    resume,
    setLastAnalysis,
  } = useVeeBee();


  const [
    mode,
    setMode,
  ] = useState(
    'balanced',
  );


  const [
    resumeText,
    setResumeText,
  ] = useState(
    resume.text || '',
  );


  const [
    jdText,
    setJdText,
  ] = useState('');


  const [
    reportText,
    setReportText,
  ] = useState('');


  const [
    status,
    setStatus,
  ] = useState(
    'idle',
  );


  const [
    analysis,
    setAnalysis,
  ] = useState(null);


  const [
    error,
    setError,
  ] = useState('');


  const [
    pdfBase64,
    setPdfBase64,
  ] = useState('');


  const [
    latexSource,
    setLatexSource,
  ] = useState('');


  useEffect(() => {
    if (resume.text) {
      setResumeText(
        resume.text,
      );
    }
  }, [resume.text]);


  const hasRequiredInputs =
    Boolean(
      resumeText.trim() &&
      jdText.trim(),
    );


  const modeLabel =
    useMemo(() => {
      return (
        mode.charAt(0)
          .toUpperCase() +
        mode.slice(1)
      );
    }, [mode]);


  /* ==========================================================================
     GENERATE
     ======================================================================== */

  async function generate() {
    if (!resumeText.trim()) {
      setError(
        'Upload a readable resume first.',
      );

      setStatus('error');

      return;
    }


    if (!jdText.trim()) {
      setError(
        'Upload a readable job description first.',
      );

      setStatus('error');

      return;
    }


    setStatus('loading');
    setError('');

    setAnalysis(null);
    setPdfBase64('');
    setLatexSource('');


    try {
      const response =
        await fetch(
          `${API_BASE_URL}/optimizer/generate`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Accept:
                'application/json',
            },

            body: JSON.stringify({
              resume_text:
                resumeText,

              jd_text:
                jdText,

              report_text:
                reportText,

              mode,
            }),
          },
        );


      let payload;

      try {
        payload =
          await response.json();
      } catch {
        throw new Error(
          'The optimizer backend returned an invalid response.',
        );
      }


      if (!response.ok) {
        throw new Error(
          payload?.detail ||
            payload?.error ||
            `Optimizer request failed with status ${response.status}.`,
        );
      }


      if (!payload?.success) {
        throw new Error(
          payload?.error ||
            'The optimizer could not generate the resume.',
        );
      }


      const result = {
        current:
          Number(
            payload.current,
          ) || 0,

        optimized:
          Number(
            payload.optimized,
          ) || 0,

        cards:
          Array.isArray(
            payload.cards,
          )
            ? payload.cards
            : [],

        bestEdit:
          payload.bestEdit ||
          'Prioritize the strongest source-backed evidence.',

        skills:
          Array.isArray(
            payload.skills,
          )
            ? payload.skills
            : [],

        matchedSkills:
          Array.isArray(
            payload.matched_skills,
          )
            ? payload.matched_skills
            : [],

        missingSkills:
          Array.isArray(
            payload.missing_skills,
          )
            ? payload.missing_skills
            : [],

        changes:
          Array.isArray(
            payload.changes,
          )
            ? payload.changes
            : [],

        reportSignals:
          payload.report_signals ||
          {},

        jdAnalysis:
          payload.jd_analysis ||
          null,

        evidencePreserved:
          payload.evidence_preserved !== false,
      };


      setAnalysis(result);

      setPdfBase64(
        payload.pdf_base64 ||
        '',
      );

      setLatexSource(
        payload.latex ||
        '',
      );


      setLastAnalysis({
        type: 'optimizer',

        data: result,

        timestamp:
          Date.now(),
      });


      setStatus('result');

    } catch (err) {
      console.error(
        'Optimizer generation failed:',
        err,
      );

      setError(
        err?.message ||
          'Unable to generate the optimized resume.',
      );

      setStatus('error');

    }
  }


  /* ==========================================================================
     DOWNLOAD
     ======================================================================== */

  function downloadPdf() {
    if (!pdfBase64) {
      setError(
        'Generate the optimized resume first.',
      );

      return;
    }


    try {
      const blob =
        base64ToPdf(
          pdfBase64,
        );

      downloadBlob(
        blob,
        'optimized-resume.pdf',
      );

    } catch (err) {
      setError(
        err?.message ||
          'Unable to download the PDF.',
      );
    }
  }


  /* ==========================================================================
     RENDER
     ======================================================================== */

  return (
    <div className="page section">

      {/* ================================================================
          HEADER
          ============================================================== */}

      <div className="page-head">
        <div>
          <div className="eyebrow">
            03 · RESUME OPTIMIZER
          </div>

          <h1>
            Improve the resume{' '}
            <span>
              without inventing it.
            </span>
          </h1>

          <p>
            Turn screening signals into
            concrete edits while preserving
            the candidate&apos;s real evidence.
          </p>
        </div>

        <div className="head-chip">
          <FileCog size={16} />

          Evidence-preserving edits
        </div>
      </div>


      {/* ================================================================
          MAIN GRID
          ============================================================== */}

      <div className="optimizer-grid">

        {/* ==============================================================
            INPUT PANEL
            ============================================================ */}

        <div className="panel">

          {/* ------------------------------------------------------------
              RESUME
              ---------------------------------------------------------- */}

          <div className="panel-heading">
            <div>
              <span className="step">
                SOURCE RESUME
              </span>

              <h3>
                Upload
              </h3>
            </div>

            <span className="muted">
              PDF / DOCX / TXT
            </span>
          </div>


          <Dropzone
            label="Upload resume to optimize"
            onText={setResumeText}
          />


          <div className="divider" />


          {/* ------------------------------------------------------------
              JD
              ---------------------------------------------------------- */}

          <div className="panel-heading">
            <div>
              <span className="step">
                JOB DESCRIPTION
              </span>

              <h3>
                Upload
              </h3>
            </div>

            <span className="muted">
              PDF / DOCX / TXT
            </span>
          </div>


          <DocumentUpload
            label="Upload job description"
            value={jdText}
            onChange={setJdText}
          />


          <div className="divider" />


          {/* ------------------------------------------------------------
              PREVIOUS REPORT
              ---------------------------------------------------------- */}

        <div className="panel-heading">
  <div>
    <span className="step">
      JOB DESCRIPTION
    </span>

    <h3>
      Copy & Paste
    </h3>
  </div>

  <span className="muted">
    Paste the job description
  </span>
</div>

<textarea
  className="text-area"
  value={jdText}
  onChange={(event) =>
    setJdText(event.target.value)
  }
  placeholder="Paste the complete job description here..."
  rows={12}
/>


          <div className="divider" />


          {/* ------------------------------------------------------------
              MODE
              ---------------------------------------------------------- */}

          <label className="option-title">
            Optimization style
          </label>


          <div className="segmented">

            {[
              'minimal',
              'balanced',
              'aggressive',
            ].map(
              (option) => (
                <button
                  type="button"
                  className={
                    mode === option
                      ? 'selected'
                      : ''
                  }
                  key={option}
                  onClick={() =>
                    setMode(
                      option,
                    )
                  }
                >
                  {option}
                </button>
              ),
            )}

          </div>


          {/* ------------------------------------------------------------
              GENERATE
              ---------------------------------------------------------- */}

          <button
            type="button"
            className="gradient-btn full"
            onClick={generate}
            disabled={
              status === 'loading' ||
              !hasRequiredInputs
            }
          >
            {status === 'loading' ? (
              <>
                Generating optimized PDF

                <LoaderCircle
                  size={17}
                  className="spin"
                />
              </>
            ) : (
              <>
                Generate optimized resume

                <ArrowRight
                  size={17}
                />
              </>
            )}
          </button>


          <p className="tiny-note">
            Existing source evidence is preserved.
            Missing JD skills are never silently
            added as candidate experience.
          </p>

        </div>


        {/* ==============================================================
            OPTIMIZATION MAP
            ============================================================ */}

        <div className="panel">

          <div className="panel-heading">
            <div>
              <span className="step">
                OPTIMIZATION MAP
              </span>

              <h3>
                What to change
              </h3>
            </div>

            {analysis && (
              <Tag tone="success">
                +
                {Math.max(
                  0,
                  analysis.optimized -
                    analysis.current,
                )}{' '}
                estimated points
              </Tag>
            )}
          </div>


          {/* ------------------------------------------------------------
              IDLE
              ---------------------------------------------------------- */}

          {status === 'idle' && (
            <EmptyState
              title="Your optimization plan is waiting"
              body="Upload a resume and job description to see section-level recommendations and generate the optimized PDF."
            />
          )}


          {/* ------------------------------------------------------------
              LOADING
              ---------------------------------------------------------- */}

          {status === 'loading' && (
            <LoadingState
              title="Building your optimization plan"
              steps={[
                'Reading resume sections',
                'Analyzing the target job',
                'Using the previous ATS report',
                'Prioritizing supported evidence',
                'Applying optimization mode',
                'Building the LaTeX resume',
                'Compiling the PDF',
              ]}
            />
          )}


          {/* ------------------------------------------------------------
              ERROR
              ---------------------------------------------------------- */}

          {status === 'error' && (
            <ErrorState
              onRetry={() =>
                setStatus(
                  'idle',
                )
              }
              message={error}
            />
          )}


          {/* ------------------------------------------------------------
              RESULT
              ---------------------------------------------------------- */}

          {status === 'result' &&
            analysis && (
              <>

                <div className="optimizer-score">

                  <ScoreRing
                    score={
                      analysis.optimized
                    }
                    label="Optimized readiness"
                    size={118}
                  />


                  <div>

                    <strong>
                      {modeLabel} mode
                    </strong>


                    <p>
                      Estimated readiness is
                      based on the submitted resume,
                      job description and optional
                      ATS report.
                    </p>


                    <div className="tag-row">

                      {analysis.evidencePreserved && (
                        <Tag tone="success">
                          <CheckCircle2
                            size={12}
                          />

                          Evidence preserved
                        </Tag>
                      )}


                      <Tag>
                        JD-aware
                      </Tag>


                      {analysis.matchedSkills.length >
                        0 && (
                        <Tag tone="success">
                          {
                            analysis
                              .matchedSkills
                              .length
                          }{' '}
                          matched skills
                        </Tag>
                      )}

                    </div>

                  </div>

                </div>


                {/* ------------------------------------------------------
                    CARDS
                    ---------------------------------------------------- */}

                <div className="optimizer-cards">

                  {analysis.cards.map(
                    (
                      card,
                      index,
                    ) => (
                      <div
                        className="opt-card"
                        key={`${card.title}-${index}`}
                      >

                        <div className="opt-card-top">

                          <div>

                            <span>
                              {
                                card.title
                              }
                            </span>

                            <strong>
                              {
                                card.score
                              }
                              /100
                            </strong>

                          </div>


                          <div className="tiny-progress">

                            <i
                              style={{
                                width:
                                  `${Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      card.score,
                                    ),
                                  )}%`,
                              }}
                            />

                          </div>

                        </div>


                        <p>
                          {
                            card.desc
                          }
                        </p>


                        <div className="tag-row">

                          {(card.tags || [])
                            .map(
                              (
                                tag,
                                tagIndex,
                              ) => (
                                <Tag
                                  key={`${String(
                                    tag,
                                  )}-${tagIndex}`}
                                >
                                  {String(
                                    tag,
                                  )}
                                </Tag>
                              ),
                            )}

                        </div>

                      </div>
                    ),
                  )}

                </div>


                {/* ------------------------------------------------------
                    BEST EDIT
                    ---------------------------------------------------- */}

                <div className="recommendation">

                  <Lightbulb
                    size={18}
                  />

                  <div>

                    <strong>
                      Best next edit
                    </strong>

                    <p>
                      {
                        analysis.bestEdit
                      }
                    </p>

                  </div>

                </div>

              </>
            )}

        </div>

      </div>


      {/* ================================================================
          WHAT CHANGED — SMALL PANEL
          ============================================================== */}

      {status === 'result' &&
        analysis && (

        <section className="panel">

          <div className="panel-heading">

            <div>
              <span className="step">
                CHANGES MADE
              </span>

              <h3>
                What changed
              </h3>
            </div>


            <Tag tone="success">
              {
                analysis.changes.length
              }{' '}
              changes
            </Tag>

          </div>


          {analysis.changes.length >
          0 ? (

            <div className="tag-row">

              {analysis.changes.map(
                (
                  change,
                  index,
                ) => (
                  <Tag
                    key={`${change.type}-${index}`}
                    tone="success"
                  >
                    <CheckCircle2
                      size={12}
                    />

                    {change.text}
                  </Tag>
                ),
              )}

            </div>

          ) : (

            <p className="tiny-note">
              No material wording changes were
              necessary.
            </p>

          )}


          {/* ------------------------------------------------------------
              Missing skills are shown, NOT inserted.
              ---------------------------------------------------------- */}

          {analysis.missingSkills.length >
            0 && (

            <div className="tiny-note">

              <strong>
                Not added:
              </strong>{' '}

              {analysis.missingSkills.join(
                ', ',
              )}

              {' '}— these JD skills were not
              supported by the source resume.

            </div>

          )}

        </section>

      )}


      {/* ================================================================
          PDF OUTPUT
          ============================================================== */}

      {status === 'result' &&
        pdfBase64 && (

        <section className="preview-card">

          <div>

            <div className="section-kicker">
              OPTIMIZED RESUME
            </div>


            <h2>
              Your LaTeX template,
              <span>
                now optimized.
              </span>
            </h2>


            <p>
              The final PDF was compiled on the
              backend using your supplied LaTeX
              template and the optimized candidate
              evidence.
            </p>


            <button
              type="button"
              className="gradient-btn"
              onClick={downloadPdf}
            >
              Download optimized PDF

              <Download
                size={17}
              />
            </button>

          </div>


          <div className="preview-sheet">

            <div className="sheet-title">
              OPTIMIZED PDF
            </div>

            <div className="sheet-line long" />

            <div className="sheet-line" />

            <div className="sheet-section">
              PROFESSIONAL SUMMARY
            </div>

            <div className="sheet-lines">
              <i />
              <i />
              <i />
            </div>

            <div className="sheet-section">
              EXPERIENCE
            </div>

            <div className="sheet-lines">
              <i />
              <i />
              <i />
              <i />
            </div>

            <div className="sheet-section">
              SKILLS
            </div>

            <div className="sheet-chips">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>

            <FileText
              className="sheet-icon"
              size={26}
            />

          </div>

        </section>

      )}


      {/* ================================================================
          GENERATED LATEX — COLLAPSED
          ============================================================== */}

      {latexSource && (

        <details className="panel">

          <summary>
            Generated LaTeX
          </summary>


          <pre
            style={{
              whiteSpace:
                'pre-wrap',

              overflowX:
                'auto',

              marginTop:
                16,
            }}
          >
            {latexSource}
          </pre>

        </details>

      )}

    </div>
  );
}

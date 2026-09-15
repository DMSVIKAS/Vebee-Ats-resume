import React, { useEffect, useMemo, useState } from 'react';
import { Check, Sparkles, LoaderCircle } from 'lucide-react';

export default function LoadingState({
  title = 'Analyzing your profile',
  steps = [],
}) {
  const safeSteps = useMemo(
    () => (Array.isArray(steps) ? steps : []),
    [steps],
  );

  const [activeStep, setActiveStep] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Move through the visual processing stages automatically.
  useEffect(() => {
    if (!safeSteps.length) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setActiveStep((current) => {
        if (current >= safeSteps.length - 1) {
          return current;
        }

        return current + 1;
      });
    }, 1700);

    return () => {
      window.clearInterval(interval);
    };
  }, [safeSteps.length]);

  // Live elapsed timer.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const progress = safeSteps.length
    ? Math.min(
        100,
        Math.round(
          ((activeStep + 1) / safeSteps.length) * 100,
        ),
      )
    : 8;

  const elapsedLabel = `${String(
    Math.floor(elapsedSeconds / 60),
  ).padStart(2, '0')}:${String(
    elapsedSeconds % 60,
  ).padStart(2, '0')}`;

  return (
    <>
      <style>{`
        @keyframes vbOrbPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow:
              0 0 0 0 rgba(130, 170, 255, 0.00),
              0 0 24px rgba(130, 170, 255, 0.16);
          }

          50% {
            transform: scale(1.08);
            box-shadow:
              0 0 0 12px rgba(130, 170, 255, 0.04),
              0 0 38px rgba(130, 170, 255, 0.30);
          }
        }

        @keyframes vbSparkleFloat {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }

          50% {
            transform: translateY(-3px) rotate(8deg);
          }
        }

        @keyframes vbSpin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes vbActivePulse {
          0%, 100% {
            opacity: 0.55;
            transform: scale(1);
          }

          50% {
            opacity: 1;
            transform: scale(1.12);
          }
        }

        @keyframes vbShimmer {
          0% {
            left: -35%;
          }

          100% {
            left: 110%;
          }
        }

        @keyframes vbAppear {
          from {
            opacity: 0;
            transform: translateY(5px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .vb-loading-shell {
          width: 100%;
          animation: vbAppear 0.35s ease-out;
        }

        .vb-loading-orb-wrap {
          position: relative;
          width: 58px;
          height: 58px;
          margin: 4px auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vb-loading-ring {
          position: absolute;
          inset: -7px;
          border: 1px solid rgba(140, 170, 255, 0.16);
          border-top-color: rgba(140, 170, 255, 0.72);
          border-radius: 50%;
          animation: vbSpin 2.1s linear infinite;
        }

        .vb-loading-ring-two {
          position: absolute;
          inset: -12px;
          border: 1px dashed rgba(140, 170, 255, 0.09);
          border-radius: 50%;
          animation: vbSpin 3.4s linear infinite reverse;
        }

        .vb-loading-orb {
          position: relative;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(
              circle at 35% 30%,
              rgba(175, 210, 255, 0.22),
              rgba(76, 92, 150, 0.08) 52%,
              rgba(20, 25, 52, 0.20)
            );
          border: 1px solid rgba(148, 178, 255, 0.18);
          animation: vbOrbPulse 2.2s ease-in-out infinite;
          overflow: hidden;
        }

        .vb-loading-orb::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background:
            linear-gradient(
              120deg,
              transparent 30%,
              rgba(255,255,255,0.11) 50%,
              transparent 70%
            );
          transform: translateX(-100%);
          animation: vbShimmer 2.8s ease-in-out infinite;
        }

        .vb-loading-sparkle {
          position: relative;
          z-index: 2;
          animation: vbSparkleFloat 1.9s ease-in-out infinite;
        }

        .vb-loading-title {
          display: block;
          text-align: center;
          font-size: 17px;
          line-height: 1.35;
          margin-bottom: 6px;
        }

        .vb-loading-subtitle {
          display: block;
          text-align: center;
          max-width: 430px;
          margin: 0 auto;
          font-size: 12px;
          line-height: 1.65;
          opacity: 0.68;
        }

        .vb-loading-meta {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          margin-top: 12px;
          font-size: 10px;
          opacity: 0.48;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .vb-loading-progress-wrap {
          margin: 22px auto 18px;
          width: min(430px, 92%);
        }

        .vb-loading-progress-top {
          display: flex;
          justify-content: space-between;
          margin-bottom: 7px;
          font-size: 10px;
          opacity: 0.58;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .vb-loading-progress-track {
          position: relative;
          height: 4px;
          width: 100%;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.065);
        }

        .vb-loading-progress-fill {
          position: relative;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            rgba(111, 151, 255, 0.38),
            rgba(153, 186, 255, 0.95)
          );
          transition: width 0.55s ease;
          overflow: hidden;
        }

        .vb-loading-progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          width: 35%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,0.65),
            transparent
          );
          animation: vbShimmer 1.8s linear infinite;
        }

        .vb-loading-steps {
          width: min(430px, 92%);
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .vb-loading-step {
          min-height: 30px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 5px 8px;
          border-radius: 8px;
          transition:
            background 0.25s ease,
            opacity 0.25s ease,
            transform 0.25s ease;
        }

        .vb-loading-step.active {
          background: rgba(130, 160, 255, 0.055);
          transform: translateX(2px);
        }

        .vb-loading-step.done {
          opacity: 0.62;
        }

        .vb-loading-step.pending {
          opacity: 0.32;
        }

        .vb-loading-indicator {
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,0.12);
        }

        .vb-loading-step.active
          .vb-loading-indicator {
          border-color: rgba(140, 175, 255, 0.26);
        }

        .vb-loading-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(145, 180, 255, 0.95);
          animation: vbActivePulse 1.15s ease-in-out infinite;
        }

        .vb-loading-step.done
          .vb-loading-indicator {
          background: rgba(120, 165, 255, 0.10);
          border-color: rgba(120, 165, 255, 0.22);
        }

        .vb-loading-step-text {
          font-size: 11px;
          line-height: 1.4;
        }

        .vb-loading-active-label {
          margin-left: auto;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          opacity: 0.45;
        }
      `}</style>

      <div className="loading-state vb-loading-shell">
        <div className="vb-loading-orb-wrap">
          <div className="vb-loading-ring" />
          <div className="vb-loading-ring-two" />

          <div className="vb-loading-orb">
            <div className="vb-loading-sparkle">
              <Sparkles size={22} />
            </div>
          </div>
        </div>

        <strong className="vb-loading-title">
          {title}
        </strong>

        <span className="vb-loading-subtitle">
          VeeBee is processing evidence, matching signals,
          and preparing the report.
        </span>

        <div className="vb-loading-meta">
          <LoaderCircle size={11} />
          <span>AI processing</span>
          <span>•</span>
          <span>{elapsedLabel}</span>
        </div>

        {safeSteps.length > 0 && (
          <>
            <div className="vb-loading-progress-wrap">
              <div className="vb-loading-progress-top">
                <span>Analysis progress</span>
                <span>{progress}%</span>
              </div>

              <div className="vb-loading-progress-track">
                <div
                  className="vb-loading-progress-fill"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>

            <div className="vb-loading-steps">
              {safeSteps.map((step, index) => {
                const isDone =
                  index < activeStep;

                const isActive =
                  index === activeStep;

                const className = [
                  'vb-loading-step',
                  isDone
                    ? 'done'
                    : isActive
                      ? 'active'
                      : 'pending',
                ].join(' ');

                return (
                  <div
                    key={`${step}-${index}`}
                    className={className}
                  >
                    <div className="vb-loading-indicator">
                      {isDone ? (
                        <Check size={11} />
                      ) : isActive ? (
                        <span className="vb-loading-dot" />
                      ) : null}
                    </div>

                    <span className="vb-loading-step-text">
                      {step}
                    </span>

                    {isActive && (
                      <span className="vb-loading-active-label">
                        Processing
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
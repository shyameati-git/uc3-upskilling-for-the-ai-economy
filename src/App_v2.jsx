import { useState, useEffect, useCallback } from "react";

const STEPS = [
  "welcome", "task_select", "go_aisle", "arrived",
  "camera", "scanning", "results", "fix_step1",
  "fix_step2", "fix_step3", "fix_step4", "complete"
];

const COLORS = {
  calm: "#5A9E8F",
  calmDark: "#3D7A6B",
  warn: "#D4920B",
  warnBg: "#FFF7E8",
  warnBorder: "#F0DFC0",
  correct: "#5A9E8F",
  correctBg: "#E6F2EE",
  surface: "#FAFCFB",
  card: "#FFFFFF",
  text: "#2C3530",
  textMuted: "#6E7F76",
  border: "#E2E8E4",
  bg: "#F2F5F3",
};

const SHAPE_CORRECT = () => (
  <svg width="20" height="20" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="9" fill={COLORS.correct} />
    <path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SHAPE_WARN = () => (
  <svg width="20" height="20" viewBox="0 0 20 20">
    <polygon points="10,2 19,18 1,18" fill={COLORS.warn} stroke="#fff" strokeWidth="0.5" />
    <text x="10" y="15" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800">!</text>
  </svg>
);

function ActionButton({ children, onClick, secondary = false, icon, disabled = false }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        width: "100%", padding: "20px 24px",
        fontSize: 20, fontWeight: 800, letterSpacing: 0.3,
        fontFamily: "'Nunito', sans-serif",
        border: secondary ? `2px solid ${COLORS.border}` : "none",
        borderRadius: 16,
        cursor: disabled ? "default" : "pointer",
        background: disabled ? "#D5DDD9" : secondary ? COLORS.card : COLORS.calm,
        color: disabled ? "#9BA8A1" : secondary ? COLORS.text : "#fff",
        boxShadow: disabled || secondary ? "none" : `0 4px 16px ${COLORS.calm}33`,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
        transition: "transform 0.1s ease",
      }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={e => { if (!disabled) e.currentTarget.style.transform = "scale(1)"; }}
    >
      {icon && <span style={{ fontSize: 26 }}>{icon}</span>}
      {children}
    </button>
  );
}

function Instruction({ icon, text, sub }) {
  return (
    <div style={{
      textAlign: "center", padding: "8px 20px",
    }}>
      <div style={{ fontSize: 64, marginBottom: 12, lineHeight: 1 }}>{icon}</div>
      <div style={{
        fontSize: 22, fontWeight: 800, color: COLORS.text,
        lineHeight: 1.3, fontFamily: "'Nunito', sans-serif",
      }}>{text}</div>
      {sub && (
        <div style={{
          fontSize: 15, color: COLORS.textMuted, fontWeight: 600,
          marginTop: 6, fontFamily: "'Nunito', sans-serif",
        }}>{sub}</div>
      )}
    </div>
  );
}

function ProgressPips({ current, total }) {
  return (
    <div style={{
      display: "flex", gap: 4, justifyContent: "center",
      padding: "8px 0",
    }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === current ? 28 : 8, height: 8, borderRadius: 4,
          background: i === current ? COLORS.calm : i < current ? COLORS.calm + "66" : COLORS.border,
          transition: "all 0.3s ease",
        }} />
      ))}
    </div>
  );
}

function BookSpine({ book, status, showArrow, arrowLabel, onClick }) {
  const isMisplaced = status === "misplaced";
  const isFixed = status === "fixed";
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      position: "relative",
    }}>
      {showArrow && (
        <div style={{
          position: "absolute", top: -32,
          display: "flex", flexDirection: "column", alignItems: "center",
          animation: "gentleBounce 2s ease-in-out infinite",
        }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: COLORS.warn }}>{arrowLabel}</span>
          <span style={{ fontSize: 16, color: COLORS.warn }}>↓</span>
        </div>
      )}
      <div
        onClick={onClick}
        style={{
          width: 48, height: 130, borderRadius: "4px 4px 2px 2px",
          background: `linear-gradient(180deg, ${book.color}, ${book.color}cc)`,
          border: isMisplaced ? `3px solid ${COLORS.warn}`
            : isFixed ? `3px solid ${COLORS.correct}`
            : status === "correct" ? `3px solid ${COLORS.correct}44`
            : "3px solid transparent",
          boxShadow: isMisplaced ? `0 0 12px ${COLORS.warn}44` : "0 2px 4px #00000015",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "space-between",
          padding: "8px 4px",
          cursor: onClick ? "pointer" : "default",
          transition: "all 0.3s ease",
        }}
      >
        <div style={{
          width: 16, height: 16, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {(status === "correct" || isFixed) ? <SHAPE_CORRECT /> : isMisplaced ? <SHAPE_WARN /> : null}
        </div>
        <span style={{
          writingMode: "vertical-rl", textOrientation: "mixed",
          fontSize: 9, color: "#fff", fontWeight: 800,
          fontFamily: "'Nunito', sans-serif",
          letterSpacing: 0.5, textShadow: "0 1px 2px #00000033",
        }}>{book.call}</span>
      </div>
      <span style={{
        fontSize: 10, color: COLORS.textMuted, marginTop: 4,
        fontWeight: 700, fontFamily: "'Nunito', sans-serif",
      }}>{book.call}</span>
    </div>
  );
}

function Shelf({ books, statuses, arrows, onTap }) {
  return (
    <div style={{
      background: "linear-gradient(180deg, #EDE5DA, #DDD4C8)",
      borderRadius: 12, padding: "20px 14px 14px",
      border: "2px solid #CFC5B8",
    }}>
      <div style={{ height: 5, background: "#BFB3A5", borderRadius: 3, marginBottom: 14 }} />
      <div style={{
        display: "flex", justifyContent: "center", gap: 8,
        alignItems: "flex-end", minHeight: 170, paddingTop: 30,
      }}>
        {books.map((book, i) => (
          <BookSpine
            key={book.id}
            book={book}
            status={statuses?.[i] || "none"}
            showArrow={arrows?.[i]?.show}
            arrowLabel={arrows?.[i]?.label}
            onClick={onTap ? () => onTap(i) : undefined}
          />
        ))}
      </div>
      <div style={{ height: 5, background: "#BFB3A5", borderRadius: 3, marginTop: 14 }} />
    </div>
  );
}

const BOOKS_INITIAL = [
  { id: 1, call: "FIC ADA", color: "#5B8FB9" },
  { id: 2, call: "FIC BRA", color: "#D4A574" },
  { id: 3, call: "FIC CLA", color: "#7A9E7E" },
  { id: 4, call: "FIC HER", color: "#C4785B" },
  { id: 5, call: "FIC DIC", color: "#8B7BB4" },
  { id: 6, call: "FIC LEG", color: "#B5838D" },
];

const BOOKS_FIXED = [
  { id: 1, call: "FIC ADA", color: "#5B8FB9" },
  { id: 2, call: "FIC BRA", color: "#D4A574" },
  { id: 3, call: "FIC CLA", color: "#7A9E7E" },
  { id: 5, call: "FIC DIC", color: "#8B7BB4" },
  { id: 4, call: "FIC HER", color: "#C4785B" },
  { id: 6, call: "FIC LEG", color: "#B5838D" },
];

export default function BuddyWork() {
  const [stepIdx, setStepIdx] = useState(0);
  const [scanProg, setScanProg] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const step = STEPS[stepIdx];

  const next = useCallback(() => setStepIdx(i => Math.min(i + 1, STEPS.length - 1)), []);
  const reset = useCallback(() => { setStepIdx(0); setScanProg(0); }, []);

  useEffect(() => {
    if (step === "scanning") {
      setScanProg(0);
      const iv = setInterval(() => {
        setScanProg(p => {
          if (p >= 100) { clearInterval(iv); setTimeout(next, 400); return 100; }
          return p + 3;
        });
      }, 80);
      return () => clearInterval(iv);
    }
  }, [step, next]);

  const resultStatuses = ["correct", "correct", "correct", "misplaced", "misplaced", "correct"];
  const fixedStatuses = ["correct", "correct", "correct", "fixed", "fixed", "correct"];

  return (
    <div style={{
      minHeight: "100vh",
      background: COLORS.bg,
      fontFamily: "'Nunito', sans-serif",
      display: "flex", justifyContent: "center",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gentleBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes scanMove {
          0% { top: 8px; }
          100% { top: calc(100% - 11px); }
        }
        @keyframes calmPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{
        width: "100%", maxWidth: 400, padding: "16px 16px 32px",
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        {/* HEADER */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: COLORS.calm, display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 18, color: "#fff", fontWeight: 900,
            }}>B</div>
            <span style={{ fontSize: 17, fontWeight: 800, color: COLORS.text }}>BuddyWork</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setReducedMotion(r => !r)} style={{
              background: reducedMotion ? COLORS.calm + "22" : COLORS.card,
              border: `1.5px solid ${reducedMotion ? COLORS.calm : COLORS.border}`,
              borderRadius: 8, padding: "6px 10px", cursor: "pointer",
              fontSize: 12, fontWeight: 700, color: COLORS.textMuted,
              fontFamily: "'Nunito', sans-serif",
            }} title="Reduce motion">
              {reducedMotion ? "🔇 Calm" : "✨ Full"}
            </button>
            {stepIdx > 0 && (
              <button onClick={reset} style={{
                background: COLORS.card, border: `1.5px solid ${COLORS.border}`,
                borderRadius: 8, padding: "6px 10px", cursor: "pointer",
                fontSize: 15,
              }}>🏠</button>
            )}
          </div>
        </div>

        {stepIdx > 0 && stepIdx < STEPS.length - 1 && (
          <ProgressPips current={stepIdx - 1} total={STEPS.length - 2} />
        )}

        {/* ===== WELCOME ===== */}
        {step === "welcome" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <div style={{
              textAlign: "center", padding: "32px 20px 24px",
              background: COLORS.card, borderRadius: 20,
              border: `1.5px solid ${COLORS.border}`,
            }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>👋</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: COLORS.text }}>
                Your Tasks Today
              </div>
              <div style={{ fontSize: 15, color: COLORS.textMuted, fontWeight: 600, marginTop: 4 }}>
                Tuesday, May 20
              </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Only show the available task prominently */}
              <button onClick={next} style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "20px", borderRadius: 16,
                border: `2px solid ${COLORS.calm}`,
                background: COLORS.card, cursor: "pointer",
                fontFamily: "'Nunito', sans-serif",
                boxShadow: `0 2px 12px ${COLORS.calm}15`,
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: COLORS.correctBg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 30,
                }}>📚</div>
                <div style={{ textAlign: "left", flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.text }}>Shelf Scan</div>
                  <div style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600 }}>Aisle 5 · Fiction A–F</div>
                </div>
                <div style={{
                  fontSize: 22, color: COLORS.calm, fontWeight: 900,
                }}>→</div>
              </button>

              {/* Upcoming tasks - minimal, no distraction */}
              <div style={{
                padding: "12px 16px", borderRadius: 12,
                background: COLORS.card, border: `1.5px solid ${COLORS.border}`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textMuted, marginBottom: 6 }}>
                  LATER TODAY
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  {[
                    { icon: "📦", label: "Returns" },
                    { icon: "🏷️", label: "Holds" },
                    { icon: "🔖", label: "Labels" },
                  ].map((t, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      fontSize: 13, color: COLORS.textMuted, fontWeight: 600,
                    }}>
                      <span>{t.icon}</span>{t.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== TASK OVERVIEW ===== */}
        {step === "task_select" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <Instruction
              icon="📚"
              text="Shelf Scan"
              sub="Aisle 5 · Fiction A–F"
            />
            <div style={{
              background: COLORS.card, borderRadius: 14, padding: 18,
              border: `1.5px solid ${COLORS.border}`, marginTop: 16,
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { icon: "🚶", text: "Go to aisle" },
                  { icon: "📷", text: "Scan shelf" },
                  { icon: "🔄", text: "Fix order" },
                ].map((s, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 14,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: COLORS.correctBg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22, flexShrink: 0,
                    }}>{s.icon}</div>
                    <span style={{
                      fontSize: 17, fontWeight: 700, color: COLORS.text,
                    }}>{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              <ActionButton onClick={next} icon="🚶">Start</ActionButton>
            </div>
          </div>
        )}

        {/* ===== GO TO AISLE ===== */}
        {step === "go_aisle" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <Instruction
              icon="🚶"
              text="Go to Aisle 5"
              sub="Fiction section"
            />
            <div style={{
              background: COLORS.card, borderRadius: 14, padding: 20,
              border: `1.5px solid ${COLORS.border}`, marginTop: 12,
              textAlign: "center",
            }}>
              <div style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 80, height: 80, borderRadius: 20,
                background: COLORS.correctBg, fontSize: 40, fontWeight: 900,
                color: COLORS.calm, fontFamily: "'Nunito', sans-serif",
              }}>5</div>
              <div style={{
                fontSize: 13, color: COLORS.textMuted, fontWeight: 600,
                marginTop: 10,
              }}>
                Look for this number above the shelves
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              <ActionButton onClick={next} icon="📍">I'm here</ActionButton>
            </div>
          </div>
        )}

        {/* ===== ARRIVED CONFIRMATION ===== */}
        {step === "arrived" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <Instruction
              icon="📷"
              text="Point camera at shelf 2"
              sub="Count from the top: 1, 2"
            />
            <div style={{
              background: COLORS.card, borderRadius: 14,
              border: `1.5px solid ${COLORS.border}`,
              padding: 20, marginTop: 12,
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[1, 2, 3].map(n => (
                  <div key={n} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: 10,
                    background: n === 2 ? COLORS.correctBg : COLORS.bg,
                    border: n === 2 ? `2px solid ${COLORS.calm}` : `2px solid transparent`,
                  }}>
                    <span style={{
                      fontSize: 15, fontWeight: 800,
                      color: n === 2 ? COLORS.calm : COLORS.textMuted,
                    }}>Shelf {n}</span>
                    {n === 2 && <span style={{
                      fontSize: 13, fontWeight: 700, color: COLORS.calm,
                    }}>← this one</span>}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              <ActionButton onClick={next} icon="📸">Open camera</ActionButton>
            </div>
          </div>
        )}

        {/* ===== CAMERA ===== */}
        {step === "camera" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <Instruction icon="📷" text="Hold steady" sub="Point at shelf 2" />
            <div style={{
              background: "#1E1E1E", borderRadius: 16, padding: 16,
              marginTop: 12,
            }}>
              <div style={{
                height: 200, borderRadius: 10,
                border: `2px dashed ${COLORS.calm}55`,
                background: "#2A2A2A",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
              }}>
                <span style={{ fontSize: 48, opacity: 0.5 }}>📷</span>
                <div style={{
                  position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
                  display: "flex", alignItems: "center", gap: 6,
                  background: "#00000088", borderRadius: 8, padding: "4px 12px",
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: "#E85454",
                    animation: reducedMotion ? "none" : "calmPulse 2s ease-in-out infinite",
                  }} />
                  <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>Camera ready</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              <ActionButton onClick={next} icon="🔍">Scan now</ActionButton>
            </div>
          </div>
        )}

        {/* ===== SCANNING ===== */}
        {step === "scanning" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <Instruction icon="🔍" text="Scanning..." sub={`${Math.min(Math.floor(scanProg / 17) + 1, 6)} of 6 books found`} />
            <div style={{
              background: "#1E1E1E", borderRadius: 16, padding: 16,
              marginTop: 12,
            }}>
              <div style={{
                height: 180, borderRadius: 10, background: "#2A2A2A",
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 5, position: "relative", overflow: "hidden",
              }}>
                {BOOKS_INITIAL.map(b => (
                  <div key={b.id} style={{
                    width: 28, height: 75, borderRadius: 3,
                    background: b.color, opacity: 0.6,
                  }} />
                ))}
                {!reducedMotion && <div style={{
                  position: "absolute", left: 8, right: 8,
                  height: 3, background: COLORS.calm,
                  boxShadow: `0 0 10px ${COLORS.calm}66`,
                  animation: "scanMove 2.5s ease-in-out infinite",
                }} />}
              </div>
            </div>
            <div style={{
              marginTop: 16, background: COLORS.card,
              borderRadius: 12, padding: 16,
              border: `1.5px solid ${COLORS.border}`,
            }}>
              <div style={{
                height: 10, borderRadius: 5, background: COLORS.bg,
                overflow: "hidden",
              }}>
                <div style={{
                  width: `${scanProg}%`, height: "100%", borderRadius: 5,
                  background: COLORS.calm,
                  transition: "width 0.15s linear",
                }} />
              </div>
              <div style={{
                textAlign: "center", marginTop: 8,
                fontSize: 14, fontWeight: 700, color: COLORS.calm,
              }}>{scanProg}%</div>
            </div>
          </div>
        )}

        {/* ===== RESULTS ===== */}
        {step === "results" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <Instruction icon="📋" text="Scan complete" />
            <div style={{
              display: "flex", gap: 10, marginTop: 8,
            }}>
              <div style={{
                flex: 1, padding: "14px 10px", borderRadius: 12,
                background: COLORS.correctBg, textAlign: "center",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                <SHAPE_CORRECT /><span style={{ fontSize: 18, fontWeight: 900, color: COLORS.calm }}>4 correct</span>
              </div>
              <div style={{
                flex: 1, padding: "14px 10px", borderRadius: 12,
                background: COLORS.warnBg, textAlign: "center",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                <SHAPE_WARN /><span style={{ fontSize: 18, fontWeight: 900, color: COLORS.warn }}>2 wrong</span>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <Shelf books={BOOKS_INITIAL} statuses={resultStatuses} />
            </div>
            <div style={{ marginTop: 16 }}>
              <ActionButton onClick={next} icon="🔄">Fix them</ActionButton>
            </div>
          </div>
        )}

        {/* ===== FIX STEP 1: Take out HER ===== */}
        {step === "fix_step1" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <Instruction icon="👆" text="Take out this book" />
            <div style={{ marginTop: 12 }}>
              <Shelf
                books={BOOKS_INITIAL}
                statuses={["correct", "correct", "correct", "misplaced", "none", "correct"]}
                arrows={[{}, {}, {}, { show: true, label: "Take out" }, {}, {}]}
              />
            </div>
            <div style={{
              marginTop: 14, background: COLORS.warnBg, borderRadius: 12,
              padding: "14px 16px", border: `1.5px solid ${COLORS.warnBorder}`,
              textAlign: "center",
            }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: COLORS.warn }}>
                FIC HER — hold it in your hand
              </span>
            </div>
            <div style={{ marginTop: 16 }}>
              <ActionButton onClick={next} icon="✅">Done</ActionButton>
            </div>
          </div>
        )}

        {/* ===== FIX STEP 2: Take out DIC ===== */}
        {step === "fix_step2" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <Instruction icon="👆" text="Take out this book too" />
            <div style={{ marginTop: 12 }}>
              <Shelf
                books={[
                  BOOKS_INITIAL[0], BOOKS_INITIAL[1], BOOKS_INITIAL[2],
                  { id: 99, call: "", color: "#E8EFEB" },
                  BOOKS_INITIAL[4],
                  BOOKS_INITIAL[5],
                ]}
                statuses={["correct", "correct", "correct", "none", "misplaced", "correct"]}
                arrows={[{}, {}, {}, {}, { show: true, label: "Take out" }, {}]}
              />
            </div>
            <div style={{
              marginTop: 14, background: COLORS.warnBg, borderRadius: 12,
              padding: "14px 16px", border: `1.5px solid ${COLORS.warnBorder}`,
              textAlign: "center",
            }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: COLORS.warn }}>
                FIC DIC — hold both books now
              </span>
            </div>
            <div style={{ marginTop: 16 }}>
              <ActionButton onClick={next} icon="✅">Done</ActionButton>
            </div>
          </div>
        )}

        {/* ===== FIX STEP 3: Put DIC in first ===== */}
        {step === "fix_step3" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <Instruction icon="📥" text="Put FIC DIC in first" sub="D comes before H" />
            <div style={{ marginTop: 12 }}>
              <Shelf
                books={[
                  BOOKS_INITIAL[0], BOOKS_INITIAL[1], BOOKS_INITIAL[2],
                  { id: 98, call: "?", color: COLORS.correctBg },
                  { id: 99, call: "", color: "#E8EFEB" },
                  BOOKS_INITIAL[5],
                ]}
                statuses={["correct", "correct", "correct", "none", "none", "correct"]}
                arrows={[{}, {}, {}, { show: true, label: "FIC DIC" }, {}, {}]}
              />
            </div>
            <div style={{
              marginTop: 14, background: COLORS.correctBg, borderRadius: 12,
              padding: "14px 16px", border: `1.5px solid ${COLORS.calm}44`,
              textAlign: "center",
            }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: COLORS.calm }}>
                D → H
              </span>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textMuted, marginTop: 4 }}>
                D comes first in the alphabet
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <ActionButton onClick={next} icon="✅">Done</ActionButton>
            </div>
          </div>
        )}

        {/* ===== FIX STEP 4: Put HER in second ===== */}
        {step === "fix_step4" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <Instruction icon="📥" text="Put FIC HER in next" />
            <div style={{ marginTop: 12 }}>
              <Shelf
                books={[
                  BOOKS_FIXED[0], BOOKS_FIXED[1], BOOKS_FIXED[2],
                  BOOKS_FIXED[3],
                  { id: 98, call: "?", color: COLORS.correctBg },
                  BOOKS_FIXED[5],
                ]}
                statuses={["correct", "correct", "correct", "fixed", "none", "correct"]}
                arrows={[{}, {}, {}, {}, { show: true, label: "FIC HER" }, {}]}
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <ActionButton onClick={next} icon="✅">Done</ActionButton>
            </div>
          </div>
        )}

        {/* ===== COMPLETE ===== */}
        {step === "complete" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <div style={{
              textAlign: "center", padding: "32px 20px",
              background: COLORS.card, borderRadius: 20,
              border: `2px solid ${COLORS.calm}44`,
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: COLORS.text }}>
                Shelf is correct
              </div>
              <div style={{
                display: "flex", justifyContent: "center", gap: 24, marginTop: 20,
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: COLORS.calm }}>6</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 700 }}>Checked</div>
                </div>
                <div style={{ width: 1, background: COLORS.border }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: COLORS.calm }}>2</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 700 }}>Fixed</div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <Shelf books={BOOKS_FIXED} statuses={fixedStatuses} />
            </div>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <ActionButton onClick={reset} icon="→">Next task</ActionButton>
              <ActionButton onClick={() => {}} secondary icon="😌">Break</ActionButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

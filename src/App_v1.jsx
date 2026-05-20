import { useState, useEffect } from "react";

const STEPS = {
  WELCOME: "welcome",
  TASK_SELECT: "task_select",
  GO_TO_AISLE: "go_to_aisle",
  OPEN_CAMERA: "open_camera",
  SCANNING: "scanning",
  RESULTS: "results",
  REORDER: "reorder",
  DONE: "done",
};

const TASKS = [
  { id: "shelf_scan", label: "Shelf Scan", icon: "📚", section: "Fiction A-F", priority: true },
  { id: "process_returns", label: "Process Returns", icon: "📦", disabled: true },
  { id: "hold_prep", label: "Prepare Holds", icon: "🏷️", disabled: true },
  { id: "label_new", label: "Label New Items", icon: "🔖", disabled: true },
];

const SHELF_BOOKS = [
  { id: 1, call: "FIC ADA", title: "The Hitchhiker's Guide", color: "#5B8FB9", correct: true, position: 1 },
  { id: 2, call: "FIC BRA", title: "Fahrenheit 451", color: "#D4A574", correct: true, position: 2 },
  { id: 3, call: "FIC CLA", title: "2001: A Space Odyssey", color: "#7A9E7E", correct: true, position: 3 },
  { id: 4, call: "FIC HER", title: "Dune", color: "#C4785B", correct: false, position: 4, shouldBe: 5 },
  { id: 5, call: "FIC DIC", title: "Do Androids Dream?", color: "#8B7BB4", correct: false, position: 5, shouldBe: 4 },
  { id: 6, call: "FIC LEG", title: "A Wrinkle in Time", color: "#B5838D", correct: true, position: 6 },
];

function VoiceText({ text, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  if (!visible) return null;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16,
      animation: "fadeSlideUp 0.5s ease-out",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg, #6BB5A0, #4A9A85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, color: "#fff", fontWeight: 700,
      }}>B</div>
      <div style={{
        background: "#F0F7F4", borderRadius: "4px 16px 16px 16px",
        padding: "12px 16px", fontSize: 17, lineHeight: 1.5,
        color: "#2D3B35", fontFamily: "'Nunito', sans-serif",
        maxWidth: "85%",
      }}>
        {text}
      </div>
    </div>
  );
}

function BigButton({ children, onClick, color = "#6BB5A0", disabled = false, style = {} }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        width: "100%", padding: "18px 24px", fontSize: 19, fontWeight: 700,
        fontFamily: "'Nunito', sans-serif",
        border: "none", borderRadius: 16, cursor: disabled ? "default" : "pointer",
        background: disabled ? "#D5DDD9" : `linear-gradient(135deg, ${color}, ${color}dd)`,
        color: disabled ? "#9BA8A1" : "#fff",
        boxShadow: disabled ? "none" : `0 4px 14px ${color}44`,
        transition: "all 0.2s ease",
        transform: disabled ? "none" : "translateY(0)",
        ...style,
      }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = "translateY(2px)"; }}
      onMouseUp={e => { if (!disabled) e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {children}
    </button>
  );
}

function ProgressBar({ current, total }) {
  const pct = (current / total) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
      <div style={{
        flex: 1, height: 8, borderRadius: 4, background: "#E8EFEB",
        overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 4,
          background: "linear-gradient(90deg, #6BB5A0, #4A9A85)",
          transition: "width 0.6s ease",
        }} />
      </div>
      <span style={{
        fontSize: 13, color: "#7A8F84", fontWeight: 700,
        fontFamily: "'Nunito', sans-serif",
      }}>
        {current}/{total}
      </span>
    </div>
  );
}

function StepDots({ current, total }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 20 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === current ? 24 : 8, height: 8, borderRadius: 4,
          background: i === current ? "#6BB5A0" : i < current ? "#A8D5C8" : "#DCE5E0",
          transition: "all 0.3s ease",
        }} />
      ))}
    </div>
  );
}

function BookSpine({ book, highlight, onClick, showArrow, arrowDir }) {
  const isSwap = highlight === "yellow";
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {showArrow && arrowDir === "left" && (
        <div style={{
          position: "absolute", top: -28, fontSize: 22,
          animation: "bounceLeft 1s ease-in-out infinite",
          color: "#E8A838",
        }}>← move here</div>
      )}
      {showArrow && arrowDir === "right" && (
        <div style={{
          position: "absolute", top: -28, fontSize: 22,
          animation: "bounceRight 1s ease-in-out infinite",
          color: "#E8A838",
        }}>move here →</div>
      )}
      <div
        onClick={onClick}
        style={{
          width: 52, height: 140, borderRadius: "4px 4px 2px 2px",
          background: `linear-gradient(180deg, ${book.color}, ${book.color}cc)`,
          border: isSwap ? "3px solid #E8A838" : highlight === "green" ? "3px solid #6BB5A0" : "3px solid transparent",
          boxShadow: isSwap
            ? "0 0 16px #E8A844"
            : highlight === "green" ? "0 0 12px #6BB5A044" : "0 2px 6px #00000022",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: 4, cursor: onClick ? "pointer" : "default",
          transition: "all 0.3s ease",
          animation: isSwap ? "pulse 1.5s ease-in-out infinite" : "none",
        }}
      >
        <span style={{
          writingMode: "vertical-rl", textOrientation: "mixed",
          fontSize: 9, color: "#fff", fontWeight: 700,
          fontFamily: "'Nunito', sans-serif", letterSpacing: 0.5,
          textShadow: "0 1px 2px #00000044",
        }}>{book.call}</span>
      </div>
      <span style={{
        fontSize: 10, color: "#7A8F84", marginTop: 4,
        fontFamily: "'Nunito', sans-serif", textAlign: "center",
        maxWidth: 60, lineHeight: 1.2,
      }}>{book.title}</span>
    </div>
  );
}

function ShelfDisplay({ books, mode, onSwap }) {
  return (
    <div style={{
      background: "linear-gradient(180deg, #F5EDE4, #E8DDD2)",
      borderRadius: 12, padding: "20px 16px 16px",
      border: "2px solid #D4C8BB",
      boxShadow: "inset 0 2px 8px #00000011, 0 4px 12px #00000011",
    }}>
      <div style={{
        height: 6, background: "#C4B5A5", borderRadius: 3,
        marginBottom: 12, boxShadow: "0 2px 4px #00000011",
      }} />
      <div style={{
        display: "flex", justifyContent: "center", gap: 8,
        alignItems: "flex-end", minHeight: 160,
      }}>
        {books.map((book) => {
          let highlight = "none";
          if (mode === "results" || mode === "reorder") {
            highlight = book.correct ? "green" : "yellow";
          }
          return (
            <BookSpine
              key={book.id}
              book={book}
              highlight={highlight}
              onClick={!book.correct && mode === "reorder" ? () => onSwap(book.id) : undefined}
              showArrow={mode === "reorder" && !book.correct}
              arrowDir={book.position < book.shouldBe ? "right" : "left"}
            />
          );
        })}
      </div>
      <div style={{
        height: 6, background: "#C4B5A5", borderRadius: 3,
        marginTop: 12, boxShadow: "0 -1px 4px #00000011",
      }} />
    </div>
  );
}

export default function BuddyWork() {
  const [step, setStep] = useState(STEPS.WELCOME);
  const [books, setBooks] = useState(SHELF_BOOKS);
  const [scanProgress, setScanProgress] = useState(0);
  const [swapped, setSwapped] = useState(false);
  const stepIndex = Object.values(STEPS).indexOf(step);

  useEffect(() => {
    if (step === STEPS.SCANNING) {
      const interval = setInterval(() => {
        setScanProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setTimeout(() => setStep(STEPS.RESULTS), 600);
            return 100;
          }
          return p + 2;
        });
      }, 80);
      return () => clearInterval(interval);
    }
  }, [step]);

  const handleSwap = () => {
    const newBooks = [...books];
    const i4 = newBooks.findIndex(b => b.id === 4);
    const i5 = newBooks.findIndex(b => b.id === 5);
    const temp = { ...newBooks[i4] };
    newBooks[i4] = { ...newBooks[i5], position: newBooks[i4].position, correct: true };
    newBooks[i5] = { ...temp, position: newBooks[i5].position, correct: true };
    setBooks(newBooks);
    setSwapped(true);
    setTimeout(() => setStep(STEPS.DONE), 1500);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #F7FAF8 0%, #EDF3EF 100%)",
      fontFamily: "'Nunito', sans-serif",
      display: "flex", justifyContent: "center",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes bounceLeft {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-6px); }
        }
        @keyframes bounceRight {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(6px); }
        }
        @keyframes scanLine {
          0% { top: 0; }
          100% { top: calc(100% - 3px); }
        }
        @keyframes celebratePop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-60px) rotate(360deg); opacity: 0; }
        }
      `}</style>

      <div style={{
        width: "100%", maxWidth: 420, padding: "20px 16px",
        display: "flex", flexDirection: "column",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: "linear-gradient(135deg, #6BB5A0, #4A9A85)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, color: "#fff", fontWeight: 800,
              boxShadow: "0 3px 10px #6BB5A044",
            }}>B</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#2D3B35" }}>BuddyWork</div>
              <div style={{ fontSize: 12, color: "#7A8F84", fontWeight: 600 }}>Your Job Coach</div>
            </div>
          </div>
          {step !== STEPS.WELCOME && (
            <button
              onClick={() => { setStep(STEPS.WELCOME); setBooks(SHELF_BOOKS); setScanProgress(0); setSwapped(false); }}
              style={{
                background: "#E8EFEB", border: "none", borderRadius: 10,
                padding: "8px 14px", fontSize: 13, fontWeight: 700,
                color: "#7A8F84", cursor: "pointer", fontFamily: "'Nunito', sans-serif",
              }}
            >🏠 Home</button>
          )}
        </div>

        {step !== STEPS.WELCOME && step !== STEPS.DONE && (
          <StepDots current={stepIndex - 1} total={6} />
        )}

        {/* WELCOME */}
        {step === STEPS.WELCOME && (
          <div style={{ animation: "fadeSlideUp 0.5s ease-out" }}>
            <div style={{
              textAlign: "center", marginBottom: 24, padding: "28px 20px",
              background: "linear-gradient(135deg, #6BB5A0, #4A9A85)",
              borderRadius: 20, color: "#fff",
              boxShadow: "0 6px 20px #6BB5A044",
            }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>👋</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Good morning!</div>
              <div style={{ fontSize: 16, opacity: 0.9, fontWeight: 600 }}>Tuesday, May 20</div>
              <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>You have 4 tasks today</div>
            </div>
            <VoiceText text="Hi there! Here are your tasks for today. Tap the one you'd like to start with." />
            <div style={{
              fontSize: 14, fontWeight: 700, color: "#7A8F84",
              marginBottom: 10, textTransform: "uppercase", letterSpacing: 1,
            }}>Today's Tasks</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {TASKS.map(task => (
                <button
                  key={task.id}
                  onClick={() => !task.disabled && setStep(STEPS.TASK_SELECT)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "16px 18px", borderRadius: 14,
                    border: task.priority ? "2px solid #6BB5A0" : "2px solid #E8EFEB",
                    background: task.disabled ? "#F5F8F6" : "#fff",
                    cursor: task.disabled ? "default" : "pointer",
                    opacity: task.disabled ? 0.5 : 1,
                    boxShadow: task.priority ? "0 3px 12px #6BB5A022" : "none",
                    transition: "all 0.2s ease",
                    fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  <span style={{ fontSize: 28 }}>{task.icon}</span>
                  <div style={{ textAlign: "left", flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: task.disabled ? "#9BA8A1" : "#2D3B35" }}>
                      {task.label}
                    </div>
                    {task.section && (
                      <div style={{ fontSize: 13, color: "#7A8F84", fontWeight: 600 }}>{task.section}</div>
                    )}
                  </div>
                  {task.priority && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: "#6BB5A0",
                      background: "#E8F5EF", padding: "4px 10px", borderRadius: 8,
                    }}>START</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TASK SELECTED - SHELF SCAN */}
        {step === STEPS.TASK_SELECT && (
          <div style={{ animation: "fadeSlideUp 0.5s ease-out" }}>
            <div style={{
              textAlign: "center", padding: "24px 20px", marginBottom: 20,
              background: "#fff", borderRadius: 16,
              boxShadow: "0 2px 12px #00000008",
            }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>📚</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#2D3B35" }}>Shelf Scan</div>
              <div style={{ fontSize: 15, color: "#7A8F84", fontWeight: 600, marginTop: 4 }}>
                Fiction Section A–F
              </div>
            </div>
            <VoiceText text="Great choice! For this task, you'll scan a shelf to check if all books are in the right order. I'll guide you through every step." />
            <div style={{
              background: "#fff", borderRadius: 14, padding: 16, marginBottom: 20,
              boxShadow: "0 2px 8px #00000008",
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#7A8F84", marginBottom: 10 }}>WHAT YOU'LL DO</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {["Go to Aisle 5", "Scan the second shelf", "Fix any misplaced books"].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: "#E8F5EF", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#6BB5A0",
                    }}>{i + 1}</div>
                    <span style={{ fontSize: 15, color: "#2D3B35", fontWeight: 600 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <BigButton onClick={() => setStep(STEPS.GO_TO_AISLE)}>
              Let's Start! →
            </BigButton>
          </div>
        )}

        {/* GO TO AISLE */}
        {step === STEPS.GO_TO_AISLE && (
          <div style={{ animation: "fadeSlideUp 0.5s ease-out" }}>
            <VoiceText text="Walk to Aisle 5 in the Fiction section. It's near the back of the library, past the reading area." />
            <div style={{
              background: "#fff", borderRadius: 16, padding: 24,
              textAlign: "center", marginBottom: 20,
              boxShadow: "0 2px 12px #00000008",
            }}>
              <div style={{
                width: 100, height: 100, borderRadius: "50%", margin: "0 auto 16px",
                background: "linear-gradient(135deg, #E8F5EF, #D0EBDF)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 40,
              }}>🚶</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#2D3B35", marginBottom: 4 }}>
                Go to Aisle 5
              </div>
              <div style={{ fontSize: 16, color: "#7A8F84", fontWeight: 600 }}>Fiction Section</div>
              <div style={{
                marginTop: 16, padding: "12px 16px", background: "#FFF8EE",
                borderRadius: 10, border: "1px solid #F0DFC0",
                fontSize: 14, color: "#A68A5B", fontWeight: 600,
              }}>
                💡 Look for the big "5" sign hanging above the shelves
              </div>
            </div>
            <BigButton onClick={() => setStep(STEPS.OPEN_CAMERA)}>
              ✅ I'm Here!
            </BigButton>
          </div>
        )}

        {/* OPEN CAMERA */}
        {step === STEPS.OPEN_CAMERA && (
          <div style={{ animation: "fadeSlideUp 0.5s ease-out" }}>
            <VoiceText text="Now point your phone camera at the second shelf from the top. Hold it steady so I can read the book labels." />
            <div style={{
              background: "#1a1a1a", borderRadius: 16, padding: 20,
              marginBottom: 20, position: "relative", overflow: "hidden",
              boxShadow: "0 4px 16px #00000022",
            }}>
              <div style={{
                height: 220, borderRadius: 10, border: "2px dashed #6BB5A066",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 12,
                background: "linear-gradient(135deg, #2a2a2a, #1a1a1a)",
              }}>
                <div style={{ fontSize: 48 }}>📷</div>
                <div style={{ color: "#6BB5A0", fontSize: 16, fontWeight: 700 }}>
                  Point at 2nd shelf
                </div>
                <div style={{ color: "#666", fontSize: 13, fontWeight: 600 }}>
                  Hold steady for best results
                </div>
              </div>
              <div style={{
                position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
                background: "#6BB5A0", width: 10, height: 10, borderRadius: "50%",
                boxShadow: "0 0 8px #6BB5A088",
                animation: "pulse 2s ease-in-out infinite",
              }} />
            </div>
            <div style={{
              background: "#fff", borderRadius: 12, padding: 14, marginBottom: 20,
              display: "flex", alignItems: "center", gap: 10,
              boxShadow: "0 2px 8px #00000008",
            }}>
              <span style={{ fontSize: 20 }}>☝️</span>
              <span style={{ fontSize: 14, color: "#7A8F84", fontWeight: 600 }}>
                Count from the top: skip the first shelf, scan the second one
              </span>
            </div>
            <BigButton onClick={() => { setScanProgress(0); setStep(STEPS.SCANNING); }}>
              📸 Start Scanning
            </BigButton>
          </div>
        )}

        {/* SCANNING */}
        {step === STEPS.SCANNING && (
          <div style={{ animation: "fadeSlideUp 0.5s ease-out" }}>
            <VoiceText text="Scanning... hold still, I'm reading the labels. Almost there!" />
            <div style={{
              background: "#1a1a1a", borderRadius: 16, padding: 20,
              marginBottom: 20, position: "relative",
              boxShadow: "0 4px 16px #00000022",
            }}>
              <div style={{
                height: 220, borderRadius: 10, position: "relative",
                overflow: "hidden",
                background: "linear-gradient(135deg, #2a2a2a, #1a1a1a)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  display: "flex", gap: 6, alignItems: "flex-end",
                }}>
                  {SHELF_BOOKS.map(b => (
                    <div key={b.id} style={{
                      width: 30, height: 80, borderRadius: 3,
                      background: b.color, opacity: 0.7,
                    }} />
                  ))}
                </div>
                <div style={{
                  position: "absolute", left: 10, right: 10,
                  height: 3, background: "#6BB5A0",
                  boxShadow: "0 0 12px #6BB5A088",
                  animation: "scanLine 2s ease-in-out infinite",
                }} />
              </div>
            </div>
            <div style={{
              background: "#fff", borderRadius: 14, padding: 18,
              boxShadow: "0 2px 8px #00000008",
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                marginBottom: 8, fontSize: 14, fontWeight: 700,
              }}>
                <span style={{ color: "#2D3B35" }}>Reading labels...</span>
                <span style={{ color: "#6BB5A0" }}>{scanProgress}%</span>
              </div>
              <div style={{
                height: 12, borderRadius: 6, background: "#E8EFEB",
                overflow: "hidden",
              }}>
                <div style={{
                  width: `${scanProgress}%`, height: "100%", borderRadius: 6,
                  background: "linear-gradient(90deg, #6BB5A0, #4A9A85)",
                  transition: "width 0.15s linear",
                }} />
              </div>
              <div style={{
                marginTop: 10, fontSize: 13, color: "#7A8F84",
                fontWeight: 600, textAlign: "center",
              }}>
                Found {Math.min(Math.floor(scanProgress / 17) + 1, 6)} of 6 books
              </div>
            </div>
          </div>
        )}

        {/* RESULTS */}
        {step === STEPS.RESULTS && (
          <div style={{ animation: "fadeSlideUp 0.5s ease-out" }}>
            <VoiceText text="Scan complete! I found 2 books that are in the wrong order. They're highlighted in yellow below." />
            <div style={{
              display: "flex", gap: 10, marginBottom: 16,
            }}>
              <div style={{
                flex: 1, background: "#E8F5EF", borderRadius: 12, padding: 14,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#4A9A85" }}>4</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6BB5A0" }}>✅ Correct</div>
              </div>
              <div style={{
                flex: 1, background: "#FFF5E5", borderRadius: 12, padding: 14,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#D4920B" }}>2</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#E8A838" }}>⚠️ Misplaced</div>
              </div>
            </div>
            <ShelfDisplay books={books} mode="results" onSwap={() => {}} />
            <div style={{
              marginTop: 16, background: "#FFF5E5", borderRadius: 12,
              padding: 14, border: "1px solid #F0DFC0",
              fontSize: 14, color: "#A68A5B", fontWeight: 600, lineHeight: 1.5,
            }}>
              ⚠️ <strong>FIC DIC</strong> should come before <strong>FIC HER</strong> — D comes before H in the alphabet
            </div>
            <div style={{ marginTop: 16 }}>
              <BigButton onClick={() => setStep(STEPS.REORDER)} color="#E8A838">
                Fix These Books →
              </BigButton>
            </div>
          </div>
        )}

        {/* REORDER */}
        {step === STEPS.REORDER && !swapped && (
          <div style={{ animation: "fadeSlideUp 0.5s ease-out" }}>
            <VoiceText text="Swap the two yellow books. Take out FIC DIC and FIC HER, then put FIC DIC first and FIC HER second. Tap the yellow books when done!" />
            <div style={{
              background: "#fff", borderRadius: 14, padding: 16, marginBottom: 16,
              boxShadow: "0 2px 8px #00000008",
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#2D3B35", marginBottom: 12 }}>
                📋 Steps to fix:
              </div>
              {[
                "Take out the book labeled FIC HER",
                "Take out the book labeled FIC DIC",
                "Put FIC DIC in first (D before H)",
                "Put FIC HER after it",
                "Tap a yellow book when done!"
              ].map((s, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "8px 0", borderBottom: i < 4 ? "1px solid #F0F4F2" : "none",
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                    background: i === 4 ? "#6BB5A0" : "#E8EFEB",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800,
                    color: i === 4 ? "#fff" : "#7A8F84",
                  }}>{i + 1}</div>
                  <span style={{
                    fontSize: 14, color: "#2D3B35", fontWeight: 600, lineHeight: 1.4,
                  }}>{s}</span>
                </div>
              ))}
            </div>
            <ShelfDisplay books={books} mode="reorder" onSwap={handleSwap} />
          </div>
        )}

        {/* DONE */}
        {step === STEPS.DONE && (
          <div style={{ animation: "fadeSlideUp 0.5s ease-out", textAlign: "center" }}>
            <div style={{ position: "relative", marginBottom: 20 }}>
              {["🎉", "⭐", "✨", "🌟", "💚"].map((e, i) => (
                <span key={i} style={{
                  position: "absolute",
                  left: `${20 + i * 15}%`, top: 0,
                  fontSize: 24,
                  animation: `confetti 1.5s ease-out ${i * 0.15}s forwards`,
                }}>{e}</span>
              ))}
            </div>
            <div style={{
              padding: "32px 20px", marginTop: 40,
              background: "linear-gradient(135deg, #6BB5A0, #4A9A85)",
              borderRadius: 20, color: "#fff",
              boxShadow: "0 6px 24px #6BB5A044",
              animation: "celebratePop 0.6s ease-out",
            }}>
              <div style={{ fontSize: 56, marginBottom: 8 }}>🏆</div>
              <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 4 }}>Great Job!</div>
              <div style={{ fontSize: 16, opacity: 0.9, fontWeight: 600 }}>
                Shelf scan complete
              </div>
              <div style={{
                marginTop: 16, display: "flex", justifyContent: "center", gap: 20,
              }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>6</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Books checked</div>
                </div>
                <div style={{ width: 1, background: "#ffffff44" }} />
                <div>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>2</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Fixed</div>
                </div>
                <div style={{ width: 1, background: "#ffffff44" }} />
                <div>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>100%</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Accuracy</div>
                </div>
              </div>
            </div>
            <VoiceText
              text="Awesome work! That shelf is perfect now. Ready for your next task, or would you like to take a break?"
              delay={600}
            />
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <BigButton onClick={() => { setStep(STEPS.WELCOME); setBooks(SHELF_BOOKS); setScanProgress(0); setSwapped(false); }}>
                Next Task →
              </BigButton>
              <BigButton onClick={() => {}} color="#A8D5C8" style={{ color: "#2D3B35" }}>
                😌 Take a Break
              </BigButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from "react";

const STEPS = [
  "welcome", "task_select", "go_aisle", "arrived",
  "camera", "scanning", "results", "fix_step1",
  "fix_step2", "fix_step3", "fix_step4", "complete"
];

const VOICE_LINES = {
  welcome: "Your tasks for today are ready. Tap Shelf Scan to begin.",
  task_select: "Shelf Scan. You will go to the aisle, scan the shelf, and fix any books out of order. Tap Start when ready.",
  go_aisle: "Walk to Aisle 5 in the Fiction section. Look for the number 5 sign above the shelves. Tap I'm here when you arrive.",
  arrived: "Point your phone camera at the second shelf from the top. Count down from the top. One. Two. That's the shelf. Tap Open camera.",
  camera: "Hold your phone steady and point it at the shelf. Tap Scan now when ready.",
  scanning: "Scanning. Hold still.",
  results: "Scan complete. 4 books are correct. 2 books are in the wrong place. Tap Fix them to start.",
  fix_step1: "Take out the book labeled FIC HER. Hold it in your hand. Tap Done when you have it.",
  fix_step2: "Now take out the book labeled FIC DIC. You should be holding two books now. Tap Done.",
  fix_step3: "Put FIC DIC in first. D comes before H in the alphabet. Tap Done when it's on the shelf.",
  fix_step4: "Put FIC HER in the spot right after FIC DIC. Tap Done when it's on the shelf.",
  complete: "Shelf is correct. You checked 6 books and fixed 2. Nice work.",
};

const C = {
  calm: "#5A9E8F", calmDark: "#3D7A6B", warn: "#D4920B",
  warnBg: "#FFF7E8", warnBorder: "#F0DFC0", correctBg: "#E6F2EE",
  surface: "#FAFCFB", card: "#FFFFFF", text: "#2C3530",
  muted: "#6E7F76", border: "#E2E8E4", bg: "#F2F5F3",
  gold: "#D4A017", goldBg: "#FFF9E8",
};

const CheckShape = () => (
  <svg width="20" height="20" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="9" fill={C.calm} />
    <path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const WarnShape = () => (
  <svg width="20" height="20" viewBox="0 0 20 20">
    <polygon points="10,2 19,18 1,18" fill={C.warn} />
    <text x="10" y="15" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800">!</text>
  </svg>
);

/* ============ VOICE ENGINE ============ */
function useVoice() {
  const utterRef = useRef(null);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [speed, setSpeed] = useState(0.85);

  const speak = useCallback((text) => {
    if (!voiceOn || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = speed;
    u.pitch = 1.0;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    // pick a calm, clear voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes("Samantha"))
      || voices.find(v => v.name.includes("Google") && v.lang.startsWith("en"))
      || voices.find(v => v.lang.startsWith("en"));
    if (preferred) u.voice = preferred;
    utterRef.current = u;
    window.speechSynthesis.speak(u);
  }, [voiceOn, speed]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const replay = useCallback(() => {
    if (utterRef.current) {
      window.speechSynthesis?.cancel();
      const u = new SpeechSynthesisUtterance(utterRef.current.text);
      u.rate = speed;
      u.pitch = 1.0;
      if (utterRef.current.voice) u.voice = utterRef.current.voice;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    }
  }, [speed]);

  return { speak, stop, replay, speaking, voiceOn, setVoiceOn, speed, setSpeed };
}

/* ============ COMPONENTS ============ */
function VoiceBar({ speaking, voiceOn, setVoiceOn, speed, setSpeed, onReplay }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: C.card, borderRadius: 12, padding: "8px 12px",
      border: `1.5px solid ${C.border}`,
    }}>
      <button onClick={() => setVoiceOn(v => !v)} style={{
        width: 36, height: 36, borderRadius: 10, border: "none",
        background: voiceOn ? C.correctBg : C.bg, cursor: "pointer",
        fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
      }}>{voiceOn ? "🔊" : "🔇"}</button>
      {voiceOn && (
        <>
          <button onClick={onReplay} style={{
            width: 36, height: 36, borderRadius: 10, border: "none",
            background: C.bg, cursor: "pointer", fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>🔄</button>
          <div style={{
            display: "flex", alignItems: "center", gap: 4, marginLeft: 4,
          }}>
            {[0.6, 0.85, 1.1].map(s => (
              <button key={s} onClick={() => setSpeed(s)} style={{
                padding: "4px 8px", borderRadius: 6, border: "none",
                background: speed === s ? C.calm : C.bg,
                color: speed === s ? "#fff" : C.muted,
                fontSize: 11, fontWeight: 800, cursor: "pointer",
                fontFamily: "'Nunito', sans-serif",
              }}>{s === 0.6 ? "Slow" : s === 0.85 ? "Med" : "Fast"}</button>
            ))}
          </div>
        </>
      )}
      {speaking && (
        <div style={{
          display: "flex", alignItems: "center", gap: 3, marginLeft: "auto",
        }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 3, borderRadius: 2, background: C.calm,
              animation: `bar ${0.4 + i*0.15}s ease-in-out infinite alternate`,
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionButton({ children, onClick, secondary, icon, disabled }) {
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      width: "100%", padding: "20px 24px", fontSize: 20, fontWeight: 800,
      fontFamily: "'Nunito', sans-serif", letterSpacing: 0.3,
      border: secondary ? `2px solid ${C.border}` : "none", borderRadius: 16,
      cursor: disabled ? "default" : "pointer",
      background: disabled ? "#D5DDD9" : secondary ? C.card : C.calm,
      color: disabled ? "#9BA8A1" : secondary ? C.text : "#fff",
      boxShadow: disabled || secondary ? "none" : `0 4px 16px ${C.calm}33`,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
      transition: "transform 0.1s ease",
    }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={e => { if (!disabled) e.currentTarget.style.transform = "scale(1)"; }}
    >{icon && <span style={{ fontSize: 26 }}>{icon}</span>}{children}</button>
  );
}

function Instruction({ icon, text, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "8px 20px" }}>
      <div style={{ fontSize: 60, marginBottom: 10, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text, lineHeight: 1.3, fontFamily: "'Nunito', sans-serif" }}>{text}</div>
      {sub && <div style={{ fontSize: 15, color: C.muted, fontWeight: 600, marginTop: 6, fontFamily: "'Nunito', sans-serif" }}>{sub}</div>}
    </div>
  );
}

function ProgressPips({ current, total }) {
  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "center", padding: "6px 0" }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === current ? 28 : 8, height: 8, borderRadius: 4,
          background: i === current ? C.calm : i < current ? C.calm + "55" : C.border,
          transition: "all 0.3s ease",
        }} />
      ))}
    </div>
  );
}

function BookSpine({ book, status, arrow }) {
  const mis = status === "misplaced";
  const fix = status === "fixed";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
      {arrow && (
        <div style={{
          position: "absolute", top: -30, display: "flex", flexDirection: "column", alignItems: "center",
          animation: "gentleBounce 2s ease-in-out infinite",
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: C.warn }}>{arrow}</span>
          <span style={{ fontSize: 14, color: C.warn }}>↓</span>
        </div>
      )}
      <div style={{
        width: 46, height: 125, borderRadius: "4px 4px 2px 2px",
        background: `linear-gradient(180deg, ${book.color}, ${book.color}cc)`,
        border: mis ? `3px solid ${C.warn}` : fix ? `3px solid ${C.calm}` : status === "correct" ? `3px solid ${C.calm}44` : "3px solid transparent",
        boxShadow: mis ? `0 0 10px ${C.warn}44` : "0 2px 4px #00000015",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
        padding: "8px 3px",
      }}>
        <div style={{ width: 16, height: 16, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {(status === "correct" || fix) ? <CheckShape /> : mis ? <WarnShape /> : null}
        </div>
        <span style={{
          writingMode: "vertical-rl", textOrientation: "mixed", fontSize: 9, color: "#fff",
          fontWeight: 800, fontFamily: "'Nunito', sans-serif", textShadow: "0 1px 2px #00000033",
        }}>{book.call}</span>
      </div>
      <span style={{ fontSize: 10, color: C.muted, marginTop: 3, fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>{book.call}</span>
    </div>
  );
}

function Shelf({ books, statuses, arrows }) {
  return (
    <div style={{
      background: "linear-gradient(180deg, #EDE5DA, #DDD4C8)", borderRadius: 12,
      padding: "18px 12px 12px", border: "2px solid #CFC5B8",
    }}>
      <div style={{ height: 5, background: "#BFB3A5", borderRadius: 3, marginBottom: 12 }} />
      <div style={{ display: "flex", justifyContent: "center", gap: 7, alignItems: "flex-end", minHeight: 165, paddingTop: 28 }}>
        {books.map((book, i) => (
          <BookSpine key={book.id} book={book} status={statuses?.[i] || "none"} arrow={arrows?.[i]} />
        ))}
      </div>
      <div style={{ height: 5, background: "#BFB3A5", borderRadius: 3, marginTop: 12 }} />
    </div>
  );
}

/* ============ CELEBRATION ============ */
function CelebrationScreen({ celebLevel, onNext, onBreak, reducedMotion }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 200); }, []);

  // Stars earned based on performance - always 3 for demo
  const stars = 3;

  return (
    <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.5s ease" }}>

      {/* === CALM (default) === */}
      {celebLevel === "calm" && (
        <div style={{
          textAlign: "center", padding: "36px 20px",
          background: C.card, borderRadius: 20,
          border: `2px solid ${C.calm}44`,
        }}>
          <div style={{
            fontSize: 52, marginBottom: 12,
            transition: "transform 0.5s ease",
            transform: show ? "scale(1)" : "scale(0.8)",
          }}>✓</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.text }}>
            Shelf is correct
          </div>
          <div style={{
            display: "flex", justifyContent: "center", gap: 24, marginTop: 24,
          }}>
            {[
              { n: "6", l: "Checked" },
              { n: "2", l: "Fixed" },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: C.calm }}>{s.n}</div>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === MEDIUM === */}
      {celebLevel === "medium" && (
        <div style={{
          textAlign: "center", padding: "32px 20px",
          background: `linear-gradient(160deg, ${C.card}, ${C.correctBg})`,
          borderRadius: 20, border: `2px solid ${C.calm}44`,
        }}>
          <div style={{
            display: "flex", justifyContent: "center", gap: 6, marginBottom: 16,
          }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                fontSize: 32,
                opacity: show ? 1 : 0,
                transform: show ? "translateY(0) scale(1)" : "translateY(10px) scale(0.5)",
                transition: reducedMotion ? "none" : `all 0.4s ease ${i * 0.15 + 0.2}s`,
                filter: i < stars ? "none" : "grayscale(1) opacity(0.3)",
              }}>⭐</div>
            ))}
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>
            Shelf is correct
          </div>
          <div style={{ fontSize: 15, color: C.muted, fontWeight: 600, marginTop: 6 }}>
            6 checked · 2 fixed
          </div>
          <div style={{
            marginTop: 20, padding: "12px 16px",
            background: C.goldBg, borderRadius: 12,
            border: `1.5px solid ${C.gold}33`,
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.gold }}>
              🏅 3 shelves completed today
            </span>
          </div>
        </div>
      )}

      {/* === FULL === */}
      {celebLevel === "full" && (
        <div style={{
          textAlign: "center", padding: "28px 20px",
          background: `linear-gradient(160deg, ${C.correctBg}, ${C.goldBg})`,
          borderRadius: 20, border: `2px solid ${C.gold}44`,
          position: "relative", overflow: "hidden",
        }}>
          {!reducedMotion && (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              {["✨","⭐","🌟","💚","✨","⭐","🌟","💚"].map((e, i) => (
                <span key={i} style={{
                  position: "absolute",
                  left: `${10 + (i * 12) % 80}%`,
                  top: `${5 + (i * 17) % 50}%`,
                  fontSize: 16, opacity: 0,
                  animation: `sparkle 2s ease-out ${i * 0.2}s forwards`,
                }}>{e}</span>
              ))}
            </div>
          )}
          <div style={{
            display: "flex", justifyContent: "center", gap: 4, marginBottom: 12,
          }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                fontSize: 36, opacity: show ? 1 : 0,
                transform: show ? "translateY(0) scale(1) rotate(0deg)" : "translateY(20px) scale(0) rotate(-30deg)",
                transition: reducedMotion ? "none" : `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.2 + 0.2}s`,
              }}>⭐</div>
            ))}
          </div>
          <div style={{
            fontSize: 24, fontWeight: 900, color: C.text,
            opacity: show ? 1 : 0,
            transition: reducedMotion ? "none" : "opacity 0.4s ease 0.8s",
          }}>
            Shelf is correct!
          </div>
          <div style={{ fontSize: 15, color: C.muted, fontWeight: 600, marginTop: 6 }}>
            6 checked · 2 fixed
          </div>
          <div style={{
            marginTop: 20, padding: "14px 16px",
            background: "#fff", borderRadius: 14,
            boxShadow: "0 2px 8px #00000008",
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <span style={{ fontSize: 20 }}>🏆</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: C.gold }}>
                New streak: 3 days!
              </span>
            </div>
            <div style={{
              display: "flex", justifyContent: "center", gap: 4,
            }}>
              {["M","T","W","T","F"].map((d, i) => (
                <div key={i} style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: i <= 2 ? C.correctBg : C.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800,
                  color: i <= 2 ? C.calm : C.muted,
                  border: i === 2 ? `2px solid ${C.calm}` : "none",
                }}>{i <= 2 ? "✓" : d}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <ActionButton onClick={onNext} icon="→">Next task</ActionButton>
        <ActionButton onClick={onBreak} secondary icon="😌">Take a break</ActionButton>
      </div>
    </div>
  );
}

/* ============ SETTINGS PANEL ============ */
function SettingsPanel({ celebLevel, setCelebLevel, reducedMotion, setReducedMotion, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000044",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      zIndex: 100, fontFamily: "'Nunito', sans-serif",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 400, background: C.card,
        borderRadius: "20px 20px 0 0", padding: "24px 20px 36px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Settings</span>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: "none",
            background: C.bg, cursor: "pointer", fontSize: 16,
          }}>✕</button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 10 }}>
            CELEBRATION STYLE
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { id: "calm", icon: "✓", label: "Calm", desc: "Simple checkmark" },
              { id: "medium", icon: "⭐", label: "Stars", desc: "Stars + streak" },
              { id: "full", icon: "🏆", label: "Party", desc: "Full celebration" },
            ].map(opt => (
              <button key={opt.id} onClick={() => setCelebLevel(opt.id)} style={{
                flex: 1, padding: "14px 8px", borderRadius: 12,
                border: celebLevel === opt.id ? `2px solid ${C.calm}` : `2px solid ${C.border}`,
                background: celebLevel === opt.id ? C.correctBg : C.card,
                cursor: "pointer", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 4,
              }}>
                <span style={{ fontSize: 24 }}>{opt.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: "'Nunito', sans-serif" }}>{opt.label}</span>
                <span style={{ fontSize: 10, color: C.muted, fontWeight: 600, fontFamily: "'Nunito', sans-serif" }}>{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 10 }}>
            MOTION
          </div>
          <button onClick={() => setReducedMotion(r => !r)} style={{
            width: "100%", padding: "14px 16px", borderRadius: 12,
            border: `2px solid ${C.border}`, background: C.card,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
            fontFamily: "'Nunito', sans-serif",
          }}>
            <span style={{ fontSize: 22 }}>{reducedMotion ? "🔇" : "✨"}</span>
            <div style={{ textAlign: "left", flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>
                {reducedMotion ? "Reduced motion ON" : "Animations ON"}
              </div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>
                {reducedMotion ? "No animations or movement" : "Tap to reduce visual motion"}
              </div>
            </div>
            <div style={{
              width: 44, height: 26, borderRadius: 13, padding: 3,
              background: reducedMotion ? C.calm : C.border,
              display: "flex", alignItems: "center",
              justifyContent: reducedMotion ? "flex-end" : "flex-start",
              transition: "all 0.2s ease",
            }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff" }} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============ MAIN APP ============ */
const BOOKS = [
  { id: 1, call: "FIC ADA", color: "#5B8FB9" },
  { id: 2, call: "FIC BRA", color: "#D4A574" },
  { id: 3, call: "FIC CLA", color: "#7A9E7E" },
  { id: 4, call: "FIC HER", color: "#C4785B" },
  { id: 5, call: "FIC DIC", color: "#8B7BB4" },
  { id: 6, call: "FIC LEG", color: "#B5838D" },
];
const BOOKS_FIXED = [
  BOOKS[0], BOOKS[1], BOOKS[2], BOOKS[4], BOOKS[3], BOOKS[5],
];
const EMPTY = { id: 98, call: "?", color: "#E2E8E4" };
const GAP = { id: 99, call: "", color: "#E8EFEB" };

export default function BuddyWork() {
  const [stepIdx, setStepIdx] = useState(0);
  const [scanProg, setScanProg] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [celebLevel, setCelebLevel] = useState("medium");
  const [showSettings, setShowSettings] = useState(false);
  const step = STEPS[stepIdx];
  const voice = useVoice();

  const next = useCallback(() => setStepIdx(i => Math.min(i + 1, STEPS.length - 1)), []);
  const reset = useCallback(() => { setStepIdx(0); setScanProg(0); voice.stop(); }, [voice]);

  // speak on step change
  useEffect(() => {
    const line = VOICE_LINES[step];
    if (line) {
      const t = setTimeout(() => voice.speak(line), 300);
      return () => clearTimeout(t);
    }
  }, [step]); // eslint-disable-line

  // scanning animation
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

  const RS = ["correct","correct","correct","misplaced","misplaced","correct"];
  const FS = ["correct","correct","correct","fixed","fixed","correct"];

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      fontFamily: "'Nunito', sans-serif",
      display: "flex", justifyContent: "center",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes gentleBounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-4px); } }
        @keyframes scanMove { 0% { top:8px; } 100% { top:calc(100% - 11px); } }
        @keyframes calmPulse { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
        @keyframes bar { from { height:4px; } to { height:16px; } }
        @keyframes sparkle { 0% { opacity:0; transform:scale(0) rotate(0deg); } 40% { opacity:1; transform:scale(1.2) rotate(10deg); } 100% { opacity:0; transform:scale(0.8) rotate(-5deg) translateY(-20px); } }
        * { box-sizing: border-box; }
      `}</style>

      {showSettings && (
        <SettingsPanel
          celebLevel={celebLevel} setCelebLevel={setCelebLevel}
          reducedMotion={reducedMotion} setReducedMotion={setReducedMotion}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div style={{
        width: "100%", maxWidth: 400, padding: "16px 16px 32px",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: C.calm,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, color: "#fff", fontWeight: 900,
            }}>B</div>
            <span style={{ fontSize: 17, fontWeight: 800, color: C.text }}>BuddyWork</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setShowSettings(true)} style={{
              width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${C.border}`,
              background: C.card, cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>⚙️</button>
            {stepIdx > 0 && (
              <button onClick={reset} style={{
                width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${C.border}`,
                background: C.card, cursor: "pointer", fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>🏠</button>
            )}
          </div>
        </div>

        {/* VOICE BAR */}
        <VoiceBar
          speaking={voice.speaking} voiceOn={voice.voiceOn}
          setVoiceOn={voice.setVoiceOn} speed={voice.speed}
          setSpeed={voice.setSpeed} onReplay={voice.replay}
        />

        {stepIdx > 0 && stepIdx < STEPS.length - 1 && (
          <ProgressPips current={stepIdx - 1} total={STEPS.length - 2} />
        )}

        {/* ===== SCREENS ===== */}

        {step === "welcome" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <div style={{
              textAlign: "center", padding: "28px 20px",
              background: C.card, borderRadius: 20, border: `1.5px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>👋</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.text }}>Your Tasks Today</div>
              <div style={{ fontSize: 14, color: C.muted, fontWeight: 600, marginTop: 4 }}>Tuesday, May 20</div>
            </div>
            <div style={{ marginTop: 14 }}>
              <button onClick={next} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 16,
                padding: 20, borderRadius: 16, border: `2px solid ${C.calm}`,
                background: C.card, cursor: "pointer", fontFamily: "'Nunito', sans-serif",
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, background: C.correctBg,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
                }}>📚</div>
                <div style={{ textAlign: "left", flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>Shelf Scan</div>
                  <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Aisle 5 · Fiction A–F</div>
                </div>
                <span style={{ fontSize: 22, color: C.calm, fontWeight: 900 }}>→</span>
              </button>
            </div>
            <div style={{
              marginTop: 10, padding: "10px 14px", borderRadius: 10,
              background: C.card, border: `1.5px solid ${C.border}`,
              display: "flex", gap: 14,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>LATER:</span>
              {[{i:"📦",l:"Returns"},{i:"🏷️",l:"Holds"},{i:"🔖",l:"Labels"}].map((t,j) => (
                <span key={j} style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{t.i} {t.l}</span>
              ))}
            </div>
          </div>
        )}

        {step === "task_select" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <Instruction icon="📚" text="Shelf Scan" sub="Aisle 5 · Fiction A–F" />
            <div style={{ background: C.card, borderRadius: 14, padding: 16, border: `1.5px solid ${C.border}`, marginTop: 14 }}>
              {[{i:"🚶",t:"Go to aisle"},{i:"📷",t:"Scan shelf"},{i:"🔄",t:"Fix order"}].map((s,j) => (
                <div key={j} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom: j<2 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:C.correctBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{s.i}</div>
                  <span style={{ fontSize:16, fontWeight:700, color:C.text }}>{s.t}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18 }}><ActionButton onClick={next} icon="🚶">Start</ActionButton></div>
          </div>
        )}

        {step === "go_aisle" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <Instruction icon="🚶" text="Go to Aisle 5" sub="Fiction section" />
            <div style={{ background: C.card, borderRadius: 14, padding: 24, border: `1.5px solid ${C.border}`, marginTop: 12, textAlign: "center" }}>
              <div style={{ display:"inline-flex", width:80, height:80, borderRadius:20, background:C.correctBg, alignItems:"center", justifyContent:"center", fontSize:40, fontWeight:900, color:C.calm }}>5</div>
              <div style={{ fontSize:13, color:C.muted, fontWeight:600, marginTop:10 }}>Look for this number above the shelves</div>
            </div>
            <div style={{ marginTop: 18 }}><ActionButton onClick={next} icon="📍">I'm here</ActionButton></div>
          </div>
        )}

        {step === "arrived" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <Instruction icon="📷" text="Point at shelf 2" sub="Count from the top" />
            <div style={{ background: C.card, borderRadius: 14, border: `1.5px solid ${C.border}`, padding: 16, marginTop: 12 }}>
              {[1,2,3].map(n => (
                <div key={n} style={{
                  display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:10, marginBottom:4,
                  background: n===2 ? C.correctBg : C.bg, border: n===2 ? `2px solid ${C.calm}` : "2px solid transparent",
                }}>
                  <span style={{ fontSize:15, fontWeight:800, color: n===2 ? C.calm : C.muted }}>Shelf {n}</span>
                  {n===2 && <span style={{ fontSize:13, fontWeight:700, color:C.calm }}>← this one</span>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18 }}><ActionButton onClick={next} icon="📸">Open camera</ActionButton></div>
          </div>
        )}

        {step === "camera" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <Instruction icon="📷" text="Hold steady" sub="Point at shelf 2" />
            <div style={{ background: "#1E1E1E", borderRadius: 16, padding: 16, marginTop: 12 }}>
              <div style={{ height: 190, borderRadius: 10, border: `2px dashed ${C.calm}55`, background: "#2A2A2A", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <span style={{ fontSize: 48, opacity: 0.5 }}>📷</span>
                <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 6, background: "#00000088", borderRadius: 8, padding: "4px 12px" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#E85454", animation: reducedMotion ? "none" : "calmPulse 2s infinite" }} />
                  <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>Ready</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 18 }}><ActionButton onClick={next} icon="🔍">Scan now</ActionButton></div>
          </div>
        )}

        {step === "scanning" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <Instruction icon="🔍" text="Scanning..." sub={`${Math.min(Math.floor(scanProg/17)+1,6)} of 6 found`} />
            <div style={{ background: "#1E1E1E", borderRadius: 16, padding: 16, marginTop: 12 }}>
              <div style={{ height: 170, borderRadius: 10, background: "#2A2A2A", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, position: "relative", overflow: "hidden" }}>
                {BOOKS.map(b => <div key={b.id} style={{ width: 26, height: 70, borderRadius: 3, background: b.color, opacity: 0.6 }} />)}
                {!reducedMotion && <div style={{ position: "absolute", left: 8, right: 8, height: 3, background: C.calm, boxShadow: `0 0 10px ${C.calm}66`, animation: "scanMove 2.5s ease-in-out infinite" }} />}
              </div>
            </div>
            <div style={{ marginTop: 14, background: C.card, borderRadius: 12, padding: 14, border: `1.5px solid ${C.border}` }}>
              <div style={{ height: 10, borderRadius: 5, background: C.bg, overflow: "hidden" }}>
                <div style={{ width: `${scanProg}%`, height: "100%", borderRadius: 5, background: C.calm, transition: "width 0.15s linear" }} />
              </div>
              <div style={{ textAlign: "center", marginTop: 6, fontSize: 14, fontWeight: 700, color: C.calm }}>{scanProg}%</div>
            </div>
          </div>
        )}

        {step === "results" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <Instruction icon="📋" text="Scan complete" />
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <div style={{ flex:1, padding:"12px 10px", borderRadius:12, background:C.correctBg, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <CheckShape /><span style={{ fontSize:17, fontWeight:900, color:C.calm }}>4 correct</span>
              </div>
              <div style={{ flex:1, padding:"12px 10px", borderRadius:12, background:C.warnBg, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <WarnShape /><span style={{ fontSize:17, fontWeight:900, color:C.warn }}>2 wrong</span>
              </div>
            </div>
            <div style={{ marginTop: 12 }}><Shelf books={BOOKS} statuses={RS} /></div>
            <div style={{ marginTop: 14 }}><ActionButton onClick={next} icon="🔄">Fix them</ActionButton></div>
          </div>
        )}

        {step === "fix_step1" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <Instruction icon="👆" text="Take out this book" />
            <div style={{ marginTop: 12 }}>
              <Shelf books={BOOKS} statuses={["correct","correct","correct","misplaced","none","correct"]}
                arrows={[null,null,null,"Take out",null,null]} />
            </div>
            <div style={{ marginTop: 12, background: C.warnBg, borderRadius: 12, padding: "12px 16px", border: `1.5px solid ${C.warnBorder}`, textAlign: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: C.warn }}>FIC HER — hold it</span>
            </div>
            <div style={{ marginTop: 14 }}><ActionButton onClick={next} icon="✅">Done</ActionButton></div>
          </div>
        )}

        {step === "fix_step2" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <Instruction icon="👆" text="Take out this book too" />
            <div style={{ marginTop: 12 }}>
              <Shelf books={[BOOKS[0],BOOKS[1],BOOKS[2],GAP,BOOKS[4],BOOKS[5]]}
                statuses={["correct","correct","correct","none","misplaced","correct"]}
                arrows={[null,null,null,null,"Take out",null]} />
            </div>
            <div style={{ marginTop: 12, background: C.warnBg, borderRadius: 12, padding: "12px 16px", border: `1.5px solid ${C.warnBorder}`, textAlign: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: C.warn }}>FIC DIC — hold both books</span>
            </div>
            <div style={{ marginTop: 14 }}><ActionButton onClick={next} icon="✅">Done</ActionButton></div>
          </div>
        )}

        {step === "fix_step3" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <Instruction icon="📥" text="Put FIC DIC in first" sub="D comes before H" />
            <div style={{ marginTop: 12 }}>
              <Shelf books={[BOOKS[0],BOOKS[1],BOOKS[2],EMPTY,GAP,BOOKS[5]]}
                statuses={["correct","correct","correct","none","none","correct"]}
                arrows={[null,null,null,"FIC DIC",null,null]} />
            </div>
            <div style={{ marginTop: 12, background: C.correctBg, borderRadius: 12, padding: "12px 16px", border: `1.5px solid ${C.calm}44`, textAlign: "center" }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: C.calm }}>D → H</span>
            </div>
            <div style={{ marginTop: 14 }}><ActionButton onClick={next} icon="✅">Done</ActionButton></div>
          </div>
        )}

        {step === "fix_step4" && (
          <div style={{ animation: reducedMotion ? "none" : "fadeIn 0.4s ease" }}>
            <Instruction icon="📥" text="Put FIC HER next" />
            <div style={{ marginTop: 12 }}>
              <Shelf books={[BOOKS_FIXED[0],BOOKS_FIXED[1],BOOKS_FIXED[2],BOOKS_FIXED[3],EMPTY,BOOKS_FIXED[5]]}
                statuses={["correct","correct","correct","fixed","none","correct"]}
                arrows={[null,null,null,null,"FIC HER",null]} />
            </div>
            <div style={{ marginTop: 14 }}><ActionButton onClick={next} icon="✅">Done</ActionButton></div>
          </div>
        )}

        {step === "complete" && (
          <CelebrationScreen
            celebLevel={celebLevel}
            reducedMotion={reducedMotion}
            onNext={reset}
            onBreak={() => {}}
          />
        )}
      </div>
    </div>
  );
}

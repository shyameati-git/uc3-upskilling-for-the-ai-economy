import { useState, useEffect, useCallback, useRef } from "react";

// ── Constants ──────────────────────────────────────────────────────────────────
const STEPS = ["welcome","overview","go_aisle","pick_shelf","camera","scanning","results","fix","complete"];
const VOICE = {
  welcome:   "Your tasks for today are ready. Choose your workplace to begin.",
  overview:  "Shelf Scan. Go to the aisle, scan the shelf, fix any books out of order. Tap Start.",
  go_aisle:  "Walk to Aisle 5 in the Fiction section. Look for the number 5 above the shelves. Tap I'm here when you arrive.",
  pick_shelf:"Point your camera at the second shelf from the top. Count from the top. One. Two. Tap Open Camera.",
  camera:    "Hold your phone steady pointing at the shelf. Tap Scan Now when ready.",
  scanning:  "Scanning. Hold still. GPT-4o is reading the shelf.",
  results:   "Scan complete. Check how many books need fixing, then tap Fix Them.",
  fix:       "Take out the highlighted book and move it to the correct position.",
  complete:  "Shelf is correct. Great work today.",
};
const C = {calm:"#4D9484",calmL:"#E4F0EC",warn:"#CC8B1F",warnL:"#FFF6E5",warnB:"#EEDCB0",ok:"#4D9484",okL:"#E4F0EC",text:"#1E2D27",sub:"#5F7A6F",bg:"#F4F6F5",card:"#FFFFFF",bdr:"#D9E2DD",gold:"#B8860B",goldL:"#FFF9E8"};

// Demo book colours used in shelf visualisation
const BOOK_COLORS = ["#4A7FA8","#C49360","#5E8E65","#B06040","#7B6BA8","#9E6878","#4D9484","#8B6BAE"];

const LVL_COLORS = {1:"#3d9e68",2:"#d4860a",3:"#c0392b"};
const LVL_LABELS = {1:"Low Support",2:"Medium Support",3:"High Support"};
const FEAT_ICONS  = {text:"📝",voice:"🎤",image:"📷",both:"✨"};

// ── Demo scan result (fallback when no API key or no camera) ───────────────────
function getDemoScanResult() {
  return {
    books: [
      {call:"FIC ADA", title:"Adams",   status:"correct"},
      {call:"FIC BRA", title:"Bradbury",status:"correct"},
      {call:"FIC CLA", title:"Clarke",  status:"correct"},
      {call:"FIC HER", title:"Herbert", status:"misplaced", shouldBeAfter:"FIC DIC", shouldBeBefore:"FIC LEG"},
      {call:"FIC DIC", title:"Dickens", status:"misplaced", shouldBeAfter:"FIC CLA", shouldBeBefore:"FIC HER"},
      {call:"FIC LEG", title:"Le Guin", status:"correct"},
    ],
    summary:"4 books correct, 2 misplaced",
  };
}

// ── Profile persistence ────────────────────────────────────────────────────────
function loadProfile() {
  return {
    name:     localStorage.getItem('p_name')     || 'Worker',
    level:    parseInt(localStorage.getItem('p_level') || '2'),
    useCase:  localStorage.getItem('p_usecase')  || 'library',
    features: JSON.parse(localStorage.getItem('p_features') || '["text","image"]'),
    // .env REACT_APP_OPENAI_API_KEY takes priority over the Admin panel value
    apiKey:   process.env.REACT_APP_OPENAI_API_KEY || localStorage.getItem('p_apikey') || '',
  };
}
function persistProfile(p) {
  localStorage.setItem('p_name',     p.name);
  localStorage.setItem('p_level',    String(p.level));
  localStorage.setItem('p_usecase',  p.useCase);
  localStorage.setItem('p_features', JSON.stringify(p.features));
  localStorage.setItem('p_apikey',   p.apiKey);
}

// ── GPT-4o: AI coaching (text) ─────────────────────────────────────────────────
async function coachCall(apiKey, level, userMessage) {
  if (!apiKey) return '(Add your OpenAI API key in Admin ⚙ to use live AI coaching.)';
  const sys = `You are a job coach for autistic workers. Use clear, literal, positive language. \
One instruction at a time. No idioms. Explain WHY. End with one clear next action. \
Level ${level} worker (1=low support, 3=high support).`;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 400,
      temperature: 0.3,
      messages: [{role:'system',content:sys},{role:'user',content:userMessage}],
    }),
  });
  if (!res.ok) { const e = await res.json().catch(()=>{}); throw new Error(e?.error?.message||`API ${res.status}`); }
  const d = await res.json();
  return d.choices?.[0]?.message?.content?.trim() || 'No response.';
}

// ── GPT-4o Vision: shelf scan ──────────────────────────────────────────────────
async function scanWithVision(apiKey, base64Image) {
  const prompt = `You are scanning a library shelf. Read every spine label visible on the books from LEFT to RIGHT.

Return ONLY valid JSON in this exact format:
{
  "books": [
    {"call": "FIC ADA", "title": "Author name or title visible", "status": "correct"},
    {"call": "FIC HER", "title": "Herbert", "status": "misplaced", "shouldBeAfter": "FIC CLA", "shouldBeBefore": "FIC LEG"}
  ],
  "summary": "X books correct, Y misplaced"
}

Rules:
- List every book you can see, left to right
- status is "correct" if alphabetically ordered, "misplaced" if out of place
- For misplaced books, fill shouldBeAfter and shouldBeBefore with the adjacent correct call numbers
- If a field is unknown write null`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: [
          {type:'text', text: prompt},
          {type:'image_url', image_url:{url:`data:image/jpeg;base64,${base64Image}`, detail:'high'}},
        ],
      }],
    }),
  });
  if (!res.ok) { const e = await res.json().catch(()=>{}); throw new Error(e?.error?.message||`API ${res.status}`); }
  const d = await res.json();
  const content = d.choices?.[0]?.message?.content?.trim() || '';
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse shelf scan response');
  return JSON.parse(match[0]);
}

// ── Camera hook ────────────────────────────────────────────────────────────────
function useCamera() {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady]   = useState(false);
  const [camErr, setCamErr] = useState(null);

  const start = useCallback(async () => {
    setCamErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {facingMode:'environment', width:{ideal:1280}},
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setReady(true);
      }
    } catch(e) {
      setCamErr(e.message);
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const captureFrame = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    return c.toDataURL('image/jpeg', 0.85).split(',')[1] || null;
  }, []);

  return {videoRef, ready, camErr, start, stop, captureFrame};
}

// ── Task dictionaries ──────────────────────────────────────────────────────────
const COFFEE_TASKS = {
  order:     {icon:'🧾', label:'Help me take an order',   prompt:'A customer is at the counter ready to order. Give the worker step-by-step instructions for taking the order politely and accurately.'},
  pos:       {icon:'💻', label:'Help me use the POS',     prompt:'The worker needs to enter an order into the POS (Point of Sale) system. Give clear step-by-step instructions.'},
  complaint: {icon:'😤', label:'Customer is upset',       prompt:"A customer is upset because their order was wrong. Give the worker a calm script and steps for handling this situation."},
  shift:     {icon:'🧹', label:'End of shift tasks',      prompt:'It is the end of the shift at the coffee shop. Give the worker a step-by-step checklist of closing tasks.'},
};
const SWIM_TASKS = {
  safety:   {icon:'🛟', label:'Safety check guide',        prompt:'The swimming instructor needs to do a pool safety check before lessons start. Give a step-by-step safety checklist.'},
  drill:    {icon:'🏊', label:'How to teach a drill',      prompt:'The swimming instructor needs to teach a basic freestyle drill to beginners. Give step-by-step instructions for how to explain and demonstrate it.'},
  question: {icon:'🙋', label:'Swimmer asked me something',prompt:"A swimmer asked a question the instructor is not sure about. Give the instructor a calm script for how to respond when they don't know the answer."},
  lesson:   {icon:'📋', label:"Plan today's lesson",       prompt:'The swimming instructor needs to plan a 45-minute beginner lesson. Give a clear timed lesson plan.'},
};

// ── Voice Hook ─────────────────────────────────────────────────────────────────
function useVoice() {
  const uRef = useRef(null);
  const [on,setOn]         = useState(true);
  const [spd,setSpd]       = useState(0.85);
  const [talking,setTalking] = useState(false);
  const say = useCallback((txt) => {
    if (!on || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    u.rate = spd; u.pitch = 1;
    u.onstart=()=>setTalking(true); u.onend=()=>setTalking(false); u.onerror=()=>setTalking(false);
    const vs = window.speechSynthesis.getVoices();
    const v = vs.find(v=>v.name.includes("Samantha")) || vs.find(v=>v.name.includes("Google")&&v.lang.startsWith("en")) || vs.find(v=>v.lang.startsWith("en"));
    if (v) u.voice = v;
    uRef.current = u; window.speechSynthesis.speak(u);
  }, [on, spd]);
  const stop   = useCallback(() => { window.speechSynthesis?.cancel(); setTalking(false); }, []);
  const replay = useCallback(() => {
    if (!uRef.current) return;
    window.speechSynthesis?.cancel();
    const u = new SpeechSynthesisUtterance(uRef.current.text);
    u.rate = spd; u.pitch = 1;
    if (uRef.current.voice) u.voice = uRef.current.voice;
    u.onstart=()=>setTalking(true); u.onend=()=>setTalking(false);
    window.speechSynthesis.speak(u);
  }, [spd]);
  return {say, stop, replay, talking, on, setOn, spd, setSpd};
}

// ── Shared UI components ───────────────────────────────────────────────────────
const F = "'Nunito',sans-serif";
function Btn({children, onClick, icon, secondary, small, disabled}) {
  return <button onClick={onClick} disabled={disabled} style={{width:"100%",padding:small?"14px 20px":"20px 24px",fontSize:small?16:20,fontWeight:800,fontFamily:F,border:secondary?`2px solid ${C.bdr}`:"none",borderRadius:16,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.6:1,background:secondary?C.card:C.calm,color:secondary?C.text:"#fff",boxShadow:secondary?"none":`0 4px 14px ${C.calm}30`,display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"transform .1s"}} onMouseDown={e=>!disabled&&(e.currentTarget.style.transform="scale(.97)")} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>{icon&&<span style={{fontSize:small?20:24}}>{icon}</span>}{children}</button>
}
function Hero({icon,text,sub}) {
  return <div style={{textAlign:"center",padding:"6px 16px"}}><div style={{fontSize:56,lineHeight:1,marginBottom:8}}>{icon}</div><div style={{fontSize:22,fontWeight:800,color:C.text,lineHeight:1.3,fontFamily:F}}>{text}</div>{sub&&<div style={{fontSize:14,color:C.sub,fontWeight:600,marginTop:5,fontFamily:F}}>{sub}</div>}</div>
}
function Pips({cur,total}) {
  return <div style={{display:"flex",gap:4,justifyContent:"center",padding:"4px 0"}}>{Array.from({length:total},(_,i)=><div key={i} style={{width:i===cur?26:8,height:8,borderRadius:4,background:i===cur?C.calm:i<cur?C.calm+"55":C.bdr,transition:"all .3s"}}/>)}</div>
}
function Card({children,style}) { return <div style={{background:C.card,borderRadius:16,padding:18,border:`1.5px solid ${C.bdr}`,...style}}>{children}</div> }
function Section({title,hint,children}) {
  return <div style={{marginBottom:24}}>
    <div style={{fontSize:11,fontWeight:800,color:C.sub,letterSpacing:1,marginBottom:hint?4:10,fontFamily:F}}>{title}</div>
    {hint&&<div style={{fontSize:12,color:C.sub,fontWeight:600,marginBottom:10,fontFamily:F}}>{hint}</div>}
    {children}
  </div>
}
const Chk = () => <svg width="18" height="18" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill={C.ok}/><path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const Wrn = () => <svg width="18" height="18" viewBox="0 0 20 20"><polygon points="10,2 19,18 1,18" fill={C.warn}/><text x="10" y="15" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800">!</text></svg>;

// ── Live camera view ───────────────────────────────────────────────────────────
function LiveCamera({videoRef, ready, camErr, scanning}) {
  return <div style={{background:"#181818",borderRadius:14,padding:14,position:"relative"}}>
    {camErr ? (
      <div style={{height:180,borderRadius:10,background:"#222",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}>
        <span style={{fontSize:32}}>📵</span>
        <span style={{fontSize:12,color:"#888",fontWeight:700,fontFamily:F,textAlign:"center",padding:"0 16px"}}>Camera unavailable — using demo data</span>
      </div>
    ) : (
      <div style={{position:"relative",borderRadius:10,overflow:"hidden",background:"#000"}}>
        <video ref={videoRef} autoPlay playsInline muted style={{width:"100%",display:"block",borderRadius:10,minHeight:180,objectFit:"cover"}}/>
        {!ready && <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"#111"}}>
          <span style={{fontSize:12,color:"#888",fontWeight:700,fontFamily:F}}>Starting camera…</span>
        </div>}
        {/* Crosshair corners */}
        {!scanning&&<>
          <div style={{position:"absolute",top:12,left:12,width:24,height:24,borderTop:"2px solid #5A9E8F99",borderLeft:"2px solid #5A9E8F99"}}/>
          <div style={{position:"absolute",top:12,right:12,width:24,height:24,borderTop:"2px solid #5A9E8F99",borderRight:"2px solid #5A9E8F99"}}/>
          <div style={{position:"absolute",bottom:12,left:12,width:24,height:24,borderBottom:"2px solid #5A9E8F99",borderLeft:"2px solid #5A9E8F99"}}/>
          <div style={{position:"absolute",bottom:12,right:12,width:24,height:24,borderBottom:"2px solid #5A9E8F99",borderRight:"2px solid #5A9E8F99"}}/>
        </>}
        {scanning && <div style={{position:"absolute",left:8,right:8,height:2,background:C.calm,boxShadow:`0 0 12px ${C.calm}88`,animation:"scanLine 2s ease-in-out infinite"}}/>}
        <div style={{position:"absolute",top:10,left:12,display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:scanning?"#E85454":C.calm,animation:"pulse 2s infinite"}}/>
          <span style={{fontSize:10,color:"#ccc",fontWeight:700,fontFamily:F}}>{scanning?"SCANNING":"READY"}</span>
        </div>
      </div>
    )}
    {scanning && (
      <div style={{marginTop:10}}>
        <div style={{height:6,borderRadius:3,background:"#333",overflow:"hidden"}}>
          <div style={{width:"100%",height:"100%",borderRadius:3,background:`linear-gradient(90deg,${C.calm},#5BA898)`,animation:"shimmer 1.5s ease-in-out infinite"}}/>
        </div>
        <div style={{marginTop:6,fontSize:12,color:"#aaa",fontWeight:700,fontFamily:F,textAlign:"center"}}>
          GPT-4o reading spine labels…
        </div>
      </div>
    )}
  </div>
}

// ── Dynamic shelf strip (from scan results) ────────────────────────────────────
function ResultShelf({books, highlightCall}) {
  return <div style={{background:"linear-gradient(180deg,#EDE5DA,#DDD4C8)",borderRadius:12,padding:"12px 10px 10px",border:"2px solid #CFC5B8",overflowX:"auto"}}>
    <div style={{height:3,background:"#BFB3A5",borderRadius:2,marginBottom:8}}/>
    <div style={{display:"flex",gap:6,alignItems:"flex-end",minHeight:100,padding:"16px 4px 0"}}>
      {books.map((b,i) => {
        const isMisplaced = b.status === 'misplaced';
        const isCurrent   = b.call === highlightCall;
        const color = BOOK_COLORS[i % BOOK_COLORS.length];
        return <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
          <div style={{width:36,height:90,borderRadius:"4px 4px 2px 2px",background:`linear-gradient(180deg,${color},${color}bb)`,border:isCurrent?`3px solid ${C.warn}`:isMisplaced?`2px solid ${C.warn}55`:`2px solid ${C.ok}44`,boxShadow:isCurrent?`0 0 12px ${C.warn}66`:"0 2px 4px #00000012",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",padding:"4px 2px",transition:"all .3s"}}>
            <div style={{width:14,height:14,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {isCurrent?<Wrn/>:isMisplaced?<Wrn/>:<Chk/>}
            </div>
            <span style={{writingMode:"vertical-rl",fontSize:7,color:"#fff",fontWeight:800,fontFamily:F,textShadow:"0 1px 2px #00000033"}}>{b.call}</span>
          </div>
          <span style={{fontSize:7,color:C.sub,marginTop:2,fontWeight:700,fontFamily:F,maxWidth:36,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.call}</span>
        </div>;
      })}
    </div>
    <div style={{height:3,background:"#BFB3A5",borderRadius:2,marginTop:8}}/>
  </div>
}

// ── Voice Bar ──────────────────────────────────────────────────────────────────
function VoiceBar({v}) {
  return <div style={{display:"flex",alignItems:"center",gap:5,background:C.card,borderRadius:10,padding:"6px 10px",border:`1.5px solid ${C.bdr}`}}>
    <button onClick={()=>v.setOn(o=>!o)} style={{width:34,height:34,borderRadius:8,border:"none",background:v.on?C.calmL:C.bg,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>{v.on?"🔊":"🔇"}</button>
    {v.on&&<>
      <button onClick={v.replay} style={{width:34,height:34,borderRadius:8,border:"none",background:C.bg,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>🔄</button>
      <div style={{display:"flex",gap:3,marginLeft:2}}>
        {[{s:.6,l:"Slow"},{s:.85,l:"Med"},{s:1.1,l:"Fast"}].map(o=><button key={o.s} onClick={()=>v.setSpd(o.s)} style={{padding:"3px 7px",borderRadius:5,border:"none",background:v.spd===o.s?C.calm:C.bg,color:v.spd===o.s?"#fff":C.sub,fontSize:10,fontWeight:800,cursor:"pointer",fontFamily:F}}>{o.l}</button>)}
      </div>
    </>}
    {v.talking&&<div style={{display:"flex",alignItems:"center",gap:2,marginLeft:"auto"}}>{[0,1,2].map(i=><div key={i} style={{width:3,background:C.calm,borderRadius:1,animation:`bar ${.35+i*.12}s ease-in-out infinite alternate`}}/>)}</div>}
  </div>
}

// ── Admin Panel ────────────────────────────────────────────────────────────────
function AdminPanel({profile, celeb, setCeleb, rm, setRm, onSave, onClose}) {
  const [name,    setName]    = useState(profile.name);
  const [level,   setLevel]   = useState(profile.level);
  const [useCase, setUseCase] = useState(profile.useCase);
  const [features,setFeatures]= useState(profile.features);

  function toggleFeat(f) {
    if (f==='both') { setFeatures(p=>p.includes('both')?p.filter(x=>x!=='both'):['text','voice','image','both']); }
    else            { setFeatures(p=>p.includes(f)?p.filter(x=>x!==f):[...p,f]); }
  }

  const inp = {padding:'12px 14px',borderRadius:10,border:`1.5px solid ${C.bdr}`,fontSize:15,fontFamily:F,color:C.text,background:C.card,outline:'none',width:'100%',boxSizing:'border-box'};

  return <div style={{position:'fixed',inset:0,background:C.bg,overflowY:'auto',zIndex:200,fontFamily:F}}>
    <div style={{width:'100%',maxWidth:420,margin:'0 auto',padding:'16px 16px 40px'}}>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div style={{fontSize:20,fontWeight:900,color:C.text}}>⚙ Admin Panel</div>
        <button onClick={onClose} style={{padding:'8px 14px',borderRadius:10,border:`1.5px solid ${C.bdr}`,background:C.card,cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:F,color:C.text}}>✕ Close</button>
      </div>

      <Section title="USER PROFILE">
        <label style={{display:'flex',flexDirection:'column',gap:6,fontSize:13,fontWeight:700,color:C.sub,fontFamily:F}}>
          Worker Name
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter name…" style={inp}/>
        </label>
      </Section>

      <Section title="SUPPORT LEVEL" hint="Choose how much step-by-step guidance this worker needs.">
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {[
            {l:1, desc:'Needs occasional reminders and guidance for new tasks',     ui:'Standard text · All features'},
            {l:2, desc:'Needs clear step-by-step instructions for most tasks',      ui:'Larger text · Simplified layout'},
            {l:3, desc:'Needs maximum simplification and one step at a time',       ui:'Large text · One task · Break reminders'},
          ].map(({l,desc,ui})=>(
            <button key={l} onClick={()=>setLevel(l)} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderRadius:14,border:`2px solid ${level===l?LVL_COLORS[l]:C.bdr}`,background:level===l?LVL_COLORS[l]+'18':C.card,cursor:'pointer',textAlign:'left',fontFamily:F,width:'100%'}}>
              <div style={{width:44,height:44,borderRadius:12,background:LVL_COLORS[l],display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,color:'#fff',flexShrink:0}}>L{l}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:800,color:C.text}}>{LVL_LABELS[l]}</div>
                <div style={{fontSize:11,color:C.sub,fontWeight:600,marginTop:2}}>{desc}</div>
                <div style={{fontSize:10,color:C.sub,fontWeight:600,marginTop:1,opacity:.7}}>{ui}</div>
              </div>
              {level===l&&<span style={{fontSize:18,color:LVL_COLORS[l]}}>✓</span>}
            </button>
          ))}
        </div>
      </Section>

      <Section title="WORKPLACE" hint="Choose the worker's job environment.">
        <div style={{display:'flex',gap:8}}>
          {[
            {key:'library',  icon:'📚', name:'Library',     desc:'Shelves & patrons'},
            {key:'coffee',   icon:'☕', name:'Coffee Shop', desc:'Orders & customers'},
            {key:'swimming', icon:'🏊', name:'Swimming',    desc:'Lessons & safety'},
          ].map(uc=>(
            <button key={uc.key} onClick={()=>setUseCase(uc.key)} style={{flex:1,padding:'12px 8px',borderRadius:14,border:`2px solid ${useCase===uc.key?C.calm:C.bdr}`,background:useCase===uc.key?C.calmL:C.card,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:5,fontFamily:F}}>
              <span style={{fontSize:24}}>{uc.icon}</span>
              <span style={{fontSize:12,fontWeight:800,color:C.text}}>{uc.name}</span>
              <span style={{fontSize:9,color:C.sub,fontWeight:600,textAlign:'center'}}>{uc.desc}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="AI FEATURES" hint="Choose how the AI communicates with the worker.">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {[
            {key:'text',  icon:'📝', name:'Text',         desc:'Written instructions'},
            {key:'voice', icon:'🎤', name:'Voice',        desc:'Spoken guidance'},
            {key:'image', icon:'📷', name:'Image',        desc:'Camera scanning'},
            {key:'both',  icon:'✨', name:'All Features', desc:'Full experience'},
          ].map(f=>(
            <button key={f.key} onClick={()=>toggleFeat(f.key)} style={{padding:'12px 8px',borderRadius:12,border:`2px solid ${features.includes(f.key)?C.calm:C.bdr}`,background:features.includes(f.key)?C.calmL:C.card,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4,fontFamily:F}}>
              <span style={{fontSize:22}}>{f.icon}</span>
              <span style={{fontSize:12,fontWeight:800,color:C.text}}>{f.name}</span>
              <span style={{fontSize:9,color:C.sub,fontWeight:600,textAlign:'center'}}>{f.desc}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="CELEBRATION STYLE">
        <div style={{display:'flex',gap:7}}>
          {[{id:'calm',ic:'✓',nm:'Calm',ds:'Checkmark only'},{id:'medium',ic:'⭐',nm:'Stars',ds:'Stars + streak'},{id:'full',ic:'🏆',nm:'Party',ds:'Full celebration'}].map(o=>(
            <button key={o.id} onClick={()=>setCeleb(o.id)} style={{flex:1,padding:'12px 6px',borderRadius:12,border:celeb===o.id?`2px solid ${C.calm}`:`2px solid ${C.bdr}`,background:celeb===o.id?C.calmL:C.card,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,fontFamily:F}}>
              <span style={{fontSize:22}}>{o.ic}</span>
              <span style={{fontSize:12,fontWeight:800,color:C.text}}>{o.nm}</span>
              <span style={{fontSize:9,color:C.sub,fontWeight:600}}>{o.ds}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="MOTION">
        <button onClick={()=>setRm(r=>!r)} style={{width:'100%',padding:'12px 14px',borderRadius:12,border:`2px solid ${C.bdr}`,background:C.card,cursor:'pointer',display:'flex',alignItems:'center',gap:10,fontFamily:F}}>
          <span style={{fontSize:20}}>{rm?'🔇':'✨'}</span>
          <div style={{textAlign:'left',flex:1}}>
            <div style={{fontSize:13,fontWeight:800,color:C.text}}>{rm?'Reduced motion':'Animations on'}</div>
            <div style={{fontSize:10,color:C.sub,fontWeight:600}}>Tap to toggle</div>
          </div>
          <div style={{width:40,height:22,borderRadius:11,padding:2,background:rm?C.calm:C.bdr,display:'flex',alignItems:'center',justifyContent:rm?'flex-end':'flex-start',transition:'all .2s'}}>
            <div style={{width:18,height:18,borderRadius:'50%',background:'#fff'}}/>
          </div>
        </button>
      </Section>

      <button onClick={()=>onSave({name:name.trim()||'Worker',level,useCase,features:features.length?features:['text'],apiKey:profile.apiKey})} style={{width:'100%',padding:'20px 24px',fontSize:18,fontWeight:800,fontFamily:F,border:'none',borderRadius:16,cursor:'pointer',background:C.calm,color:'#fff',boxShadow:`0 4px 14px ${C.calm}30`}}>
        Save Profile
      </button>
      <div style={{height:32}}/>
    </div>
  </div>
}

// ── Coach Task Screen (Coffee / Swimming) ──────────────────────────────────────
function CoachTaskScreen({title, tasks, profile, onBack, say}) {
  const [response, setResponse] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [activeKey,setActiveKey]= useState(null);

  async function runTask(key) {
    setActiveKey(key); setLoading(true); setResponse('');
    try {
      const ans = await coachCall(profile.apiKey, profile.level, tasks[key].prompt);
      setResponse(ans); say(ans);
    } catch(e) { setResponse(`Error: ${e.message}`); }
    finally { setLoading(false); }
  }

  return <div style={{fontFamily:F}}>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
      <button onClick={onBack} style={{width:36,height:36,borderRadius:10,border:`1.5px solid ${C.bdr}`,background:C.card,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',color:C.text}}>←</button>
      <div style={{fontSize:22,fontWeight:900,color:C.text}}>{title}</div>
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {Object.entries(tasks).map(([key,t])=>(
        <button key={key} onClick={()=>runTask(key)} style={{width:'100%',display:'flex',alignItems:'center',gap:14,padding:18,borderRadius:14,border:`2px solid ${activeKey===key?C.calm:C.bdr}`,background:activeKey===key?C.calmL:C.card,cursor:'pointer',fontFamily:F,textAlign:'left'}}>
          <span style={{fontSize:26,flexShrink:0}}>{t.icon}</span>
          <span style={{fontSize:16,fontWeight:700,color:C.text,flex:1}}>{t.label}</span>
          {activeKey===key&&loading&&<span style={{fontSize:12,color:C.calm,fontWeight:700}}>Loading…</span>}
        </button>
      ))}
    </div>
    {(loading||response)&&<Card style={{marginTop:16}}>
      <div style={{fontSize:11,fontWeight:800,color:C.sub,marginBottom:8,letterSpacing:1}}>GPT-4o COACH SAYS:</div>
      <div style={{fontSize:15,color:C.text,lineHeight:1.65,fontWeight:600,fontFamily:F,whiteSpace:'pre-wrap'}}>
        {loading?'GPT-4o is thinking…':response}
      </div>
    </Card>}
  </div>
}

// ── Celebration ────────────────────────────────────────────────────────────────
function Celebrate({level,rm,onNext,onBreak,fixed,total}) {
  const [show,setShow] = useState(false);
  useEffect(()=>{setTimeout(()=>setShow(true),200)},[]);
  return <div style={{animation:rm?"none":"fadeIn .5s ease"}}>
    {level==="calm"&&<Card style={{textAlign:"center",padding:"32px 18px",border:`2px solid ${C.calm}33`}}>
      <div style={{fontSize:48,marginBottom:10,transition:"transform .5s",transform:show?"scale(1)":"scale(.8)"}}>✓</div>
      <div style={{fontSize:22,fontWeight:900,color:C.text,fontFamily:F}}>Shelf is correct</div>
      <div style={{display:"flex",justifyContent:"center",gap:28,marginTop:20}}>
        {[{n:String(total),l:"Checked"},{n:String(fixed),l:"Fixed"}].map((s,i)=><div key={i} style={{textAlign:"center"}}><div style={{fontSize:26,fontWeight:900,color:C.calm}}>{s.n}</div><div style={{fontSize:11,color:C.sub,fontWeight:700,fontFamily:F}}>{s.l}</div></div>)}
      </div>
    </Card>}
    {level==="medium"&&<Card style={{textAlign:"center",padding:"28px 18px",border:`2px solid ${C.calm}33`,background:`linear-gradient(160deg,${C.card},${C.calmL})`}}>
      <div style={{display:"flex",justifyContent:"center",gap:5,marginBottom:14}}>
        {[0,1,2].map(i=><div key={i} style={{fontSize:30,opacity:show?1:0,transform:show?"translateY(0) scale(1)":"translateY(10px) scale(.5)",transition:rm?"none":`all .4s ease ${i*.15+.2}s`}}>⭐</div>)}
      </div>
      <div style={{fontSize:21,fontWeight:900,color:C.text,fontFamily:F}}>Shelf is correct</div>
      <div style={{fontSize:14,color:C.sub,fontWeight:600,marginTop:5,fontFamily:F}}>{total} checked · {fixed} fixed</div>
      <div style={{marginTop:18,padding:"10px 14px",background:C.goldL,borderRadius:10,border:`1.5px solid ${C.gold}33`}}>
        <span style={{fontSize:13,fontWeight:700,color:C.gold,fontFamily:F}}>🏅 3 shelves completed today</span>
      </div>
    </Card>}
    {level==="full"&&<Card style={{textAlign:"center",padding:"26px 18px",border:`2px solid ${C.gold}33`,background:`linear-gradient(160deg,${C.calmL},${C.goldL})`,position:"relative",overflow:"hidden"}}>
      {!rm&&<div style={{position:"absolute",inset:0,pointerEvents:"none"}}>{["✨","⭐","🌟","💚","✨","⭐","🌟","💚"].map((e,i)=><span key={i} style={{position:"absolute",left:`${10+(i*12)%80}%`,top:`${5+(i*17)%50}%`,fontSize:14,opacity:0,animation:`sparkle 2s ease-out ${i*.2}s forwards`}}>{e}</span>)}</div>}
      <div style={{display:"flex",justifyContent:"center",gap:4,marginBottom:12}}>
        {[0,1,2].map(i=><div key={i} style={{fontSize:34,opacity:show?1:0,transform:show?"translateY(0) scale(1) rotate(0)":"translateY(20px) scale(0) rotate(-30deg)",transition:rm?"none":`all .5s cubic-bezier(.34,1.56,.64,1) ${i*.2+.2}s`}}>⭐</div>)}
      </div>
      <div style={{fontSize:22,fontWeight:900,color:C.text,fontFamily:F,opacity:show?1:0,transition:rm?"none":"opacity .4s ease .8s"}}>Shelf is correct!</div>
      <div style={{fontSize:14,color:C.sub,fontWeight:600,marginTop:5,fontFamily:F}}>{total} checked · {fixed} fixed</div>
      <div style={{marginTop:18,padding:"12px 14px",background:"#fff",borderRadius:12,boxShadow:"0 2px 8px #00000008"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:8}}>
          <span style={{fontSize:18}}>🏆</span><span style={{fontSize:15,fontWeight:800,color:C.gold,fontFamily:F}}>New streak: 3 days!</span>
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:4}}>
          {["M","T","W","T","F"].map((d,i)=><div key={i} style={{width:30,height:30,borderRadius:7,background:i<=2?C.calmL:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:i<=2?C.calm:C.sub,border:i===2?`2px solid ${C.calm}`:"2px solid transparent",fontFamily:F}}>{i<=2?"✓":d}</div>)}
        </div>
      </div>
    </Card>}
    <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:8}}>
      <Btn onClick={onNext} icon="→">Next task</Btn>
      <Btn onClick={onBreak} secondary icon="😌">Take a break</Btn>
    </div>
  </div>
}

// ── Break Screen ───────────────────────────────────────────────────────────────
function BreakScreen({onResume,rm}) {
  const [secs,setSecs] = useState(0);
  useEffect(()=>{const iv=setInterval(()=>setSecs(s=>s+1),1000);return()=>clearInterval(iv)},[]);
  const m=Math.floor(secs/60), s=secs%60;
  return <div style={{animation:rm?"none":"fadeIn .5s ease",textAlign:"center"}}>
    <Card style={{padding:"40px 20px",border:`2px solid ${C.calm}22`}}>
      <div style={{fontSize:48,marginBottom:16}}>😌</div>
      <div style={{fontSize:22,fontWeight:800,color:C.text,fontFamily:F}}>Break time</div>
      <div style={{fontSize:14,color:C.sub,fontWeight:600,marginTop:6,fontFamily:F}}>Take as long as you need</div>
      <div style={{fontSize:36,fontWeight:900,color:C.calm,fontFamily:F,marginTop:20,letterSpacing:2}}>
        {String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}
      </div>
      <div style={{marginTop:20,padding:"12px",background:C.calmL,borderRadius:10}}>
        <div style={{fontSize:13,color:C.calm,fontWeight:700,fontFamily:F}}>Try a slow breath</div>
        <div style={{width:40,height:40,borderRadius:"50%",background:C.calm+"22",margin:"10px auto",animation:rm?"none":"breathe 6s ease-in-out infinite",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{width:20,height:20,borderRadius:"50%",background:C.calm+"44"}}/>
        </div>
      </div>
    </Card>
    <div style={{marginTop:16}}><Btn onClick={onResume} icon="→">Back to work</Btn></div>
  </div>
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
export default function BuddyWork() {
  const [profile, setProfile]             = useState(loadProfile);
  const [si, setSi]                       = useState(0);
  const [activeUseCase, setActiveUseCase] = useState(null);
  const [celeb, setCeleb]                 = useState("medium");
  const [rm, setRm]                       = useState(false);
  const [showAdmin, setShowAdmin]         = useState(false);
  const [onBreak, setOnBreak]             = useState(false);

  // Scan state
  const [scanResult, setScanResult]   = useState(null);   // { books, summary }
  const [scanError,  setScanError]    = useState(null);
  const [scanning,   setScanning]     = useState(false);
  const [fixIndex,   setFixIndex]     = useState(0);

  const camera = useCamera();
  const step   = STEPS[si];
  const v      = useVoice();

  const misplacedBooks = (scanResult?.books || []).filter(b => b.status === 'misplaced');
  const correctCount   = (scanResult?.books || []).filter(b => b.status === 'correct').length;
  const totalCount     = (scanResult?.books || []).length;

  function handleSaveProfile(updated) {
    setProfile(updated);
    persistProfile(updated);
    v.setOn(updated.features.includes('voice') || updated.features.includes('both'));
    setShowAdmin(false);
  }

  const saySafe = useCallback((text) => {
    if (profile.features.includes('voice') || profile.features.includes('both')) v.say(text);
  }, [v, profile.features]);

  const next  = useCallback(() => setSi(i => Math.min(i+1, STEPS.length-1)), []);
  const reset = useCallback(() => {
    setSi(0); v.stop(); setOnBreak(false); setActiveUseCase(null);
    setScanResult(null); setScanError(null); setScanning(false); setFixIndex(0);
    camera.stop();
  }, [v, camera]);

  // Speak on each step
  useEffect(() => { const t = setTimeout(() => v.say(VOICE[step]), 300); return () => clearTimeout(t); }, [step]);

  // Start camera when entering the camera step
  useEffect(() => {
    if (step === 'camera') camera.start();
  }, [step]);

  // Run GPT-4o vision scan when entering scanning step
  useEffect(() => {
    if (step !== 'scanning') return;
    let cancelled = false;
    async function doScan() {
      setScanning(true); setScanError(null);
      const frame = camera.captureFrame();
      if (!frame || !profile.apiKey) {
        await new Promise(r => setTimeout(r, 1500)); // show scanning briefly
        if (!cancelled) { setScanResult(getDemoScanResult()); setScanning(false); next(); }
        return;
      }
      try {
        const result = await scanWithVision(profile.apiKey, frame);
        if (!cancelled) { setScanResult(result); setScanning(false); camera.stop(); next(); }
      } catch(e) {
        if (!cancelled) { setScanError(e.message); setScanResult(getDemoScanResult()); setScanning(false); camera.stop(); next(); }
      }
    }
    doScan();
    return () => { cancelled = true; };
  }, [step]);

  const anim = rm ? "none" : "fadeIn .4s ease";

  if (onBreak) return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:F,display:"flex",justifyContent:"center"}}>
      <Styles/>
      <div style={{width:"100%",maxWidth:400,padding:"16px 16px 32px",display:"flex",flexDirection:"column",gap:12}}>
        <Header reset={reset} si={si} onAdminOpen={()=>setShowAdmin(true)} profile={profile}/>
        <VoiceBar v={v}/>
        <BreakScreen onResume={()=>setOnBreak(false)} rm={rm}/>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:F,display:"flex",justifyContent:"center"}}>
      <Styles/>
      {showAdmin && <AdminPanel profile={profile} celeb={celeb} setCeleb={setCeleb} rm={rm} setRm={setRm} onSave={handleSaveProfile} onClose={()=>setShowAdmin(false)}/>}
      <div style={{width:"100%",maxWidth:400,padding:"16px 16px 32px",display:"flex",flexDirection:"column",gap:12}}>
        <Header reset={reset} si={si} onAdminOpen={()=>setShowAdmin(true)} profile={profile}/>
        <VoiceBar v={v}/>
        {si > 0 && si < STEPS.length-1 && !activeUseCase && <Pips cur={si-1} total={STEPS.length-2}/>}

        {/* ── Use Case Screens ── */}
        {activeUseCase==='coffee'   && <CoachTaskScreen title="☕ Coffee Shop" tasks={COFFEE_TASKS} profile={profile} onBack={()=>setActiveUseCase(null)} say={saySafe}/>}
        {activeUseCase==='swimming' && <CoachTaskScreen title="🏊 Swimming"   tasks={SWIM_TASKS}   profile={profile} onBack={()=>setActiveUseCase(null)} say={saySafe}/>}

        {/* ── Library Flow ── */}
        {!activeUseCase && <>

          {/* WELCOME / HUB */}
          {step==="welcome" && <div style={{animation:anim}}>
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:C.card,borderRadius:14,border:`1.5px solid ${C.bdr}`,marginBottom:16}}>
              <div style={{width:44,height:44,borderRadius:12,background:LVL_COLORS[profile.level],display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,color:'#fff',flexShrink:0}}>L{profile.level}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:17,fontWeight:800,color:C.text}}>{profile.name}</div>
                <div style={{fontSize:11,color:C.sub,fontWeight:600}}>{LVL_LABELS[profile.level]}</div>
              </div>
              <div style={{display:'flex',gap:4}}>
                {profile.features.map(f=>FEAT_ICONS[f]?<span key={f} style={{fontSize:14}}>{FEAT_ICONS[f]}</span>:null)}
              </div>
            </div>
            <div style={{fontSize:22,fontWeight:900,color:C.text,marginBottom:14,fontFamily:F}}>What are you doing today?</div>
            {[
              {key:'library',  icon:'📚', name:'Library',     desc:'Organise shelves · Help patrons'},
              {key:'coffee',   icon:'☕', name:'Coffee Shop', desc:'Take orders · Serve customers'},
              {key:'swimming', icon:'🏊', name:'Swimming',    desc:'Teach lessons · Manage pool'},
            ].filter(uc=>uc.key===profile.useCase).map(uc=>(
              <button key={uc.key} onClick={()=>{uc.key==='library'?next():setActiveUseCase(uc.key);}}
                style={{width:'100%',display:'flex',alignItems:'center',gap:14,padding:18,borderRadius:14,border:`2px solid ${C.bdr}`,background:C.card,cursor:'pointer',fontFamily:F,marginBottom:10,textAlign:'left'}}>
                <div style={{width:50,height:50,borderRadius:12,background:C.calmL,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26}}>{uc.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:17,fontWeight:800,color:C.text}}>{uc.name}</div>
                  <div style={{fontSize:12,color:C.sub,fontWeight:600}}>{uc.desc}</div>
                </div>
                <span style={{fontSize:20,color:C.calm,fontWeight:900}}>→</span>
              </button>
            ))}
          </div>}

          {/* OVERVIEW */}
          {step==="overview" && <div style={{animation:anim}}>
            <Hero icon="📚" text="Shelf Scan" sub="Aisle 5 · Fiction A–F"/>
            <Card style={{marginTop:12}}>
              {[{i:"🚶",t:"Go to aisle"},{i:"📷",t:"Scan shelf with GPT-4o"},{i:"🔄",t:"Fix order"}].map((s,j)=><div key={j} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:j<2?`1px solid ${C.bdr}`:"none"}}>
                <div style={{width:38,height:38,borderRadius:10,background:C.calmL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{s.i}</div>
                <span style={{fontSize:16,fontWeight:700,color:C.text}}>{s.t}</span>
              </div>)}
            </Card>
            <div style={{marginTop:16}}><Btn onClick={next} icon="🚶">Start</Btn></div>
          </div>}

          {/* GO TO AISLE */}
          {step==="go_aisle" && <div style={{animation:anim}}>
            <Hero icon="🚶" text="Go to Aisle 5" sub="Fiction section"/>
            <Card style={{marginTop:12,textAlign:"center",padding:24}}>
              <div style={{display:"inline-flex",width:80,height:80,borderRadius:20,background:C.calmL,alignItems:"center",justifyContent:"center",fontSize:40,fontWeight:900,color:C.calm,fontFamily:F}}>5</div>
              <div style={{fontSize:12,color:C.sub,fontWeight:600,marginTop:10}}>Look for this number above the shelves</div>
            </Card>
            <div style={{marginTop:16}}><Btn onClick={next} icon="📍">I'm here</Btn></div>
          </div>}

          {/* PICK SHELF */}
          {step==="pick_shelf" && <div style={{animation:anim}}>
            <Hero icon="📷" text="Point at shelf 2" sub="Count from the top"/>
            <Card style={{marginTop:12}}>
              {[1,2,3].map(n=><div key={n} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:9,marginBottom:3,background:n===2?C.calmL:C.bg,border:n===2?`2px solid ${C.calm}`:"2px solid transparent"}}>
                <span style={{fontSize:14,fontWeight:800,color:n===2?C.calm:C.sub,fontFamily:F}}>Shelf {n}</span>
                {n===2&&<span style={{fontSize:12,fontWeight:700,color:C.calm,fontFamily:F}}>← this one</span>}
              </div>)}
            </Card>
            <div style={{marginTop:16}}><Btn onClick={next} icon="📸">Open camera</Btn></div>
          </div>}

          {/* CAMERA — live feed */}
          {step==="camera" && <div style={{animation:anim}}>
            <Hero icon="📷" text="Hold steady" sub="Point camera at the shelf"/>
            <div style={{marginTop:12}}>
              <LiveCamera videoRef={camera.videoRef} ready={camera.ready} camErr={camera.camErr} scanning={false}/>
            </div>
            {camera.camErr && (
              <div style={{marginTop:8,padding:'8px 12px',background:C.warnL,borderRadius:8,border:`1px solid ${C.warnB}`}}>
                <span style={{fontSize:11,color:C.warn,fontWeight:700,fontFamily:F}}>No camera — will use demo data instead</span>
              </div>
            )}
            <div style={{marginTop:16}}><Btn onClick={next} icon="🔍">Scan now</Btn></div>
          </div>}

          {/* SCANNING — GPT-4o vision */}
          {step==="scanning" && <div style={{animation:anim}}>
            <Hero icon="🔍" text="Scanning shelf…" sub="GPT-4o is reading spine labels"/>
            <div style={{marginTop:12}}>
              <LiveCamera videoRef={camera.videoRef} ready={camera.ready} camErr={camera.camErr} scanning={true}/>
            </div>
            {scanError && (
              <div style={{marginTop:8,padding:'8px 12px',background:C.warnL,borderRadius:8,border:`1px solid ${C.warnB}`}}>
                <span style={{fontSize:11,color:C.warn,fontWeight:700,fontFamily:F}}>Scan error — using demo data</span>
              </div>
            )}
          </div>}

          {/* RESULTS */}
          {step==="results" && <div style={{animation:anim}}>
            <Hero icon="📋" text="Scan complete"/>
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <div style={{flex:1,padding:"11px 8px",borderRadius:10,background:C.okL,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <Chk/><span style={{fontSize:16,fontWeight:900,color:C.ok,fontFamily:F}}>{correctCount} correct</span>
              </div>
              <div style={{flex:1,padding:"11px 8px",borderRadius:10,background:misplacedBooks.length?C.warnL:C.okL,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                {misplacedBooks.length?<Wrn/>:<Chk/>}
                <span style={{fontSize:16,fontWeight:900,color:misplacedBooks.length?C.warn:C.ok,fontFamily:F}}>{misplacedBooks.length} wrong</span>
              </div>
            </div>
            {scanResult?.books?.length > 0 && (
              <div style={{marginTop:12}}>
                <ResultShelf books={scanResult.books} highlightCall={null}/>
              </div>
            )}
            <div style={{marginTop:14}}>
              {misplacedBooks.length > 0
                ? <Btn onClick={()=>{setFixIndex(0);next();}} icon="🔄">Fix {misplacedBooks.length} book{misplacedBooks.length>1?'s':''}</Btn>
                : <Btn onClick={next} icon="✅">Shelf looks great!</Btn>
              }
            </div>
          </div>}

          {/* FIX — dynamic, one book at a time */}
          {step==="fix" && (() => {
            const book = misplacedBooks[fixIndex];
            if (!book) { next(); return null; }
            const isLast = fixIndex === misplacedBooks.length - 1;
            return <div style={{animation:anim}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <Hero icon="👆" text={`Fix ${fixIndex+1} of ${misplacedBooks.length}`}/>
              </div>

              {/* Visual shelf with current book highlighted */}
              {scanResult?.books && <ResultShelf books={scanResult.books} highlightCall={book.call}/>}

              {/* Book card */}
              <Card style={{marginTop:12,background:C.warnL,border:`2px solid ${C.warnB}`}}>
                <div style={{fontSize:11,fontWeight:800,color:C.warn,letterSpacing:1,marginBottom:6,fontFamily:F}}>TAKE OUT THIS BOOK</div>
                <div style={{fontSize:22,fontWeight:900,color:C.text,fontFamily:F}}>{book.call}</div>
                {book.title&&<div style={{fontSize:13,color:C.sub,fontWeight:600,marginTop:2,fontFamily:F}}>{book.title}</div>}
              </Card>

              {/* Where it goes */}
              <Card style={{marginTop:10}}>
                <div style={{fontSize:11,fontWeight:800,color:C.sub,letterSpacing:1,marginBottom:8,fontFamily:F}}>WHERE IT BELONGS</div>
                {book.shouldBeAfter&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{fontSize:12,color:C.sub,fontWeight:700,fontFamily:F,minWidth:60}}>AFTER:</span>
                  <span style={{fontSize:14,fontWeight:800,color:C.text,fontFamily:F}}>{book.shouldBeAfter}</span>
                </div>}
                {book.shouldBeBefore&&<div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:12,color:C.sub,fontWeight:700,fontFamily:F,minWidth:60}}>BEFORE:</span>
                  <span style={{fontSize:14,fontWeight:800,color:C.text,fontFamily:F}}>{book.shouldBeBefore}</span>
                </div>}
                {!book.shouldBeAfter&&!book.shouldBeBefore&&<span style={{fontSize:13,color:C.sub,fontFamily:F}}>Check the alphabetical order in this section.</span>}
              </Card>

              <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:8}}>
                <Btn onClick={()=>{ if(isLast) next(); else setFixIndex(i=>i+1); }} icon="✅">
                  {isLast ? "Done — all fixed!" : "Done — next book"}
                </Btn>
                <Btn secondary onClick={()=>{ if(isLast) next(); else setFixIndex(i=>i+1); }} icon="⏭">
                  Skip this one
                </Btn>
              </div>
            </div>;
          })()}

          {/* COMPLETE */}
          {step==="complete" && <Celebrate level={celeb} rm={rm} onNext={reset} onBreak={()=>setOnBreak(true)} fixed={misplacedBooks.length} total={totalCount||6}/>}
        </>}
      </div>
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────
function Header({reset, si, onAdminOpen, profile}) {
  return <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{width:36,height:36,borderRadius:10,background:C.calm,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#fff",fontWeight:900}}>B</div>
      <div>
        <div style={{fontSize:15,fontWeight:800,color:C.text,lineHeight:1.2,fontFamily:F}}>BuddyWork</div>
        <div style={{fontSize:10,color:C.sub,fontWeight:600,fontFamily:F}}>Powered by GPT-4o</div>
      </div>
    </div>
    <div style={{display:"flex",gap:5,alignItems:"center"}}>
      <div style={{padding:'3px 9px',borderRadius:8,background:LVL_COLORS[profile.level]+'22',border:`1.5px solid ${LVL_COLORS[profile.level]}55`}}>
        <span style={{fontSize:11,fontWeight:800,color:LVL_COLORS[profile.level],fontFamily:F}}>L{profile.level} · {profile.name}</span>
      </div>
      <button onClick={onAdminOpen} style={{width:34,height:34,borderRadius:8,border:`1.5px solid ${C.bdr}`,background:C.card,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}} title="Admin Panel">⚙️</button>
      {si>0&&<button onClick={reset} style={{width:34,height:34,borderRadius:8,border:`1.5px solid ${C.bdr}`,background:C.card,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>🏠</button>}
    </div>
  </div>
}

// ── Styles ─────────────────────────────────────────────────────────────────────
function Styles() {
  return <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
    @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes bob     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
    @keyframes scanLine{ 0%{top:8px} 100%{top:calc(100% - 10px)} }
    @keyframes pulse   { 0%,100%{opacity:.6} 50%{opacity:1} }
    @keyframes bar     { from{height:4px} to{height:14px} }
    @keyframes sparkle { 0%{opacity:0;transform:scale(0) rotate(0)} 40%{opacity:1;transform:scale(1.2) rotate(10deg)} 100%{opacity:0;transform:scale(.8) rotate(-5deg) translateY(-20px)} }
    @keyframes breathe { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(1.4);opacity:.8} }
    @keyframes shimmer { 0%{opacity:.5} 50%{opacity:1} 100%{opacity:.5} }
    * { box-sizing:border-box; -webkit-tap-highlight-color:transparent }
    body { margin:0 }
  `}</style>
}

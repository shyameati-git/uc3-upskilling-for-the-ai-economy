import { useState, useEffect, useCallback, useRef } from "react";

// ── Constants ──
const STEPS = ["greeting","welcome","overview","go_aisle","pick_shelf","camera","scanning","results","fix1","fix2","fix3","fix4","complete"];
const VOICE = {
  greeting:"Good morning, Dylan! Today you have one task — shelf scan in Aisle 5. You'll walk to the aisle, scan the shelf, and fix any books out of order. You've got this. Tap Let's go when you're ready.",
  welcome:"Your tasks for today are ready. Tap Shelf Scan to begin.",
  overview:"Shelf Scan. Go to the aisle, scan the shelf, fix any books out of order. Tap Start.",
  go_aisle:"Walk to Aisle 5 in the Fiction section. Look for the number 5 above the shelves. Tap I'm here when you arrive.",
  pick_shelf:"Point your camera at the second shelf from the top. Count from the top. One. Two. Tap Open Camera.",
  camera:"Hold your phone steady pointing at the shelf. Tap Scan Now when ready.",
  scanning:"Scanning. Hold still.",
  results:"Scan complete. 4 books correct. 2 books in the wrong place. Tap Fix Them.",
  fix1:"Take out the book labeled F I C, H E R. Hold it in your hand. Tap Done.",
  fix2:"Take out the book labeled F I C, D I C. Hold both books. Tap Done.",
  fix3:"Put F I C, D I C in first. D comes before H. Tap Done.",
  fix4:"Put F I C, H E R right after it. Tap Done.",
  complete:"Shelf is correct. 6 books checked. 2 fixed.",
};
const C = {calm:"#38836F",calmL:"#EAF4F0",calmD:"#235F4A",warn:"#C07219",warnL:"#FFF8EC",warnB:"#EDD49A",ok:"#38836F",okL:"#EAF4F0",text:"#162820",sub:"#527064",bg:"#EDF2F0",card:"#FFFFFF",bdr:"#D4E3DC",gold:"#9E7800",goldL:"#FFF8E5",surface:"#F4F8F6",err:"#C0392B",errL:"#FEF0EE"};
const BOOKS = [
  {id:1,call:"FIC ADA",color:"#4A7FA8"},{id:2,call:"FIC BRA",color:"#C49360"},
  {id:3,call:"FIC CLA",color:"#5E8E65"},{id:4,call:"FIC HER",color:"#B06040"},
  {id:5,call:"FIC DIC",color:"#7B6BA8"},{id:6,call:"FIC LEG",color:"#9E6878"},
];
const FIXED = [BOOKS[0],BOOKS[1],BOOKS[2],BOOKS[4],BOOKS[3],BOOKS[5]];
const GAP = {id:99,call:"",color:"#DCE2DE"};
const SLOT = {id:98,call:"?",color:"#E4EAE6"};
const STEP_TOASTS = {
  go_aisle:"You found it! 🎯",
  pick_shelf:"Right shelf! 📚",
  results:"Scan done! ✨",
  fix1:"First book out! ⭐",
  fix2:"Both books — awesome! 💪",
  fix3:"D before H — you got it! 🎯",
  fix4:"Last one — you're a pro! 🌟",
};
const BADGES = [
  {id:"scanner",icon:"📷",name:"Scanner Pro",desc:"Completed first shelf scan"},
  {id:"fixer",icon:"🔧",name:"Book Fixer",desc:"Fixed 2 misplaced books"},
  {id:"alphabet",icon:"🔤",name:"ABC Expert",desc:"Mastered D before H"},
  {id:"streak",icon:"🔥",name:"3-Day Streak",desc:"3 days in a row"},
  {id:"ontime",icon:"⏱️",name:"On Time",desc:"Task done efficiently"},
];

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "http://localhost:7071").replace(/\/$/, "");

// ── Admin Panel constants ──
const LVL_COLORS = {1:"#3d9e68",2:"#d4860a",3:"#c0392b"};
const LVL_LABELS = {1:"Low Support",2:"Medium Support",3:"High Support"};
const FEAT_ICONS  = {text:"📝",voice:"🎤",image:"📷",both:"✨"};

function loadProfile() {
  return {
    name:     localStorage.getItem('p_name')     || 'Dylan',
    level:    parseInt(localStorage.getItem('p_level') || '2'),
    useCase:  localStorage.getItem('p_usecase')  || 'library',
    features: JSON.parse(localStorage.getItem('p_features') || '["text","image"]'),
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

// ── Voice Hook ──
function useVoice(){
  const uRef=useRef(null);
  const [on,setOn]=useState(true);
  const [spd,setSpd]=useState(0.85);
  const [talking,setTalking]=useState(false);
  const say=useCallback((txt)=>{
    if(!on||!window.speechSynthesis)return;
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(txt);
    u.rate=spd;u.pitch=1;
    u.onstart=()=>setTalking(true);u.onend=()=>setTalking(false);u.onerror=()=>setTalking(false);
    const vs=window.speechSynthesis.getVoices();
    const v=vs.find(v=>v.name.includes("Samantha"))||vs.find(v=>v.name.includes("Google")&&v.lang.startsWith("en"))||vs.find(v=>v.lang.startsWith("en"));
    if(v)u.voice=v;
    uRef.current=u;window.speechSynthesis.speak(u);
  },[on,spd]);
  const stop=useCallback(()=>{window.speechSynthesis?.cancel();setTalking(false)},[]);
  const replay=useCallback(()=>{if(uRef.current){window.speechSynthesis?.cancel();const u=new SpeechSynthesisUtterance(uRef.current.text);u.rate=spd;u.pitch=1;if(uRef.current.voice)u.voice=uRef.current.voice;u.onstart=()=>setTalking(true);u.onend=()=>setTalking(false);window.speechSynthesis.speak(u)}},[spd]);
  return{say,stop,replay,talking,on,setOn,spd,setSpd};
}

// ── Shared Components ──
const F="'Nunito',sans-serif";
const shadow={card:"0 1px 3px rgba(0,0,0,.04),0 6px 20px rgba(0,0,0,.06)",btn:`0 4px 16px rgba(56,131,111,.38),0 1px 3px rgba(0,0,0,.08)`,sm:"0 1px 4px rgba(0,0,0,.07)"};
function Btn({children,onClick,icon,secondary,small}){
  const base={width:"100%",padding:small?"12px 18px":"17px 22px",fontSize:small?14:16,fontWeight:700,letterSpacing:".25px",fontFamily:F,borderRadius:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:9,transition:"transform .12s,box-shadow .12s"};
  const pri={...base,border:"none",background:`linear-gradient(148deg,${C.calm} 0%,${C.calmD} 100%)`,color:"#fff",boxShadow:shadow.btn};
  const sec={...base,border:`1.5px solid ${C.bdr}`,background:C.card,color:C.text,boxShadow:shadow.sm};
  return <button onClick={onClick} style={secondary?sec:pri} onMouseDown={e=>e.currentTarget.style.transform="scale(.97)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>{icon&&<span style={{fontSize:small?18:20}}>{icon}</span>}{children}</button>;
}
function Hero({icon,text,sub}){
  return <div style={{textAlign:"center",padding:"4px 16px 8px"}}>
    <div style={{width:60,height:60,borderRadius:18,background:C.calmL,border:`1.5px solid ${C.calm}22`,margin:"0 auto 14px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,boxShadow:`inset 0 1px 0 rgba(255,255,255,.7)`}}>{icon}</div>
    <div style={{fontSize:22,fontWeight:800,color:C.text,lineHeight:1.25,fontFamily:F,letterSpacing:"-.3px"}}>{text}</div>
    {sub&&<div style={{fontSize:13,color:C.sub,fontWeight:600,marginTop:5,fontFamily:F}}>{sub}</div>}
  </div>
}
function Pips({cur,total}){
  return <div style={{display:"flex",gap:5,justifyContent:"center",padding:"2px 0"}}>{Array.from({length:total},(_,i)=><div key={i} style={{width:i===cur?22:7,height:7,borderRadius:4,background:i===cur?C.calm:i<cur?C.calm+"60":C.bdr,transition:"all .4s cubic-bezier(.34,1.56,.64,1)"}}/>)}</div>
}
function Card({children,style}){return<div style={{background:C.card,borderRadius:20,padding:20,border:`1px solid ${C.bdr}`,boxShadow:shadow.card,...style}}>{children}</div>}
function Section({title,hint,children}){
  return <div style={{marginBottom:24}}>
    <div style={{fontSize:11,fontWeight:800,color:C.sub,letterSpacing:1,marginBottom:hint?4:10,fontFamily:F}}>{title}</div>
    {hint&&<div style={{fontSize:12,color:C.sub,fontWeight:600,marginBottom:10,fontFamily:F}}>{hint}</div>}
    {children}
  </div>
}

// ── Opening / Greeting Screen ──
function Greeting({onStart,rm}){
  const [show,setShow]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setShow(true),150);return()=>clearTimeout(t)},[]);
  const ease=(d)=>rm?"none":`all .5s cubic-bezier(.22,1,.36,1) ${d}s`;
  return(
    <div style={{animation:rm?"none":"fadeIn .35s ease",margin:"0 -16px"}}>

      {/* ── Hero ── */}
      <div style={{background:"linear-gradient(155deg,#2d6b5c 0%,#3d8a79 45%,#1e4d42 100%)",padding:"40px 28px 68px",position:"relative",overflow:"hidden"}}>
        {/* Decorative rings */}
        <div style={{position:"absolute",top:-90,right:-90,width:280,height:280,borderRadius:"50%",border:"1px solid rgba(255,255,255,.07)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:-55,right:-55,width:210,height:210,borderRadius:"50%",border:"1px solid rgba(255,255,255,.05)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:-110,left:-70,width:300,height:300,borderRadius:"50%",background:"rgba(0,0,0,.09)",pointerEvents:"none"}}/>

        {/* Avatar */}
        <div style={{width:68,height:68,borderRadius:"50%",background:"rgba(255,255,255,.14)",border:"1.5px solid rgba(255,255,255,.28)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:33,marginBottom:24,opacity:show?1:0,transform:show?"scale(1)":"scale(.65)",transition:ease(0)}}>👷</div>

        {/* Eyebrow */}
        <div style={{fontSize:11,fontWeight:800,color:"rgba(255,255,255,.55)",letterSpacing:2.5,textTransform:"uppercase",fontFamily:F,marginBottom:9,opacity:show?1:0,transition:rm?"none":`opacity .4s ease .15s`}}>Good morning</div>

        {/* Name */}
        <div style={{fontSize:40,fontWeight:900,color:"#fff",lineHeight:1.05,fontFamily:F,marginBottom:10,opacity:show?1:0,transform:show?"translateY(0)":"translateY(14px)",transition:ease(.2)}}>Dylan 👋</div>

        {/* Subtitle */}
        <div style={{fontSize:14,color:"rgba(255,255,255,.6)",fontWeight:600,fontFamily:F,opacity:show?1:0,transition:rm?"none":`opacity .4s ease .32s`}}>Tuesday · You've got this today</div>
      </div>

      {/* ── Stats sheet (slides up over hero) ── */}
      <div style={{background:C.card,borderRadius:"24px 24px 0 0",marginTop:-30,padding:"28px 20px 28px",boxShadow:"0 -4px 24px rgba(0,0,0,.08)",opacity:show?1:0,transform:show?"translateY(0)":"translateY(22px)",transition:ease(.38)}}>

        {/* Stat tiles */}
        <div style={{display:"flex",gap:10,marginBottom:24}}>
          {[{i:"🔥",n:"3",l:"Day streak"},{i:"⭐",n:"12",l:"Tasks done"},{i:"✅",n:"100%",l:"On time"}].map((s,j)=>(
            <div key={j} style={{flex:1,padding:"14px 8px 12px",borderRadius:16,background:C.bg,textAlign:"center",border:`1px solid ${C.bdr}`}}>
              <div style={{fontSize:22,lineHeight:1,marginBottom:5}}>{s.i}</div>
              <div style={{fontSize:18,fontWeight:900,color:C.text,fontFamily:F,lineHeight:1}}>{s.n}</div>
              <div style={{fontSize:10,fontWeight:700,color:C.sub,fontFamily:F,marginTop:4}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Btn onClick={onStart} icon="→">Let's go!</Btn>
      </div>
    </div>
  );
}

// ── Check / Warning shapes ──
const Chk=()=><svg width="18" height="18" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill={C.ok}/><path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const Wrn=()=><svg width="18" height="18" viewBox="0 0 20 20"><polygon points="10,2 19,18 1,18" fill={C.err}/><text x="10" y="15" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800">!</text></svg>;

// ── Book Spine ──
function Spine({book,status,arrow}){
  const m=status==="misplaced",f=status==="fixed",co=status==="correct";
  return <div style={{display:"flex",flexDirection:"column",alignItems:"center",position:"relative"}}>
    {arrow&&<div style={{position:"absolute",top:-30,display:"flex",flexDirection:"column",alignItems:"center",animation:"bob 2s ease-in-out infinite"}}><span style={{fontSize:10,fontWeight:800,color:C.warn,fontFamily:F}}>{arrow}</span><span style={{fontSize:14,color:C.warn}}>↓</span></div>}
    <div style={{width:44,height:120,borderRadius:"4px 4px 2px 2px",background:`linear-gradient(180deg,${book.color},${book.color}cc)`,border:m?`3px solid ${C.err}`:f?`3px solid ${C.ok}`:co?`3px solid ${C.ok}44`:"3px solid transparent",boxShadow:m?`0 0 12px ${C.err}55`:"0 2px 4px #00000012",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",padding:"6px 3px",transition:"all .3s"}}>
      <div style={{width:16,height:16,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{(co||f)?<Chk/>:m?<Wrn/>:null}</div>
      <span style={{writingMode:"vertical-rl",textOrientation:"mixed",fontSize:8,color:"#fff",fontWeight:800,fontFamily:F,textShadow:"0 1px 2px #00000033",letterSpacing:.5}}>{book.call}</span>
    </div>
    <span style={{fontSize:9,color:C.sub,marginTop:3,fontWeight:700,fontFamily:F}}>{book.call}</span>
  </div>
}
function Shelf({books,statuses,arrows}){
  return <div style={{background:"linear-gradient(180deg,#EDE5DA,#DDD4C8)",borderRadius:12,padding:"16px 10px 10px",border:"2px solid #CFC5B8"}}>
    <div style={{height:4,background:"#BFB3A5",borderRadius:2,marginBottom:10}}/>
    <div style={{display:"flex",justifyContent:"center",gap:6,alignItems:"flex-end",minHeight:158,paddingTop:28}}>
      {books.map((b,i)=><Spine key={b.id+"-"+i} book={b} status={statuses?.[i]||"none"} arrow={arrows?.[i]}/>)}
    </div>
    <div style={{height:4,background:"#BFB3A5",borderRadius:2,marginTop:10}}/>
  </div>
}

// ── Simulated Camera View ──
function CameraView({scanning,progress,reducedMotion}){
  return <div style={{background:"#181818",borderRadius:14,padding:14,position:"relative",overflow:"hidden"}}>
    <div style={{height:180,borderRadius:10,background:"linear-gradient(135deg,#222,#1a1a1a)",display:"flex",alignItems:"center",justifyContent:"center",gap:5,position:"relative",overflow:"hidden"}}>
      {/* Simulated book spines in camera */}
      {BOOKS.map(b=><div key={b.id} style={{width:24,height:68,borderRadius:3,background:b.color,opacity:.55,boxShadow:"inset 0 0 8px #00000033"}}/>)}
      {/* Scan line */}
      {scanning&&!reducedMotion&&<div style={{position:"absolute",left:8,right:8,height:2,background:C.calm,boxShadow:`0 0 12px ${C.calm}88`,animation:"scanLine 2.2s ease-in-out infinite"}}/>}
      {/* Camera indicators */}
      <div style={{position:"absolute",top:10,left:12,display:"flex",alignItems:"center",gap:5}}>
        <div style={{width:7,height:7,borderRadius:"50%",background:scanning?"#E85454":C.calm,animation:!reducedMotion?"pulse 2s infinite":"none"}}/>
        <span style={{fontSize:10,color:"#888",fontWeight:700,fontFamily:F}}>{scanning?"REC":"READY"}</span>
      </div>
      {/* Crosshair corners */}
      {!scanning&&<>
        <div style={{position:"absolute",top:20,left:20,width:24,height:24,borderTop:"2px solid #5A9E8F66",borderLeft:"2px solid #5A9E8F66"}}/>
        <div style={{position:"absolute",top:20,right:20,width:24,height:24,borderTop:"2px solid #5A9E8F66",borderRight:"2px solid #5A9E8F66"}}/>
        <div style={{position:"absolute",bottom:20,left:20,width:24,height:24,borderBottom:"2px solid #5A9E8F66",borderLeft:"2px solid #5A9E8F66"}}/>
        <div style={{position:"absolute",bottom:20,right:20,width:24,height:24,borderBottom:"2px solid #5A9E8F66",borderRight:"2px solid #5A9E8F66"}}/>
      </>}
    </div>
    {/* Progress bar during scan */}
    {scanning&&<div style={{marginTop:10}}>
      <div style={{height:6,borderRadius:3,background:"#333",overflow:"hidden"}}><div style={{width:`${progress}%`,height:"100%",borderRadius:3,background:C.calm,transition:"width .15s linear"}}/></div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
        <span style={{fontSize:11,color:"#777",fontWeight:700,fontFamily:F}}>{Math.min(Math.floor(progress/17)+1,6)} of 6 found</span>
        <span style={{fontSize:11,color:C.calm,fontWeight:800,fontFamily:F}}>{progress}%</span>
      </div>
    </div>}
  </div>
}

// ── AI Assistant (replaces VoiceBar) ──
function getFallbackReply(text, step) {
  const lc = (text||"").toLowerCase();
  if(lc.match(/where|aisle|find|go|walk|location/)) return "Walk to Aisle 5. Look for the large number 5 sign hanging above the shelves in the Fiction section.";
  if(lc.match(/scan|camera|phone|hold|picture/)) return "Point your phone at the second shelf from the top. Count: one, two. Hold it steady and tap Scan Now.";
  if(lc.match(/book|wrong|fix|order|alphabet|sort|swap/)) return "Books go in alphabetical order. D comes before H, so FIC DIC goes before FIC HER.";
  if(lc.match(/help|confus|don.t|understand|hard|difficult/)) return "That's okay. Take a breath. Tell me which part is tricky and I'll break it down step by step.";
  if(lc.match(/break|tired|stop|rest/)) return "You can take a break any time. Tap the break button when your task is done.";
  const byStep={
    greeting:"You have one task today — Shelf Scan in Aisle 5. Tap Let's go to begin.",
    welcome:"Tap Shelf Scan to start your first task.",
    overview:"You'll walk to Aisle 5, scan shelf 2 with your phone, then fix any books out of order.",
    go_aisle:"Walk to Aisle 5. It's in the Fiction section. Look up for the big number 5 sign.",
    pick_shelf:"Count shelves from the top: one, two. Point your phone at shelf 2.",
    camera:"Hold your phone level and steady, pointing at the books on shelf 2.",
    scanning:"Keep your phone very still. I'm reading the labels. It takes a few seconds.",
    results:"Green books are correct. Yellow books need to be moved. Tap Fix Them to start.",
    fix1:"Take the highlighted book off the shelf. Hold it in your hand.",
    fix2:"Take this book too. Now hold both books in your hands.",
    fix3:"Put FIC DIC back first. D comes before H in the alphabet.",
    fix4:"Place FIC HER right after FIC DIC. You're almost done.",
    complete:"The shelf is done. You checked 6 books and fixed 2.",
  };
  return byStep[step]||"I'm here to help. Tell me what you need.";
}

function AIAssistant({v, step}){
  const [open,setOpen]=useState(false);
  const [msgs,setMsgs]=useState([{role:"ai",text:"Hi Dylan! I'm your BuddyWork assistant. Ask me anything about your task."}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [listening,setListening]=useState(false);
  const listRef=useRef(null);

  useEffect(()=>{if(listRef.current)listRef.current.scrollTop=listRef.current.scrollHeight;},[msgs,loading]);

  const send=useCallback(async(text)=>{
    const t=(text||"").trim();if(!t)return;
    setMsgs(m=>[...m,{role:"user",text:t}]);
    setInput("");setLoading(true);
    try{
      const res=await fetch(`${API_BASE_URL}/api/chat`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({message:t,step,workerName:"Dylan"}),
        signal:AbortSignal.timeout(5000),
      });
      const data=await res.json();
      const reply=data.reply||getFallbackReply(t,step);
      setMsgs(m=>[...m,{role:"ai",text:reply}]);
      v.say(reply);
    }catch{
      const reply=getFallbackReply(t,step);
      setMsgs(m=>[...m,{role:"ai",text:reply}]);
      v.say(reply);
    }finally{setLoading(false);}
  },[step,v]);

  const startListen=useCallback(()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR)return;
    const r=new SR();r.lang="en-US";r.interimResults=false;r.maxAlternatives=1;
    r.onstart=()=>setListening(true);
    r.onend=()=>setListening(false);
    r.onerror=()=>setListening(false);
    r.onresult=(e)=>send(e.results[0][0].transcript);
    r.start();
  },[send]);

  return(
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:400,zIndex:60}}>
      <div style={{background:C.card,borderRadius:open?"20px 20px 0 0":"14px 14px 0 0",borderTop:`1.5px solid ${open?C.calm:C.bdr}`,borderLeft:`1.5px solid ${open?C.calm:C.bdr}`,borderRight:`1.5px solid ${open?C.calm:C.bdr}`,borderBottom:"none",boxShadow:"0 -4px 28px rgba(0,0,0,.13)",overflow:"hidden",transition:"border-color .2s"}}>

        {/* ── Chat panel — opens upward above compact bar ── */}
        {open&&<>
          <div ref={listRef} style={{maxHeight:230,overflowY:"auto",padding:"12px 12px 4px",display:"flex",flexDirection:"column",gap:8}}>
            {msgs.map((m,i)=>(
              <div key={i} style={{display:"flex",gap:7,alignItems:"flex-end",flexDirection:m.role==="user"?"row-reverse":"row"}}>
                <div style={{fontSize:18,flexShrink:0,lineHeight:1}}>{m.role==="ai"?"🤖":"👷"}</div>
                <div style={{maxWidth:"78%"}}>
                  <div style={{padding:"9px 13px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?C.calm:C.bg,color:m.role==="user"?"#fff":C.text,fontSize:13,fontWeight:600,lineHeight:1.5,fontFamily:F,border:m.role==="ai"?`1px solid ${C.bdr}`:"none",boxShadow:m.role==="user"?`0 2px 8px ${C.calm}33`:"none"}}>{m.text}</div>
                  {m.role==="ai"&&<button onClick={()=>v.say(m.text)} style={{fontSize:10,color:C.sub,background:"none",border:"none",cursor:"pointer",padding:"2px 6px",fontFamily:F,fontWeight:700,marginTop:2,display:"flex",alignItems:"center",gap:3}}><span>🔊</span>Play</button>}
                </div>
              </div>
            ))}
            {loading&&(
              <div style={{display:"flex",gap:7,alignItems:"flex-end"}}>
                <div style={{fontSize:18,lineHeight:1}}>🤖</div>
                <div style={{padding:"10px 14px",borderRadius:"16px 16px 16px 4px",background:C.bg,border:`1px solid ${C.bdr}`}}>
                  <div style={{display:"flex",gap:5}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:C.sub,opacity:.5,animation:`pulse ${.55+i*.15}s ease-in-out ${i*.18}s infinite alternate`}}/>)}</div>
                </div>
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:6,padding:"8px 10px",borderTop:`1px solid ${C.bdr}`}}>
            <button onClick={startListen} style={{width:42,height:42,borderRadius:11,border:"none",background:listening?C.calm:C.calmL,color:listening?"#fff":C.calm,cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:listening?`0 0 0 3px ${C.calm}33`:"none",transition:"all .2s"}}>🎤</button>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send(input)} placeholder="Type a question…" style={{flex:1,padding:"9px 13px",borderRadius:11,border:`1.5px solid ${C.bdr}`,fontSize:13,fontFamily:F,outline:"none",background:"#fff",color:C.text,minWidth:0}}/>
            <button onClick={()=>send(input)} style={{width:42,height:42,borderRadius:11,border:"none",background:C.calm,color:"#fff",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 2px 8px ${C.calm}44`}}>→</button>
          </div>
          <div style={{height:1,background:C.bdr}}/>
        </>}

        {/* ── Compact bar — always visible at bottom ── */}
        <div style={{display:"flex",alignItems:"center",gap:5,padding:"8px 10px"}}>
          <button onClick={()=>v.setOn(o=>!o)} style={{width:34,height:34,borderRadius:8,border:"none",background:v.on?C.calmL:C.bg,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>{v.on?"🔊":"🔇"}</button>
          {v.on&&<>
            <button onClick={v.replay} style={{width:34,height:34,borderRadius:8,border:"none",background:C.bg,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>🔄</button>
            <div style={{display:"flex",gap:3}}>{[{s:.6,l:"Slow"},{s:.85,l:"Med"},{s:1.1,l:"Fast"}].map(o=><button key={o.s} onClick={()=>v.setSpd(o.s)} style={{padding:"3px 7px",borderRadius:5,border:"none",background:v.spd===o.s?C.calm:C.bg,color:v.spd===o.s?"#fff":C.sub,fontSize:10,fontWeight:800,cursor:"pointer",fontFamily:F}}>{o.l}</button>)}</div>
          </>}
          {v.talking&&!open&&<div style={{display:"flex",alignItems:"center",gap:2,marginLeft:4}}>{[0,1,2].map(i=><div key={i} style={{width:3,background:C.calm,borderRadius:1,animation:`bar ${.35+i*.12}s ease-in-out infinite alternate`}}/>)}</div>}
          <button onClick={()=>setOpen(o=>!o)} style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5,padding:"7px 12px",borderRadius:8,border:"none",background:open?C.calm:C.calmL,color:open?"#fff":C.calm,cursor:"pointer",fontSize:12,fontWeight:800,fontFamily:F,whiteSpace:"nowrap",flexShrink:0}}>
            <span style={{fontSize:15}}>{open?"✕":"💬"}</span>{open?"Close":"Ask for help"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Step Celebration Toast ──
function StepToast({message,rm}){
  return(
    <div style={{position:"fixed",top:"42%",left:"50%",transform:"translate(-50%,-50%)",background:"rgba(25,42,36,.93)",color:"#fff",borderRadius:22,padding:"16px 28px",fontSize:18,fontWeight:800,fontFamily:F,zIndex:150,textAlign:"center",boxShadow:"0 10px 40px rgba(0,0,0,.28)",animation:rm?"none":"toastPop .4s cubic-bezier(.34,1.56,.64,1)",pointerEvents:"none",whiteSpace:"nowrap"}}>
      {message}
    </div>
  );
}

// ── Settings Panel ──
function Settings({celeb,setCeleb,rm,setRm,onClose}){
  return <div style={{position:"fixed",inset:0,background:"#00000040",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100,fontFamily:F}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:420,background:C.card,borderRadius:"20px 20px 0 0",padding:"22px 18px 32px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <span style={{fontSize:18,fontWeight:800,color:C.text}}>Settings</span>
        <button onClick={onClose} style={{width:30,height:30,borderRadius:8,border:"none",background:C.bg,cursor:"pointer",fontSize:14}}>✕</button>
      </div>
      <div style={{fontSize:12,fontWeight:700,color:C.sub,marginBottom:8}}>CELEBRATION STYLE</div>
      <div style={{display:"flex",gap:7,marginBottom:18}}>
        {[{id:"calm",ic:"✓",nm:"Calm",ds:"Checkmark only"},{id:"medium",ic:"⭐",nm:"Stars",ds:"Stars + streak"},{id:"full",ic:"🏆",nm:"Party",ds:"Full celebration"}].map(o=><button key={o.id} onClick={()=>setCeleb(o.id)} style={{flex:1,padding:"12px 6px",borderRadius:12,border:celeb===o.id?`2px solid ${C.calm}`:`2px solid ${C.bdr}`,background:celeb===o.id?C.calmL:C.card,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
          <span style={{fontSize:22}}>{o.ic}</span>
          <span style={{fontSize:12,fontWeight:800,color:C.text,fontFamily:F}}>{o.nm}</span>
          <span style={{fontSize:9,color:C.sub,fontWeight:600,fontFamily:F}}>{o.ds}</span>
        </button>)}
      </div>
      <div style={{fontSize:12,fontWeight:700,color:C.sub,marginBottom:8}}>MOTION</div>
      <button onClick={()=>setRm(r=>!r)} style={{width:"100%",padding:"12px 14px",borderRadius:12,border:`2px solid ${C.bdr}`,background:C.card,cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontFamily:F}}>
        <span style={{fontSize:20}}>{rm?"🔇":"✨"}</span>
        <div style={{textAlign:"left",flex:1}}>
          <div style={{fontSize:13,fontWeight:800,color:C.text}}>{rm?"Reduced motion":"Animations on"}</div>
          <div style={{fontSize:10,color:C.sub,fontWeight:600}}>Tap to toggle</div>
        </div>
        <div style={{width:40,height:22,borderRadius:11,padding:2,background:rm?C.calm:C.bdr,display:"flex",alignItems:  "center",justifyContent:rm?"flex-end":"flex-start",transition:"all .2s"}}>
          <div style={{width:18,height:18,borderRadius:"50%",background:"#fff"}}/>
        </div>
      </button>
    </div>
  </div>
}

// ── Admin Panel ──
function AdminPanel({profile, celeb, setCeleb, rm, setRm, onSave, onClose}) {
  const [name,     setName]     = useState(profile.name);
  const [level,    setLevel]    = useState(profile.level);
  const [useCase,  setUseCase]  = useState(profile.useCase);
  const [features, setFeatures] = useState(profile.features);
  const [apiKey,   setApiKey]   = useState(profile.apiKey);

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
            {l:1,desc:'Needs occasional reminders and guidance for new tasks',ui:'Standard text · All features'},
            {l:2,desc:'Needs clear step-by-step instructions for most tasks',ui:'Larger text · Simplified layout'},
            {l:3,desc:'Needs maximum simplification and one step at a time',ui:'Large text · One task · Break reminders'},
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
            {key:'library',icon:'📚',name:'Library',desc:'Shelves & patrons'},
            {key:'coffee',icon:'☕',name:'Coffee Shop',desc:'Orders & customers'},
            {key:'swimming',icon:'🏊',name:'Swimming',desc:'Lessons & safety'},
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
            {key:'text',icon:'📝',name:'Text',desc:'Written instructions'},
            {key:'voice',icon:'🎤',name:'Voice',desc:'Spoken guidance'},
            {key:'image',icon:'📷',name:'Image',desc:'Camera scanning'},
            {key:'both',icon:'✨',name:'All Features',desc:'Full experience'},
          ].map(f=>(
            <button key={f.key} onClick={()=>toggleFeat(f.key)} style={{padding:'12px 8px',borderRadius:12,border:`2px solid ${features.includes(f.key)?C.calm:C.bdr}`,background:features.includes(f.key)?C.calmL:C.card,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4,fontFamily:F}}>
              <span style={{fontSize:22}}>{f.icon}</span>
              <span style={{fontSize:12,fontWeight:800,color:C.text}}>{f.name}</span>
              <span style={{fontSize:9,color:C.sub,fontWeight:600,textAlign:'center'}}>{f.desc}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="API KEY" hint="Optional: OpenAI key for live AI coaching.">
        <input value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-…" type="password" style={inp}/>
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

      <button onClick={()=>onSave({name:name.trim()||'Dylan',level,useCase,features:features.length?features:['text'],apiKey})} style={{width:'100%',padding:'20px 24px',fontSize:18,fontWeight:800,fontFamily:F,border:'none',borderRadius:16,cursor:'pointer',background:C.calm,color:'#fff',boxShadow:`0 4px 14px ${C.calm}30`}}>
        Save Profile
      </button>
      <div style={{height:32}}/>
    </div>
  </div>
}

// ── Celebration ──
function Celebrate({level,rm,onNext,onBreak,earnedBadges=[]}){
  const [show,setShow]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setShow(true),900);return()=>clearTimeout(t);},[]);
  return <div style={{animation:rm?"none":"fadeIn .5s ease"}}>
    {level==="calm"&&<Card style={{textAlign:"center",padding:"32px 18px",border:`2px solid ${C.calm}33`}}>
      <div style={{fontSize:48,marginBottom:10,transition:"transform .5s",transform:show?"scale(1)":"scale(.8)"}}>✓</div>
      <div style={{fontSize:22,fontWeight:900,color:C.text,fontFamily:F}}>Shelf is correct</div>
      <div style={{display:"flex",justifyContent:"center",gap:28,marginTop:20}}>
        {[{n:"6",l:"Checked"},{n:"2",l:"Fixed"}].map((s,i)=><div key={i} style={{textAlign:"center"}}><div style={{fontSize:26,fontWeight:900,color:C.calm}}>{s.n}</div><div style={{fontSize:11,color:C.sub,fontWeight:700,fontFamily:F}}>{s.l}</div></div>)}
      </div>
    </Card>}
    {level==="medium"&&<Card style={{textAlign:"center",padding:"28px 18px",border:`2px solid ${C.calm}33`,background:`linear-gradient(160deg,${C.card},${C.calmL})`}}>
      <div style={{display:"flex",justifyContent:"center",gap:5,marginBottom:14}}>
        {[0,1,2].map(i=><div key={i} style={{fontSize:30,opacity:show?1:0,transform:show?"translateY(0) scale(1)":"translateY(10px) scale(.5)",transition:rm?"none":`all .4s ease ${i*.15+.2}s`}}>⭐</div>)}
      </div>
      <div style={{fontSize:21,fontWeight:900,color:C.text,fontFamily:F}}>Shelf is correct</div>
      <div style={{fontSize:14,color:C.sub,fontWeight:600,marginTop:5,fontFamily:F}}>6 checked · 2 fixed</div>
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
      <div style={{fontSize:14,color:C.sub,fontWeight:600,marginTop:5,fontFamily:F}}>6 checked · 2 fixed</div>
      <div style={{marginTop:18,padding:"12px 14px",background:"#fff",borderRadius:12,boxShadow:"0 2px 8px #00000008"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:8}}>
          <span style={{fontSize:18}}>🏆</span>
          <span style={{fontSize:15,fontWeight:800,color:C.gold,fontFamily:F}}>New streak: 3 days!</span>
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:4}}>
          {["M","T","W","T","F"].map((d,i)=><div key={i} style={{width:30,height:30,borderRadius:7,background:i<=2?C.calmL:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:i<=2?C.calm:C.sub,border:i===2?`2px solid ${C.calm}`:"2px solid transparent",fontFamily:F}}>{i<=2?"✓":d}</div>)}
        </div>
      </div>
    </Card>}
    {/* ── Badges ── */}
    {earnedBadges.length>0&&<div style={{marginTop:14}}>
      <div style={{fontSize:10,fontWeight:800,color:C.sub,letterSpacing:1.5,marginBottom:8}}>BADGES EARNED</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {earnedBadges.map((b,i)=>(
          <div key={b.id} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 13px",borderRadius:14,background:C.goldL,border:`1.5px solid ${C.gold}44`,opacity:show?1:0,transform:show?"translateY(0)":"translateY(8px)",transition:`all .4s ease ${i*.12+.5}s`}}>
            <span style={{fontSize:22}}>{b.icon}</span>
            <div>
              <div style={{fontSize:12,fontWeight:800,color:C.text,fontFamily:F}}>{b.name}</div>
              <div style={{fontSize:9,fontWeight:700,color:C.sub,fontFamily:F}}>{b.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>}
    <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:8}}>
      <Btn onClick={onNext} icon="→">Next task</Btn>
      <Btn onClick={onBreak} secondary icon="😌">Take a break</Btn>
    </div>
  </div>
}

// ── Break Screen ──
function BreakScreen({onResume,rm}){
  const [secs,setSecs]=useState(0);
  useEffect(()=>{const iv=setInterval(()=>setSecs(s=>s+1),1000);return()=>clearInterval(iv)},[]);
  const m=Math.floor(secs/60),s=secs%60;
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

// ── Complete Flash overlay ──
function CompleteFlash({onDone,rm}){
  const [pop,setPop]=useState(false);
  const cbRef=useRef(onDone);
  cbRef.current=onDone;
  useEffect(()=>{
    const t1=setTimeout(()=>setPop(true),80);
    const t2=setTimeout(()=>cbRef.current(),2400);
    return()=>{clearTimeout(t1);clearTimeout(t2);};
  },[]);
  const particles=["✨","⭐","🎊","💫","🌟","✨","⭐","🎊","💫","🌟","✨","⭐"];
  return(
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(140deg,#4158D0 0%,#C850C0 46%,#FFCC70 100%)",fontFamily:F,animation:rm?"none":"flashIn .25s ease"}} onClick={onDone}>
      {!rm&&particles.map((e,i)=>(
        <span key={i} style={{position:"absolute",left:`${5+(i*8)%90}%`,top:`${8+(i*11)%70}%`,fontSize:14+i%3*10,opacity:0,pointerEvents:"none",animation:`sparkle 2s ease-out ${i*.13}s forwards`}}>{e}</span>
      ))}
      <div style={{textAlign:"center",transform:pop?"scale(1)":"scale(.3)",opacity:pop?1:0,transition:rm?"none":"all .55s cubic-bezier(.34,1.56,.64,1)",padding:"0 32px"}}>
        <div style={{fontSize:90,lineHeight:1,marginBottom:20,filter:"drop-shadow(0 6px 28px rgba(0,0,0,.22))"}}>🎉</div>
        <div style={{fontSize:38,fontWeight:900,color:"#fff",letterSpacing:"-.6px",lineHeight:1.1,textShadow:"0 3px 24px rgba(0,0,0,.2)"}}>You did it!</div>
        <div style={{fontSize:18,color:"rgba(255,255,255,.82)",fontWeight:700,marginTop:12,letterSpacing:"-.1px"}}>Amazing work, Dylan 🙌</div>
        <div style={{marginTop:24,fontSize:12,color:"rgba(255,255,255,.5)",fontWeight:600,letterSpacing:.5}}>Tap anywhere to continue</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════
export default function BuddyWork(){
  const [si,setSi]=useState(0);
  const [prog,setProg]=useState(0);
  const [celeb,setCeleb]=useState("medium");
  const [rm,setRm]=useState(false);
  const [showSet,setShowSet]=useState(false);
  const [showAdmin,setShowAdmin]=useState(false);
  const [profile,setProfile]=useState(loadProfile);
  const [onBreak,setOnBreak]=useState(false);
  const [toast,setToast]=useState(null);
  const [earnedBadges,setEarnedBadges]=useState([]);
  const [showFlash,setShowFlash]=useState(false);
  const step=STEPS[si];
  const v=useVoice();

  const next=useCallback(()=>setSi(i=>Math.min(i+1,STEPS.length-1)),[]);
  const reset=useCallback(()=>{setSi(0);setProg(0);v.stop();setOnBreak(false);setEarnedBadges([])},[v]);

  function handleSaveProfile(updated){
    setProfile(updated);
    persistProfile(updated);
    v.setOn(updated.features.includes('voice')||updated.features.includes('both'));
    setShowAdmin(false);
  }

  // Voice on step change
  useEffect(()=>{const t=setTimeout(()=>v.say(VOICE[step]),300);return()=>clearTimeout(t)},[step]);

  // Step celebration toasts
  useEffect(()=>{
    const msg=STEP_TOASTS[step];
    if(!msg){setToast(null);return;}
    setToast(msg);
    const t=setTimeout(()=>setToast(null),1800);
    return()=>{clearTimeout(t);setToast(null);};
  },[step]);

  // Award badges when task completes
  useEffect(()=>{
    if(step==="complete") setEarnedBadges(BADGES);
  },[step]);

  // Scanning progress
  useEffect(()=>{
    if(step==="scanning"){setProg(0);const iv=setInterval(()=>{setProg(p=>{if(p>=100){clearInterval(iv);setTimeout(next,500);return 100}return p+2})},70);return()=>clearInterval(iv)}
  },[step,next]);

  const RS=["correct","correct","correct","misplaced","misplaced","correct"];
  const FS=["correct","correct","correct","fixed","fixed","correct"];
  const anim=rm?"none":"fadeIn .4s ease";

  return(
    <>
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:F,display:"flex",justifyContent:"center"}}>
      <Styles/>
      {showSet&&<Settings celeb={celeb} setCeleb={setCeleb} rm={rm} setRm={setRm} onClose={()=>setShowSet(false)}/>}
      {showAdmin&&<AdminPanel profile={profile} celeb={celeb} setCeleb={setCeleb} rm={rm} setRm={setRm} onSave={handleSaveProfile} onClose={()=>setShowAdmin(false)}/>}
      <div style={{width:"100%",maxWidth:400,padding:"16px 16px 0",paddingBottom:72,display:"flex",flexDirection:"column",gap:12}}>
        <Header reset={reset} si={si} setShowSet={setShowSet} onAdminOpen={()=>setShowAdmin(true)} profile={profile}/>
        {onBreak
          ?<BreakScreen onResume={()=>setOnBreak(false)} rm={rm}/>
          :<>{si>2&&si<STEPS.length-1&&<Pips cur={si-3} total={STEPS.length-4}/>}

        {/* GREETING */}
        {step==="greeting"&&<Greeting onStart={next} rm={rm}/>}

        {/* WELCOME */}
        {step==="welcome"&&<div style={{animation:anim}}>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:800,color:C.sub,letterSpacing:1.5,textTransform:"uppercase",marginBottom:4,fontFamily:F}}>Tuesday, May 20</div>
            <div style={{fontSize:24,fontWeight:900,color:C.text,fontFamily:F,letterSpacing:"-.4px"}}>Your tasks today</div>
          </div>
          <div style={{borderRadius:20,overflow:"hidden",boxShadow:shadow.card,marginBottom:8}}>
            <button onClick={next} style={{width:"100%",display:"flex",alignItems:"center",gap:16,padding:"18px 18px",background:C.card,cursor:"pointer",fontFamily:F,border:`1px solid ${C.bdr}`,borderBottom:"none",borderRadius:"20px 20px 0 0"}}>
              <div style={{width:52,height:52,borderRadius:15,background:`linear-gradient(140deg,${C.calmL},${C.calm}22)`,border:`1px solid ${C.calm}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>📚</div>
              <div style={{textAlign:"left",flex:1}}>
                <div style={{fontSize:16,fontWeight:800,color:C.text,letterSpacing:"-.2px"}}>Shelf Scan</div>
                <div style={{fontSize:12,color:C.sub,fontWeight:600,marginTop:2}}>Aisle 5 · Fiction A–F</div>
              </div>
              <div style={{width:32,height:32,borderRadius:10,background:C.calmL,display:"flex",alignItems:"center",justifyContent:"center",color:C.calm,fontSize:16,fontWeight:900}}>→</div>
            </button>
            <button style={{width:"100%",padding:"11px 18px",background:C.surface,cursor:"pointer",fontFamily:F,border:`1px solid ${C.bdr}`,borderTop:"none",borderRadius:"0 0 20px 20px",display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onMouseDown={e=>e.currentTarget.style.background=C.bg} onMouseUp={e=>e.currentTarget.style.background=C.surface}>
              <span style={{fontSize:13}}>🔄</span>
              <span style={{fontSize:12,fontWeight:700,color:C.sub}}>Change task</span>
            </button>
          </div>
          <div style={{padding:"12px 14px",borderRadius:14,background:C.card,border:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",gap:6,boxShadow:shadow.sm}}>
            <span style={{fontSize:10,fontWeight:800,color:C.sub,letterSpacing:1,textTransform:"uppercase",marginRight:4}}>Later</span>
            {[{i:"📦",l:"Returns"},{i:"🏷️",l:"Holds"},{i:"🔖",l:"Labels"}].map((t,j)=>(
              <div key={j} style={{padding:"4px 10px",borderRadius:20,background:C.bg,border:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:11}}>{t.i}</span>
                <span style={{fontSize:11,color:C.sub,fontWeight:700,fontFamily:F}}>{t.l}</span>
              </div>
            ))}
          </div>
        </div>}

        {/* OVERVIEW */}
        {step==="overview"&&<div style={{animation:anim}}>
          <Hero icon="📚" text="Shelf Scan" sub="Aisle 5 · Fiction A–F"/>
          <Card style={{marginTop:12,padding:"6px 4px"}}>
            {[{i:"🚶",n:"1",t:"Go to aisle",d:"Walk to Aisle 5"},{i:"📷",n:"2",t:"Scan shelf",d:"Point phone at shelf 2"},{i:"🔄",n:"3",t:"Fix order",d:"Put books in A–Z order"}].map((s,j)=>(
              <div key={j} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 16px",borderBottom:j<2?`1px solid ${C.bdr}`:"none"}}>
                <div style={{width:42,height:42,borderRadius:13,background:C.calmL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{s.i}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:800,color:C.text,fontFamily:F}}>{s.t}</div>
                  <div style={{fontSize:12,color:C.sub,fontWeight:600,marginTop:1}}>{s.d}</div>
                </div>
                <div style={{width:24,height:24,borderRadius:8,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:C.sub}}>{s.n}</div>
              </div>
            ))}
          </Card>
          <div style={{marginTop:14}}><Btn onClick={next} icon="🚶">Start</Btn></div>
        </div>}

        {/* GO TO AISLE */}
        {step==="go_aisle"&&<div style={{animation:anim}}>
          <Hero icon="🚶" text="Go to Aisle 5" sub="Fiction section"/>
          <Card style={{marginTop:12,textAlign:"center",padding:"28px 24px"}}>
            <div style={{width:88,height:88,borderRadius:24,background:`linear-gradient(140deg,${C.calmL},${C.calm}30)`,border:`2px solid ${C.calm}30`,margin:"0 auto 14px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:44,fontWeight:900,color:C.calm,fontFamily:F,boxShadow:`0 4px 20px ${C.calm}20`}}>5</div>
            <div style={{fontSize:13,color:C.sub,fontWeight:600}}>Look for this number sign above the shelves</div>
          </Card>
          <div style={{marginTop:14}}><Btn onClick={next} icon="📍">I'm here</Btn></div>
        </div>}

        {/* PICK SHELF */}
        {step==="pick_shelf"&&<div style={{animation:anim}}>
          <Hero icon="📷" text="Point at shelf 2" sub="Count from the top"/>
          <Card style={{marginTop:12,padding:"8px 8px"}}>
            {[1,2,3].map(n=>(
              <div key={n} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:14,marginBottom:4,background:n===2?C.calmL:C.surface,border:n===2?`1.5px solid ${C.calm}55`:"1.5px solid transparent",transition:"all .2s"}}>
                <div style={{width:28,height:28,borderRadius:9,background:n===2?C.calm:"#fff",border:`1.5px solid ${n===2?C.calm:C.bdr}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:n===2?"#fff":C.sub,fontFamily:F,flexShrink:0}}>{n}</div>
                <span style={{fontSize:15,fontWeight:700,color:n===2?C.calm:C.sub,fontFamily:F}}>Shelf {n}</span>
                {n===2&&<span style={{marginLeft:"auto",fontSize:12,fontWeight:700,color:C.calm,background:C.card,padding:"3px 10px",borderRadius:20,border:`1px solid ${C.calm}44`}}>← this one</span>}
              </div>
            ))}
          </Card>
          <div style={{marginTop:14}}><Btn onClick={next} icon="📸">Open camera</Btn></div>
        </div>}

        {/* CAMERA */}
        {step==="camera"&&<div style={{animation:anim}}>
          <Hero icon="📷" text="Hold steady" sub="Point at shelf 2"/>
          <div style={{marginTop:12}}><CameraView scanning={false} progress={0} reducedMotion={rm}/></div>
          <div style={{marginTop:16}}><Btn onClick={next} icon="🔍">Scan now</Btn></div>
        </div>}

        {/* SCANNING */}
        {step==="scanning"&&<div style={{animation:anim}}>
          <Hero icon="🔍" text="Scanning..." sub={`${Math.min(Math.floor(prog/17)+1,6)} of 6 found`}/>
          <div style={{marginTop:12}}><CameraView scanning={true} progress={prog} reducedMotion={rm}/></div>
        </div>}

        {/* RESULTS */}
        {step==="results"&&<div style={{animation:anim}}>
          <Hero icon="📋" text="Scan complete"/>
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <div style={{flex:1,padding:"11px 8px",borderRadius:10,background:C.okL,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <Chk/><span style={{fontSize:16,fontWeight:900,color:C.ok,fontFamily:F}}>4 correct</span>
            </div>
            <div style={{flex:1,padding:"11px 8px",borderRadius:10,background:C.errL,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <Wrn/><span style={{fontSize:16,fontWeight:900,color:C.err,fontFamily:F}}>2 wrong</span>
            </div>
          </div>
          <div style={{marginTop:10}}><Shelf books={BOOKS} statuses={RS}/></div>
          <div style={{marginTop:14}}><Btn onClick={next} icon="🔄">Fix them</Btn></div>
        </div>}

        {/* FIX 1 */}
        {step==="fix1"&&<div style={{animation:anim}}>
          <Hero icon="👆" text="Take out this book"/>
          <div style={{marginTop:10}}><Shelf books={BOOKS} statuses={["correct","correct","correct","misplaced","none","correct"]} arrows={[null,null,null,"Take out",null,null]}/></div>
          <div style={{marginTop:12,background:C.errL,borderRadius:16,padding:"14px 16px",border:`1px solid ${C.err}33`,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:38,height:38,borderRadius:11,background:`${C.err}15`,border:`1px solid ${C.err}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Wrn/></div>
            <div><div style={{fontSize:15,fontWeight:800,color:C.err,fontFamily:F}}>FIC HER</div><div style={{fontSize:12,fontWeight:600,color:C.err,opacity:.75,marginTop:1}}>Take it off the shelf and hold it</div></div>
          </div>
          <div style={{marginTop:12}}><Btn onClick={next} icon="✅">Done</Btn></div>
        </div>}

        {/* FIX 2 */}
        {step==="fix2"&&<div style={{animation:anim}}>
          <Hero icon="👆" text="Take out this book too"/>
          <div style={{marginTop:10}}><Shelf books={[BOOKS[0],BOOKS[1],BOOKS[2],GAP,BOOKS[4],BOOKS[5]]} statuses={["correct","correct","correct","none","misplaced","correct"]} arrows={[null,null,null,null,"Take out",null]}/></div>
          <div style={{marginTop:12,background:C.errL,borderRadius:16,padding:"14px 16px",border:`1px solid ${C.err}33`,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:38,height:38,borderRadius:11,background:`${C.err}15`,border:`1px solid ${C.err}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Wrn/></div>
            <div><div style={{fontSize:15,fontWeight:800,color:C.err,fontFamily:F}}>FIC DIC</div><div style={{fontSize:12,fontWeight:600,color:C.err,opacity:.75,marginTop:1}}>Hold both books in your hands</div></div>
          </div>
          <div style={{marginTop:12}}><Btn onClick={next} icon="✅">Done</Btn></div>
        </div>}

        {/* FIX 3 */}
        {step==="fix3"&&<div style={{animation:anim}}>
          <Hero icon="📥" text="Put FIC DIC in first" sub="D comes before H"/>
          <div style={{marginTop:10}}><Shelf books={[BOOKS[0],BOOKS[1],BOOKS[2],SLOT,GAP,BOOKS[5]]} statuses={["correct","correct","correct","none","none","correct"]} arrows={[null,null,null,"FIC DIC",null,null]}/></div>
          <div style={{marginTop:12,background:C.calmL,borderRadius:16,padding:"14px 16px",border:`1px solid ${C.calm}33`,display:"flex",alignItems:"center",gap:14}}>
            <div style={{fontSize:26,fontWeight:900,color:C.calm,fontFamily:F,letterSpacing:"-.5px"}}>D → H</div>
            <div style={{fontSize:13,fontWeight:600,color:C.calm,opacity:.85}}>D comes before H in the alphabet</div>
          </div>
          <div style={{marginTop:12}}><Btn onClick={next} icon="✅">Done</Btn></div>
        </div>}

        {/* FIX 4 */}
        {step==="fix4"&&<div style={{animation:anim}}>
          <Hero icon="📥" text="Put FIC HER next"/>
          <div style={{marginTop:10}}><Shelf books={[FIXED[0],FIXED[1],FIXED[2],FIXED[3],SLOT,FIXED[5]]} statuses={["correct","correct","correct","fixed","none","correct"]} arrows={[null,null,null,null,"FIC HER",null]}/></div>
          <div style={{marginTop:12,background:C.calmL,borderRadius:16,padding:"14px 16px",border:`1px solid ${C.calm}33`,display:"flex",alignItems:"center",gap:12}}>
            <Chk/><span style={{fontSize:13,fontWeight:700,color:C.calm,fontFamily:F}}>Place it right after FIC DIC</span>
          </div>
          <div style={{marginTop:12}}><Btn onClick={()=>setShowFlash(true)} icon="✅">Done</Btn></div>
        </div>}

        {/* COMPLETE */}
        {step==="complete"&&<Celebrate level={celeb} rm={rm} onNext={reset} onBreak={()=>setOnBreak(true)} earnedBadges={earnedBadges}/>}
        </>}
      </div>
    </div>
    <AIAssistant v={v} step={step}/>
    {toast&&<StepToast message={toast} rm={rm}/>}
    {showFlash&&<CompleteFlash onDone={()=>{setShowFlash(false);next();}} rm={rm}/>}
    </>
  );
}

function Header({reset,si,setShowSet,onAdminOpen,profile}){
  const iconBtn={width:36,height:36,borderRadius:11,border:`1px solid ${C.bdr}`,background:C.card,cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:shadow.sm};
  return <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"2px 0"}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:38,height:38,borderRadius:12,background:`linear-gradient(140deg,${C.calm},${C.calmD})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,color:"#fff",fontWeight:900,boxShadow:`0 3px 10px ${C.calm}50`}}>B</div>
      <div>
        <div style={{fontSize:15,fontWeight:800,color:C.text,lineHeight:1.15,fontFamily:F,letterSpacing:"-.2px"}}>BuddyWork</div>
        <div style={{fontSize:9.5,color:C.sub,fontWeight:700,letterSpacing:".8px",textTransform:"uppercase"}}>AI Job Coach</div>
      </div>
    </div>
    <div style={{display:"flex",gap:6,alignItems:"center"}}>
      {profile&&<div style={{padding:'3px 9px',borderRadius:8,background:LVL_COLORS[profile.level]+'22',border:`1.5px solid ${LVL_COLORS[profile.level]}55`}}>
        <span style={{fontSize:11,fontWeight:800,color:LVL_COLORS[profile.level],fontFamily:F}}>L{profile.level} · {profile.name}</span>
      </div>}
      {onAdminOpen&&<button onClick={onAdminOpen} style={iconBtn} title="Admin Panel">⚙️</button>}
      {!onAdminOpen&&<button onClick={()=>setShowSet(true)} style={iconBtn}>⚙️</button>}
      {si>0&&<button onClick={reset} style={iconBtn}>🏠</button>}
    </div>
  </div>
}

function Styles(){
  return <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
    @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
    @keyframes scanLine{0%{top:8px}100%{top:calc(100% - 10px)}}
    @keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
    @keyframes bar{from{height:4px}to{height:14px}}
    @keyframes sparkle{0%{opacity:0;transform:scale(0) rotate(0)}40%{opacity:1;transform:scale(1.2) rotate(10deg)}100%{opacity:0;transform:scale(.8) rotate(-5deg) translateY(-20px)}}
    @keyframes breathe{0%,100%{transform:scale(1);opacity:.4}50%{transform:scale(1.4);opacity:.8}}
    @keyframes toastPop{0%{opacity:0;transform:translate(-50%,-50%) scale(.7)}60%{transform:translate(-50%,-50%) scale(1.05)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
    @keyframes flashIn{from{opacity:0}to{opacity:1}}
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    body{margin:0}
  `}</style>
}

import { useState, useEffect, useCallback, useRef } from "react";

// ── Constants ──
const STEPS = ["welcome","overview","go_aisle","pick_shelf","camera","scanning","results","fix1","fix2","fix3","fix4","complete"];
const VOICE = {
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
const C = {calm:"#4D9484",calmL:"#E4F0EC",warn:"#CC8B1F",warnL:"#FFF6E5",warnB:"#EEDCB0",ok:"#4D9484",okL:"#E4F0EC",text:"#1E2D27",sub:"#5F7A6F",bg:"#F4F6F5",card:"#FFFFFF",bdr:"#D9E2DD",gold:"#B8860B",goldL:"#FFF9E8"};
const BOOKS = [
  {id:1,call:"FIC ADA",color:"#4A7FA8"},{id:2,call:"FIC BRA",color:"#C49360"},
  {id:3,call:"FIC CLA",color:"#5E8E65"},{id:4,call:"FIC HER",color:"#B06040"},
  {id:5,call:"FIC DIC",color:"#7B6BA8"},{id:6,call:"FIC LEG",color:"#9E6878"},
];
const FIXED = [BOOKS[0],BOOKS[1],BOOKS[2],BOOKS[4],BOOKS[3],BOOKS[5]];
const GAP = {id:99,call:"",color:"#DCE2DE"};
const SLOT = {id:98,call:"?",color:"#E4EAE6"};

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
function Btn({children,onClick,icon,secondary,small}){
  return <button onClick={onClick} style={{width:"100%",padding:small?"14px 20px":"20px 24px",fontSize:small?16:20,fontWeight:800,fontFamily:F,border:secondary?`2px solid ${C.bdr}`:"none",borderRadius:16,cursor:"pointer",background:secondary?C.card:C.calm,color:secondary?C.text:"#fff",boxShadow:secondary?"none":`0 4px 14px ${C.calm}30`,display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"transform .1s"}} onMouseDown={e=>e.currentTarget.style.transform="scale(.97)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>{icon&&<span style={{fontSize:small?20:24}}>{icon}</span>}{children}</button>
}
function Hero({icon,text,sub}){
  return <div style={{textAlign:"center",padding:"6px 16px"}}><div style={{fontSize:56,lineHeight:1,marginBottom:8}}>{icon}</div><div style={{fontSize:22,fontWeight:800,color:C.text,lineHeight:1.3,fontFamily:F}}>{text}</div>{sub&&<div style={{fontSize:14,color:C.sub,fontWeight:600,marginTop:5,fontFamily:F}}>{sub}</div>}</div>
}
function Pips({cur,total}){
  return <div style={{display:"flex",gap:4,justifyContent:"center",padding:"4px 0"}}>{Array.from({length:total},(_,i)=><div key={i} style={{width:i===cur?26:8,height:8,borderRadius:4,background:i===cur?C.calm:i<cur?C.calm+"55":C.bdr,transition:"all .3s"}}/>)}</div>
}
function Card({children,style}){return<div style={{background:C.card,borderRadius:16,padding:18,border:`1.5px solid ${C.bdr}`,...style}}>{children}</div>}

// ── Check / Warning shapes ──
const Chk=()=><svg width="18" height="18" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill={C.ok}/><path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const Wrn=()=><svg width="18" height="18" viewBox="0 0 20 20"><polygon points="10,2 19,18 1,18" fill={C.warn}/><text x="10" y="15" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800">!</text></svg>;

// ── Book Spine ──
function Spine({book,status,arrow}){
  const m=status==="misplaced",f=status==="fixed",co=status==="correct";
  return <div style={{display:"flex",flexDirection:"column",alignItems:"center",position:"relative"}}>
    {arrow&&<div style={{position:"absolute",top:-30,display:"flex",flexDirection:"column",alignItems:"center",animation:"bob 2s ease-in-out infinite"}}><span style={{fontSize:10,fontWeight:800,color:C.warn,fontFamily:F}}>{arrow}</span><span style={{fontSize:14,color:C.warn}}>↓</span></div>}
    <div style={{width:44,height:120,borderRadius:"4px 4px 2px 2px",background:`linear-gradient(180deg,${book.color},${book.color}cc)`,border:m?`3px solid ${C.warn}`:f?`3px solid ${C.ok}`:co?`3px solid ${C.ok}44`:"3px solid transparent",boxShadow:m?`0 0 10px ${C.warn}44`:"0 2px 4px #00000012",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",padding:"6px 3px",transition:"all .3s"}}>
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

// ── Voice Bar ──
function VoiceBar({v}){
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

// ── Celebration ──
function Celebrate({level,rm,onNext,onBreak}){
  const [show,setShow]=useState(false);
  useEffect(()=>{setTimeout(()=>setShow(true),200)},[]);
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

// ══════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════
export default function BuddyWork(){
  const [si,setSi]=useState(0);
  const [prog,setProg]=useState(0);
  const [celeb,setCeleb]=useState("medium");
  const [rm,setRm]=useState(false);
  const [showSet,setShowSet]=useState(false);
  const [onBreak,setOnBreak]=useState(false);
  const step=STEPS[si];
  const v=useVoice();

  const next=useCallback(()=>setSi(i=>Math.min(i+1,STEPS.length-1)),[]);
  const reset=useCallback(()=>{setSi(0);setProg(0);v.stop();setOnBreak(false)},[v]);

  // Voice on step change
  useEffect(()=>{const t=setTimeout(()=>v.say(VOICE[step]),300);return()=>clearTimeout(t)},[step]);

  // Scanning progress
  useEffect(()=>{
    if(step==="scanning"){setProg(0);const iv=setInterval(()=>{setProg(p=>{if(p>=100){clearInterval(iv);setTimeout(next,500);return 100}return p+2})},70);return()=>clearInterval(iv)}
  },[step,next]);

  const RS=["correct","correct","correct","misplaced","misplaced","correct"];
  const FS=["correct","correct","correct","fixed","fixed","correct"];
  const anim=rm?"none":"fadeIn .4s ease";

  if(onBreak)return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:F,display:"flex",justifyContent:"center"}}>
      <Styles/>
      <div style={{width:"100%",maxWidth:400,padding:"16px 16px 32px",display:"flex",flexDirection:"column",gap:12}}>
        <Header reset={reset} si={si} setShowSet={setShowSet}/>
        <VoiceBar v={v}/>
        <BreakScreen onResume={()=>setOnBreak(false)} rm={rm}/>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:F,display:"flex",justifyContent:"center"}}>
      <Styles/>
      {showSet&&<Settings celeb={celeb} setCeleb={setCeleb} rm={rm} setRm={setRm} onClose={()=>setShowSet(false)}/>}
      <div style={{width:"100%",maxWidth:400,padding:"16px 16px 32px",display:"flex",flexDirection:"column",gap:12}}>
        <Header reset={reset} si={si} setShowSet={setShowSet}/>
        <VoiceBar v={v}/>
        {si>0&&si<STEPS.length-1&&<Pips cur={si-1} total={STEPS.length-2}/>}

        {/* WELCOME */}
        {step==="welcome"&&<div style={{animation:anim}}>
          <Card style={{textAlign:"center",padding:"26px 18px",marginBottom:12}}>
            <div style={{fontSize:44,marginBottom:6}}>👋</div>
            <div style={{fontSize:22,fontWeight:900,color:C.text}}>Your tasks today</div>
            <div style={{fontSize:13,color:C.sub,fontWeight:600,marginTop:3}}>Tuesday, May 20</div>
          </Card>
          <button onClick={next} style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:18,borderRadius:14,border:`2px solid ${C.calm}`,background:C.card,cursor:"pointer",fontFamily:F,marginBottom:8}}>
            <div style={{width:50,height:50,borderRadius:12,background:C.calmL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>📚</div>
            <div style={{textAlign:"left",flex:1}}>
              <div style={{fontSize:17,fontWeight:800,color:C.text}}>Shelf Scan</div>
              <div style={{fontSize:12,color:C.sub,fontWeight:600}}>Aisle 5 · Fiction A–F</div>
            </div>
            <span style={{fontSize:20,color:C.calm,fontWeight:900}}>→</span>
          </button>
          <div style={{padding:"8px 12px",borderRadius:10,background:C.card,border:`1.5px solid ${C.bdr}`,display:"flex",gap:12}}>
            <span style={{fontSize:11,fontWeight:700,color:C.sub}}>LATER:</span>
            {[{i:"📦",l:"Returns"},{i:"🏷️",l:"Holds"},{i:"🔖",l:"Labels"}].map((t,j)=><span key={j} style={{fontSize:11,color:C.sub,fontWeight:600}}>{t.i} {t.l}</span>)}
          </div>
        </div>}

        {/* OVERVIEW */}
        {step==="overview"&&<div style={{animation:anim}}>
          <Hero icon="📚" text="Shelf Scan" sub="Aisle 5 · Fiction A–F"/>
          <Card style={{marginTop:12}}>
            {[{i:"🚶",t:"Go to aisle"},{i:"📷",t:"Scan shelf"},{i:"🔄",t:"Fix order"}].map((s,j)=><div key={j} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:j<2?`1px solid ${C.bdr}`:"none"}}>
              <div style={{width:38,height:38,borderRadius:10,background:C.calmL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{s.i}</div>
              <span style={{fontSize:16,fontWeight:700,color:C.text}}>{s.t}</span>
            </div>)}
          </Card>
          <div style={{marginTop:16}}><Btn onClick={next} icon="🚶">Start</Btn></div>
        </div>}

        {/* GO TO AISLE */}
        {step==="go_aisle"&&<div style={{animation:anim}}>
          <Hero icon="🚶" text="Go to Aisle 5" sub="Fiction section"/>
          <Card style={{marginTop:12,textAlign:"center",padding:24}}>
            <div style={{display:"inline-flex",width:80,height:80,borderRadius:20,background:C.calmL,alignItems:"center",justifyContent:"center",fontSize:40,fontWeight:900,color:C.calm,fontFamily:F}}>5</div>
            <div style={{fontSize:12,color:C.sub,fontWeight:600,marginTop:10}}>Look for this number above the shelves</div>
          </Card>
          <div style={{marginTop:16}}><Btn onClick={next} icon="📍">I'm here</Btn></div>
        </div>}

        {/* PICK SHELF */}
        {step==="pick_shelf"&&<div style={{animation:anim}}>
          <Hero icon="📷" text="Point at shelf 2" sub="Count from the top"/>
          <Card style={{marginTop:12}}>
            {[1,2,3].map(n=><div key={n} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:9,marginBottom:3,background:n===2?C.calmL:C.bg,border:n===2?`2px solid ${C.calm}`:"2px solid transparent"}}>
              <span style={{fontSize:14,fontWeight:800,color:n===2?C.calm:C.sub,fontFamily:F}}>Shelf {n}</span>
              {n===2&&<span style={{fontSize:12,fontWeight:700,color:C.calm,fontFamily:F}}>← this one</span>}
            </div>)}
          </Card>
          <div style={{marginTop:16}}><Btn onClick={next} icon="📸">Open camera</Btn></div>
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
            <div style={{flex:1,padding:"11px 8px",borderRadius:10,background:C.warnL,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <Wrn/><span style={{fontSize:16,fontWeight:900,color:C.warn,fontFamily:F}}>2 wrong</span>
            </div>
          </div>
          <div style={{marginTop:10}}><Shelf books={BOOKS} statuses={RS}/></div>
          <div style={{marginTop:14}}><Btn onClick={next} icon="🔄">Fix them</Btn></div>
        </div>}

        {/* FIX 1 */}
        {step==="fix1"&&<div style={{animation:anim}}>
          <Hero icon="👆" text="Take out this book"/>
          <div style={{marginTop:10}}><Shelf books={BOOKS} statuses={["correct","correct","correct","misplaced","none","correct"]} arrows={[null,null,null,"Take out",null,null]}/></div>
          <div style={{marginTop:10,background:C.warnL,borderRadius:10,padding:"10px 14px",border:`1.5px solid ${C.warnB}`,textAlign:"center"}}><span style={{fontSize:15,fontWeight:800,color:C.warn,fontFamily:F}}>FIC HER — hold it</span></div>
          <div style={{marginTop:12}}><Btn onClick={next} icon="✅">Done</Btn></div>
        </div>}

        {/* FIX 2 */}
        {step==="fix2"&&<div style={{animation:anim}}>
          <Hero icon="👆" text="Take out this book too"/>
          <div style={{marginTop:10}}><Shelf books={[BOOKS[0],BOOKS[1],BOOKS[2],GAP,BOOKS[4],BOOKS[5]]} statuses={["correct","correct","correct","none","misplaced","correct"]} arrows={[null,null,null,null,"Take out",null]}/></div>
          <div style={{marginTop:10,background:C.warnL,borderRadius:10,padding:"10px 14px",border:`1.5px solid ${C.warnB}`,textAlign:"center"}}><span style={{fontSize:15,fontWeight:800,color:C.warn,fontFamily:F}}>FIC DIC — hold both books</span></div>
          <div style={{marginTop:12}}><Btn onClick={next} icon="✅">Done</Btn></div>
        </div>}

        {/* FIX 3 */}
        {step==="fix3"&&<div style={{animation:anim}}>
          <Hero icon="📥" text="Put FIC DIC in first" sub="D comes before H"/>
          <div style={{marginTop:10}}><Shelf books={[BOOKS[0],BOOKS[1],BOOKS[2],SLOT,GAP,BOOKS[5]]} statuses={["correct","correct","correct","none","none","correct"]} arrows={[null,null,null,"FIC DIC",null,null]}/></div>
          <div style={{marginTop:10,background:C.calmL,borderRadius:10,padding:"10px 14px",border:`1.5px solid ${C.calm}33`,textAlign:"center"}}><span style={{fontSize:20,fontWeight:900,color:C.calm,fontFamily:F}}>D → H</span></div>
          <div style={{marginTop:12}}><Btn onClick={next} icon="✅">Done</Btn></div>
        </div>}

        {/* FIX 4 */}
        {step==="fix4"&&<div style={{animation:anim}}>
          <Hero icon="📥" text="Put FIC HER next"/>
          <div style={{marginTop:10}}><Shelf books={[FIXED[0],FIXED[1],FIXED[2],FIXED[3],SLOT,FIXED[5]]} statuses={["correct","correct","correct","fixed","none","correct"]} arrows={[null,null,null,null,"FIC HER",null]}/></div>
          <div style={{marginTop:12}}><Btn onClick={next} icon="✅">Done</Btn></div>
        </div>}

        {/* COMPLETE */}
        {step==="complete"&&<Celebrate level={celeb} rm={rm} onNext={reset} onBreak={()=>setOnBreak(true)}/>}
      </div>
    </div>
  );
}

function Header({reset,si,setShowSet}){
  return <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{width:36,height:36,borderRadius:10,background:C.calm,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#fff",fontWeight:900}}>B</div>
      <div><div style={{fontSize:15,fontWeight:800,color:C.text,lineHeight:1.2}}>BuddyWork</div><div style={{fontSize:10,color:C.sub,fontWeight:600}}>AI Job Coach</div></div>
    </div>
    <div style={{display:"flex",gap:5}}>
      <button onClick={()=>setShowSet(true)} style={{width:34,height:34,borderRadius:8,border:`1.5px solid ${C.bdr}`,background:C.card,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>⚙️</button>
      {si>0&&<button onClick={reset} style={{width:34,height:34,borderRadius:8,border:`1.5px solid ${C.bdr}`,background:C.card,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>🏠</button>}
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
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    body{margin:0}
  `}</style>
}

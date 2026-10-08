import React, { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import QuantumComposer from "./ComposerNew";

const s = Math.SQRT1_2;
const M = {
  H:[[s,0],[s,0],[s,0],[-s,0]], X:[[0,0],[1,0],[1,0],[0,0]],
  Y:[[0,0],[0,-1],[0,1],[0,0]], Z:[[1,0],[0,0],[0,0],[-1,0]],
  S:[[1,0],[0,0],[0,0],[0,1]], T:[[1,0],[0,0],[0,0],[s,s]],
  P:[[1,0],[0,0],[0,0],[0,1]], RX:[[s,0],[0,-s],[0,-s],[s,0]],
  I:[[1,0],[0,0],[0,0],[1,0]], Sdg:[[1,0],[0,0],[0,0],[0,-1]],
  Tdg:[[1,0],[0,0],[0,0],[s,-s]], RZ:[[s,-s],[0,0],[0,0],[s,s]],
  RY:[[s,0],[-s,0],[s,0],[s,0]], SX:[[.5,.5],[.5,-.5],[.5,-.5],[.5,.5]]
};
const NM={H:"Hadamard",X:"Pauli-X (NOT)",Y:"Pauli-Y",Z:"Pauli-Z",S:"S gate (√Z)",Sdg:"S† (inverse S)",T:"T gate (π/4 phase)",Tdg:"T† (inverse T)",P:"Phase gate (π/2)",RX:"X rotation (π/2)",RY:"Y rotation (π/2)",RZ:"Z rotation (π/2)",SX:"√X gate",I:"Identity",CX:"CNOT (control ●, target ⊕)",CZ:"Controlled-Z",SWAP:"SWAP"};
const LB={Sdg:"S†",Tdg:"T†",SX:"√X",CX:"⊕",CZ:"●",SWAP:"✕"};
const TWO=["CX","CZ","SWAP"];
const GATES=["H","CX","CZ","SWAP","I","T","S","Z","Tdg","Sdg","P","RZ","X","Y","SX","RX","RY"];
const QM={H:"h",X:"x",Y:"y",Z:"z",S:"s",Sdg:"sdg",T:"t",Tdg:"tdg",I:"id",SX:"sx",CX:"cx",CZ:"cz",SWAP:"swap"};
const N=4, COLS=10, PN="abcd";
const cells=o=>Array.from({length:o.span||1},(_,i)=>o.q+i);
const qs=m=>TWO.includes(m.g)?[m.q,m.q+1]:[m.q];
const flat=ops=>ops.flatMap(o=>o.sub?o.sub.map(m=>({...m,q:o.q+m.q,t:o.t+m.t/100})):[o]).sort((a,b)=>a.t-b.t);

function sim(ops){
  const L=1<<N,re=Array(L).fill(0),im=Array(L).fill(0); re[0]=1;
  const sw=(i,j)=>{[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]]};
  flat(ops).forEach(o=>{
    const b=1<<o.q,tb=b<<1;
    if(TWO.includes(o.g)){
      for(let i=0;i<L;i++){
        if(o.g==="SWAP"){if((i&b)&&!(i&tb))sw(i,i^b^tb)}
        else if(o.g==="CZ"){if((i&b)&&(i&tb)){re[i]*=-1;im[i]*=-1}}
        else if((i&b)&&!(i&tb))sw(i,i|tb);
      } return;
    }
    const m=M[o.g]; if(!m) return;
    for(let i=0;i<L;i++) if(!(i&b)){
      const j=i|b,ar=re[i],ai=im[i],br=re[j],bi=im[j];
      re[i]=m[0][0]*ar-m[0][1]*ai+m[1][0]*br-m[1][1]*bi;
      im[i]=m[0][0]*ai+m[0][1]*ar+m[1][0]*bi+m[1][1]*br;
      re[j]=m[2][0]*ar-m[2][1]*ai+m[3][0]*br-m[3][1]*bi;
      im[j]=m[2][0]*ai+m[2][1]*ar+m[3][0]*bi+m[3][1]*br;
    }
  });
  return {re,im,p:re.map((r,i)=>r*r+im[i]*im[i])};
}
function ln(g,n,py){
  const a=n.join(", "), f={P:"p(pi / 2)",RX:"rx(pi / 2)",RY:"ry(pi / 2)",RZ:"rz(pi / 2)"}[g];
  if(py) return `qc.${f?f.replace("(pi / 2)",`(pi/2, ${a})`):QM[g]+"("+a+")"}`;
  return `${f||QM[g]} ${a};`;
}
function code(ops,py){
  const o=[...ops].sort((a,b)=>a.t-b.t||a.q-b.q);
  if(py) return ["from qiskit import QuantumCircuit","from math import pi","","qc = QuantumCircuit(4, 4)",...flat(ops).map(x=>ln(x.g,qs(x),1)),"qc.measure(range(4), range(4))"].join("\n");
  const gd=[],seen={};
  o.forEach(x=>{if(x.sub&&!seen[x.name]){seen[x.name]=1;gd.push(`gate ${x.name} ${[...PN].slice(0,x.span).join(", ")} {`,...[...x.sub].sort((a,b)=>a.t-b.t).map(m=>"  "+ln(m.g,qs(m).map(i=>PN[i]))),"}","")}});
  return ["OPENQASM 3.0;",'include "stdgates.inc";',"",...gd,"qubit[4] q;","bit[4] c;",...o.map(x=>x.sub?`${x.name} ${cells(x).map(i=>`q[${i}]`).join(", ")};`:ln(x.g,qs(x).map(i=>`q[${i}]`))),...[0,1,2,3].map(i=>`measure q[${i}] -> c[${i}];`)].join("\n");
}

function BlochSphere({ vector, q }) {
  const { x, y, z } = vector;
  const cx = 82, cy = 82, r = 58;
  const px = cx + r * (x + 0.42 * y);
  const py = cy - r * (z + 0.22 * y);
  const depth = Math.max(-1, Math.min(1, y));
  const state = vector.length < 0.05
    ? "mixed"
    : Math.abs(z - 1) < 0.08 ? "|0⟩"
    : Math.abs(z + 1) < 0.08 ? "|1⟩"
    : Math.abs(x - 1) < 0.08 ? "|+⟩"
    : Math.abs(x + 1) < 0.08 ? "|−⟩"
    : Math.abs(y - 1) < 0.08 ? "|+i⟩"
    : Math.abs(y + 1) < 0.08 ? "|−i⟩"
    : "superposition";

  return <div className="bloch-card">
    <div className="bloch-title">q[{q}] <span>{state}</span></div>
    <svg viewBox="0 0 164 164" className="bloch" role="img" aria-label={`Bloch sphere for q[${q}] in state ${state}`}>
      <circle cx={cx} cy={cy} r={r} fill="#1f1f1f" stroke="#666" strokeWidth="1.5"/>
      <ellipse cx={cx} cy={cy} rx={r} ry={r * .32} fill="none" stroke="#555"/>
      <ellipse cx={cx} cy={cy} rx={r * .32} ry={r} fill="none" stroke="#444"/>
      <line x1={cx-r} y1={cy} x2={cx+r} y2={cy} stroke="#777"/>
      <line x1={cx} y1={cy-r} x2={cx} y2={cy+r} stroke="#777"/>
      <line x1={cx-r*.65} y1={cy+r*.45} x2={cx+r*.65} y2={cy-r*.45} stroke="#555" strokeDasharray="3 3"/>
      <text x={cx+r+5} y={cy+4} fill="#aaa" fontSize="9">X</text>
      <text x={cx+4} y={cy-r-5} fill="#aaa" fontSize="9">Z</text>
      <text x={cx+r*.58} y={cy-r*.5} fill="#aaa" fontSize="8">Y</text>
      <text x={cx-5} y={cy+r+13} fill="#777" fontSize="8">−Z</text>
      <text x={cx-r-14} y={cy+4} fill="#777" fontSize="8">−X</text>
      {vector.length > 0.03 && <>
        <line x1={cx} y1={cy} x2={px} y2={py} stroke="#22d3ee" strokeWidth="4" strokeLinecap="round"/>
        <circle cx={px} cy={py} r="6" fill="#b6f542" stroke="#fff" strokeWidth="1.5"/>
      </>}
      <text x="8" y="14" fill="#b6f542" fontSize="9">q[{q}]</text>
      <text x="120" y="154" fill="#777" fontSize="8">Y={depth.toFixed(2)}</text>
    </svg>
    <div className="bloch-values">X {x.toFixed(2)} · Y {y.toFixed(2)} · Z {z.toFixed(2)}</div>
  </div>;
}

function BlochPanel({ S }) {
  const blochForQubit = q => {
    let r00 = 0, r11 = 0, re01 = 0, im01 = 0;
    for (let i = 0; i < S.re.length; i++) {
      const bit = (i >> q) & 1;
      const pr = S.re[i] * S.re[i] + S.im[i] * S.im[i];
      if (bit === 0) r00 += pr;
      else r11 += pr;
      if (bit === 0) {
        const j = i | (1 << q);
        re01 += S.re[i] * S.re[j] + S.im[i] * S.im[j];
        im01 += S.re[j] * S.im[i] - S.im[j] * S.re[i];
      }
    }
    const x = 2 * re01;
    const y = -2 * im01;
    const z = r00 - r11;
    return { x, y, z, length: Math.sqrt(x*x + y*y + z*z) };
  };
  return <div className="bloch-panel">
    {[0,1,2,3].map(q => <BlochSphere key={q} q={q} vector={blochForQubit(q)} />)}
  </div>;
}

let uid=10;
function Composer({onUse,onRun}){
  const [ops,setOps]=useState([]),[hist,setHist]=useState([]),[fut,setFut]=useState([]),[tab,setTab]=useState(0),[sel,setSel]=useState(null),[pick,setPick]=useState([]),[ov,setOv]=useState(""),[defs,setDefs]=useState([]),[res,setRes]=useState(null),[view,setView]=useState(0),[qry,setQry]=useState(""),[ctx,setCtx]=useState(null);
  const drag=useRef(null);
  useEffect(()=>{
    const close=()=>setCtx(null);
    const key=e=>{if(e.key==="Escape")setCtx(null)};
    window.addEventListener("click",close);
    window.addEventListener("keydown",key);
    return ()=>{window.removeEventListener("click",close);window.removeEventListener("keydown",key)};
  },[]);
  const commit=n=>{setHist([...hist,ops]);setFut([]);setOps(n);setPick(p=>p.filter(id=>n.some(o=>o.id===id)));setRes(null);onUse?.(flat(n));};
  const undo=()=>{if(!hist.length)return;setFut([ops,...fut]);setOps(hist[hist.length-1]);setHist(hist.slice(0,-1));setRes(null)};
  const redo=()=>{if(!fut.length)return;setHist([...hist,ops]);setOps(fut[0]);setFut(fut.slice(1));setRes(null)};
  const place=(d,q,t)=>{const old=d.id&&ops.find(o=>o.id===d.id);const base=old||(d.def?{g:"GRP",...d.def}:{g:d.g});const sp=base.span||(TWO.includes(base.g)?2:1);q=Math.min(q,N-sp);const n={...base,id:d.id||++uid,q,t,span:sp},c=cells(n);commit([...ops.filter(o=>o.id!==n.id&&!(o.t===t&&cells(o).some(x=>c.includes(x)))),n]);};
  const drop=(e,q,t)=>{e.preventDefault();setOv("");const d=drag.current||sel;if(d)place(d,q,t);drag.current=null};
  const del=id=>commit(ops.filter(o=>o.id!==id));
  const tog=id=>setPick(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const group=()=>{const ps=ops.filter(o=>pick.includes(o.id));if(ps.length<2)return;const ms=ps.flatMap(o=>o.sub?o.sub.map(m=>({g:m.g,q:o.q+m.q,t:o.t+m.t})):[{g:o.g,q:o.q,t:o.t}]);const t0=Math.min(...ms.map(m=>m.t)),q0=Math.min(...ms.map(m=>m.q)),q1=Math.max(...ms.map(m=>m.q+(TWO.includes(m.g)?1:0)));const def={name:"nG"+defs.length,span:q1-q0+1,sub:ms.map(m=>({g:m.g,q:m.q-q0,t:m.t-t0}))};setDefs([...defs,def]);const n={g:"GRP",...def,id:++uid,q:q0,t:t0},c=cells(n);commit([...ops.filter(o=>!pick.includes(o.id)&&!(o.t===t0&&cells(o).some(x=>c.includes(x)))),n]);setPick([n.id]);};
  const ungroup=()=>{const g=ops.find(o=>pick.includes(o.id)&&o.sub);if(!g)return;const ms=g.sub.map(m=>({...m,id:++uid,q:g.q+m.q,t:g.t+m.t,span:TWO.includes(m.g)?2:1}));commit([...ops.filter(o=>o.id!==g.id&&!ms.some(m=>m.t===o.t&&cells(o).some(x=>cells(m).includes(x)))),...ms]);setPick(ms.map(m=>m.id));};
  const S=sim(ops);
  const run=()=>{const c={};for(let k=0;k<1024;k++){let u=Math.random(),i=0;while(i<15&&u>S.p[i]){u-=S.p[i];i++}const key=i.toString(2).padStart(4,"0");c[key]=(c[key]||0)+1}setRes(c);setView(1);onRun?.();};
  const marg=q=>S.p.reduce((a,p,i)=>a+((i>>q)&1?p:0),0);
  const data=Array.from({length:16},(_,i)=>view&&res?(res[i.toString(2).padStart(4,"0")]||0)/1024:view?0:S.p[i]);
  const list=GATES.filter(g=>(NM[g]+g).toLowerCase().includes(qry.toLowerCase()));
  const chip=(o,row)=>{const g=o.g,grp=!!o.sub,tip=grp?`${o.name}: group of ${o.sub.length} gates`:NM[g];const sym=grp?o.name:g==="CX"?(row?"⊕":"●"):g==="CZ"?"●":g==="SWAP"?"✕":(LB[g]||g);return <div className={`g g-${grp?"GRP":g} ${pick.includes(o.id)?"pk":""}`} data-tip={tip} draggable tabIndex="0" aria-label={tip} style={grp?{position:"absolute",top:6,left:3,height:o.span*56-12,zIndex:2}:undefined} onDragStart={e=>{drag.current={g:o.g,id:o.id};e.dataTransfer.setData("text/plain",g)}} onClick={e=>{e.stopPropagation();tog(o.id)}} onDoubleClick={()=>del(o.id)} onContextMenu={e=>{e.preventDefault();e.stopPropagation();setCtx({id:o.id,x:e.clientX,y:e.clientY,name:tip})}} onKeyDown={e=>{if(e.key==="Delete"||e.key==="Backspace")del(o.id);if(e.key==="Enter")tog(o.id)}}>{sym}</div>};
  const pal=(k,d,tip,txt,cls)=><div key={k} className={`g ${cls} ${sel?.k===k?"sel":""}`} data-tip={tip} draggable role="button" tabIndex="0" aria-label={tip} onDragStart={e=>{drag.current=d;e.dataTransfer.setData("text/plain",k)}} onClick={()=>setSel(sel?.k===k?null:{...d,k})} onKeyDown={e=>e.key==="Enter"&&setSel(sel?.k===k?null:{...d,k})}>{txt}</div>;
  const hasG=ops.some(o=>pick.includes(o.id)&&o.sub);
  return <div className="ibm">
    <div className="tb"><b>Untitled circuit</b><button onClick={undo} disabled={!hist.length}>↶ Undo</button><button onClick={redo} disabled={!fut.length}>↷ Redo</button><button onClick={()=>setPick(ops.map(o=>o.id))} disabled={!ops.length}>Select all</button><button onClick={group} disabled={pick.length<2}>▣ Group{pick.length>1?` (${pick.length})`:""}</button><button onClick={ungroup} disabled={!hasG}>Ungroup</button><button onClick={()=>commit(ops.filter(o=>!pick.includes(o.id)))} disabled={!pick.length}>Delete selected</button><button onClick={()=>commit([])} disabled={!ops.length}>Clear</button><button onClick={()=>navigator.clipboard?.writeText(code(ops,tab))}>Copy code</button><button className="set" onClick={run}>▶ Set up and run</button></div>
    <div className="body">
      <div className="pal"><div className="lab">OPERATIONS</div><input className="srch" value={qry} onChange={e=>setQry(e.target.value)} placeholder="Search gates" aria-label="Search gates"/><div className="gs">{defs.map(d=>pal("grp:"+d.name,{def:d},`${d.name}: group of ${d.sub.length} gates`,d.name,"g-GRP"))}{list.map(g=>pal(g,{g},NM[g],LB[g]||g,`g-${g}`))}</div><p style={{fontSize:12,color:"#a8a8a8"}}>Drag gates onto the wires, or click a gate then a slot. Click placed gates to select several, then Group them. Hover a gate for its name. Double-click removes.</p><div className={`trash ${ov==="t"?"ov":""}`} onDragOver={e=>{e.preventDefault();setOv("t")}} onDragLeave={()=>setOv("")} onDrop={e=>{e.preventDefault();setOv("");if(drag.current?.id)del(drag.current.id);drag.current=null}}>Drop here to delete</div></div>
      <div className="cv">{[0,1,2,3].map(q=><div className="qr" key={q}><div className="ql">q[{q}]</div>{Array.from({length:COLS},(_,t)=>{const o=ops.find(o=>o.t===t&&cells(o).includes(q)),k=q+"-"+t;return <div key={k} className={`cell ${ov===k?"ov":""}`} onDragOver={e=>{e.preventDefault();setOv(k)}} onDragLeave={()=>setOv("")} onDrop={e=>drop(e,q,t)} onClick={()=>{if(sel)place(sel,q,t);else setPick([])}}>{o&&TWO.includes(o.g)&&q===o.q?<i className="vl"/>:null}{o&&(!o.sub||q===o.q)?chip(o,q!==o.q):null}</div>})}<div className="dial" title={`P(1) = ${(marg(q)*100).toFixed(0)}%`} style={{background:`linear-gradient(to top,#4589ff ${marg(q)*100}%,transparent ${marg(q)*100}%)`}}/></div>)}</div>
      <div><div className="tabs">{["OpenQASM","Qiskit"].map((n,i)=><button key={n} className={tab===i?"on":""} onClick={()=>setTab(i)}>{n}</button>)}</div><div className="code">{code(ops,tab).split("\n").map((l,i)=><div key={i}><span className="ln">{i+1}</span>{l}</div>)}</div></div>
    </div>
    <div className="bot"><div><div className="lab" style={{color:"#c6c6c6"}}>BLOCH SPHERE · LIVE QUBIT STATES</div><BlochPanel S={S}/></div><div><div className="tabs">{["Probabilities","Results (1024 shots)"].map((n,i)=><button key={n} className={view===i?"on":""} onClick={()=>setView(i)}>{n}</button>)}</div><div className="hist" aria-label="Probabilities">{view&&!res?<p style={{color:"#a8a8a8",margin:"auto"}}>Press "Set up and run" to sample 1024 shots.</p>:data.map((p,i)=><div className="hb" key={i}>{p>0.001?(p*100).toFixed(0)+"%":""}<i style={{height:p*70+"%"}}/>{i.toString(2).padStart(4,"0")}</div>)}</div></div></div>
    {ctx&&<div className="gate-menu" style={{left:Math.min(ctx.x,window.innerWidth-190),top:Math.min(ctx.y,window.innerHeight-90)}} onClick={e=>e.stopPropagation()}><div className="gate-menu-title">{ctx.name}</div><button onClick={()=>{del(ctx.id);setCtx(null)}}>🗑 Delete gate</button></div>}
  </div>;
}

function Coin({gain}){
  const [spin,setSpin]=useState(false);
  const flip=()=>{setSpin(true);setTimeout(()=>setSpin(false),500);gain(15,"coin");};
  return <div style={{display:"grid",placeItems:"center",margin:"18px 0"}}><button className={`coin ${spin?"spin":""}`} onClick={flip} aria-label="Flip quantum coin">?</button><div className="mut">Click the coin to observe it.</div></div>;
}

const STEPS=[["Superposition & Coin Flips","Linear combinations and wave functions","lessons","⚛"],["Qubits & Bloch Sphere","Geometrical representation of states","lessons","🌐"],["Gates in the Sandbox","Build circuits with H, X, Z and CX","sandbox","🧪"]];
const TRACKS=[["Newbie Explorer","📖","Stories, playful analogies, and interactive visual experiments. No quantum math required!"],["Intermediate Builder","🧩","Hands-on gate puzzles, circuit composers, and gateway challenges. Level up fast!"],["Advanced Researcher","⚛","Statevectors, Dirac bra-ket notation, matrix operations, and native Qiskit export."]];

function App(){
  const [page,setPage]=useState("dashboard"),[name,setName]=useState("Alex"),[track,setTrack]=useState(0),[xp,setXp]=useState(140),[got,setGot]=useState({}),[flags,setFlags]=useState({h:false,cx:false,n:0}),[hint,setHint]=useState(true),[chat,setChat]=useState(false),[msgs,setMsgs]=useState([{u:0,t:"I'm Schrö. Ask me about superposition, gates or entanglement!"}]),[q,setQ]=useState("");
  const gain=(n,k)=>{if(got[k])return;setGot(g=>({...g,[k]:1}));setXp(x=>x+n)};
  const used=ops=>{const h=ops.some(o=>o.g==="H"),cx=ops.some(o=>o.g==="CX");setFlags({h,cx,n:ops.length});if(h)gain(20,"h");if(cx)gain(30,"cx")};
  const ask=e=>{e?.preventDefault();if(!q.trim())return;const l=q.toLowerCase();const a=/superpos/.test(l)?"Superposition means a qubit is a blend of |0⟩ and |1⟩ until you measure it. Try the coin lab!":/\bh\b|hadamard/.test(l)?"The H gate turns |0⟩ into an equal superposition. Drop one on a wire in the Sandbox.":/entangle|cx|cnot/.test(l)?"Put H on q[0], then CX on q[0]. The pair is now entangled: you only ever measure 0000 or 0011.":/xp|level/.test(l)?`You have ${xp} XP. Placing an H gate and a CX gate earns bonus XP.`:"Good question! Try it in the Sandbox, then ask me what you saw.";setMsgs(m=>[...m,{u:1,t:q},{u:0,t:a}]);setQ("")};
  const badges=[["⚛","First Qubit",1],["🌊","Wave Rider",1],["🎯","Superposer",1],["🔨","Gate Smith",flags.n>=3],["🔗","Entangler",flags.cx],["🪙","Coin Flipper",got.coin],["⭐","Level 2",xp>=300],["🏆","Master",xp>=1000]];
  const earned=badges.filter(b=>b[2]).length,prog=Math.min(100,25+(flags.h?15:0)+(flags.cx?20:0)+(got.coin?15:0));
  const nav=[["dashboard","Dashboard"],["lessons","Lessons"],["sandbox","Sandbox"],["onboarding","Onboarding"]];
  const go=p=>setPage(p);
  return <div>
    <header><button className="logo" onClick={()=>go("dashboard")}>🐾 Quantum<b>Paws</b></button><span className="tag">HUMAN LAB V2</span><nav>{nav.map((n,i)=><button key={n[0]} className={page===n[0]?"on":""} onClick={()=>go(n[0])}>{["🏠","📚","🧪","🗺"][i]} {n[1]}</button>)}</nav><span className="pill fire">🔥 5 days</span><span className="pill">⚡ {xp} XP</span><button className="btn" onClick={()=>setChat(!chat)}>😺 Ask Schrö</button></header>
    <div className="layout"><aside className="side"><div className="lab" style={{marginBottom:8}}>LAB STATION: EXP-001</div>{[["dashboard","Lab Dashboard","🏠"],["lessons","Quantum Lessons","📚"],["sandbox","Circuit Sandbox","🧪"],["onboarding","Tracks & Skills","🗺"]].map(n=><button key={n[0]} className={page===n[0]?"on":""} onClick={()=>go(n[0])}>{n[2]} {n[1]}</button>)}<div className="me"><div className="av">😺</div><div><b>{name||"Explorer"}</b><div className="mono" style={{fontSize:12,color:"var(--lime)"}}>LVL {1+Math.floor(xp/300)} · {["NEWBIE","BUILDER","RESEARCHER"][track]}</div></div></div></aside>
      <main>
        {page==="dashboard"&&<div className="grid2"><div>
          <div className="card"><div className="row"><div className="cat">😺</div><div><div className="lab">LAB SCIENTIST LOGGED IN: {(name||"EXPLORER").toUpperCase()}</div><h1>Hey {name||"there"}! Ready to experiment?</h1><p className="mut" style={{margin:0}}>Your quantum curiosity is burning bright. Let's advance toward the next level.</p></div></div></div>
          <div className="card"><div className="between row"><h2>Journey to {["Intermediate","Advanced","Mastery"][track]}</h2><span className="tag">OVERALL PROGRESS: {prog}%</span></div><div className="bar"><i style={{width:prog+"%"}}/></div><div className="row wrap" style={{marginTop:12,fontSize:13}}><span className="pill">✓ Picked track</span><span className="pill">✓ Met Schrö</span><span className="pill">{flags.h?"✓":"○"} Use the H gate</span><span className="pill">{got.coin?"✓":"○"} Flip the coin</span></div></div>
          <h2 style={{margin:"28px 0 14px"}}>Quantum Experiment Roadmap</h2>
          {STEPS.map(s=><div className="step" key={s[0]}><div className="row"><span className="av" style={{background:"#16335a"}}>{s[3]}</span><div><b>{s[0]}</b> <span className="tag">READY</span><div className="mut" style={{fontSize:14}}>{s[1]}</div></div></div><button className="btn" onClick={()=>go(s[2])}>Enter Lab →</button></div>)}
        </div><div><div className="card"><div style={{textAlign:"center"}}><div className="lab">ON-CALL AI MENTOR</div><div style={{fontSize:40}}>🐾</div><h3>Ask Schrö</h3><p className="mut">Need a hint or a cat analogy? I'm always observing!</p><button className="btn" style={{width:"100%"}} onClick={()=>setChat(true)}>Open Chat</button></div></div>
          <div className="card"><div className="between row"><h3>🏆 Lab Badges</h3><span className="lab">{earned} / 8 EARNED</span></div><div className="badges">{badges.map(b=><div key={b[1]} className={`bd ${b[2]?"on":""}`}><div><span>{b[2]?b[0]:"🔒"}</span>{b[2]?b[1]:"???"}</div></div>)}</div></div></div></div>}
        {page==="lessons"&&<div style={{maxWidth:860,margin:"0 auto"}}><div className="between row" style={{marginBottom:14}}><button className="btn ghost" onClick={()=>go("dashboard")}>← Back to Dashboard</button><span className="mono" style={{color:"var(--lime)",fontSize:13}}>MODULE 01: SUPERPOSITION & WAVEFUNCTIONS</span></div><div className="card"><div className="lab" style={{marginBottom:12}}>STORY ANALOGY: ERWIN'S SPINNING COIN</div><div className="row"><div className="cat">😺</div><div><h1>The Magic of Superposition 🌀</h1><p className="mut">In classical computers, everything is made of <b style={{color:"var(--tx)"}}>bits</b>: switches that are strictly OFF (0) or ON (1). A quantum bit, or <b style={{color:"var(--tx)"}}>qubit</b>, plays by different rules.</p></div></div><div className="card nt" style={{background:"#1a2150",marginTop:20}}><h3 style={{color:"var(--cy)"}}>Think of a Spinning Coin</h3><p className="mut" style={{margin:0}}>Resting on a table, a coin is definitely Heads (|0⟩) or Tails (|1⟩). While spinning, it is in a <b style={{color:"var(--tx)"}}>superposition of both states at once</b>. Only when you observe it does it collapse into a definite state.</p></div><Coin gain={gain}/><div style={{textAlign:"right"}}><button className="btn" onClick={()=>go("sandbox")}>Open the Circuit Sandbox →</button></div></div></div>}
        {page==="sandbox"&&<QuantumComposer />}
        {page==="onboarding"&&<div style={{maxWidth:1000,margin:"0 auto"}}><div className="card"><div className="lab">INITIALIZING QUANTUM LAB SESSION</div><div className="row"><div className="cat">😺</div><div><h1>Welcome to Quantum<span style={{color:"var(--pri)"}}>Paws</span>!</h1><p className="mut">I'm <b style={{color:"var(--tx)"}}>Schrö</b>, your AI quantum mentor. Before we enter the lab, let's configure your experiment profile.</p><input className="txt" value={name} onChange={e=>setName(e.target.value)} aria-label="Your name" placeholder="Your name"/></div></div></div><h2>Choose your research track</h2><div className="grid3">{TRACKS.map((t,i)=><button key={t[0]} className={`sel ${track===i?"on":""}`} onClick={()=>setTrack(i)}><div style={{fontSize:30}}>{t[1]}</div><h3>{t[0]}</h3><p className="mut" style={{fontSize:14}}>{t[2]}</p><span className="tag" style={{color:track===i?"var(--lime)":"var(--mut)",borderColor:track===i?"var(--lime)":"var(--line)"}}>{track===i?"✓ ACTIVE SELECTION":"SELECT TRACK"}</span></button>)}</div><div style={{textAlign:"center",marginTop:28}}><button className="btn" onClick={()=>go("dashboard")}>Enter the Quantum Lab →</button></div></div>}
      </main>
    </div>
    {chat&&<div className="chat" role="dialog" aria-label="Ask Schrö"><div className="between row"><b>😺 Schrö</b><button className="btn ghost" style={{padding:"2px 10px"}} onClick={()=>setChat(false)} aria-label="Close chat">✕</button></div><div className="msgs">{msgs.map((m,i)=><div key={i} className={`m ${m.u?"u":""}`}>{m.t}</div>)}</div><form className="row" style={{gap:6}} onSubmit={ask}><input className="txt" style={{width:"100%",fontSize:14}} value={q} onChange={e=>setQ(e.target.value)} placeholder="Ask about H, CX, superposition..." aria-label="Message"/><button className="btn" style={{padding:"8px 14px"}}>Send</button></form></div>}
    <div className="fab">{hint&&!flags.h&&<div className="hint">You haven't tried the H gate yet! <button style={{background:"none",border:0}} onClick={()=>setHint(false)} aria-label="Dismiss">✕</button></div>}<button className="cat" style={{width:64,height:64,fontSize:32,border:"2px solid var(--pri)"}} onClick={()=>setChat(!chat)} aria-label="Open Schrö chat">😺</button></div>
  </div>;
}
export default App;

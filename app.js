const canvas=document.getElementById('aura'),ctx=canvas.getContext('2d'),input=document.getElementById('text'),hashEl=document.getElementById('hash'),toast=document.getElementById('toast');
let target=null,current=null,previous=null,transition=1,started=performance.now(),lastHash='',patternMode='mandala',pointer=null;
const TAU=Math.PI*2, quality=matchMedia('(max-width:760px)').matches?.72:1, clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function hex(bytes){return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('')}
function hue(h,s=80,l=65){return `hsl(${h},${s}%,${l}%)`}
async function digest(value){
 const data=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 const b=new Uint8Array(data), n=(i)=>b[i]/255, word=(i)=>((b[i]<<8)|b[i+1])>>>0;
 const r=rand(((b[28]<<24)|(b[29]<<16)|(b[30]<<8)|b[31])>>>0);
 const harmonics=Array.from({length:5},(_,i)=>({
   x:2+((b[i*2]%7)), y:3+((b[i*2+1]%9)), amp:.14+r()*.25, phase:r()*TAU, twist:(r()-.5)*.55
 }));
 return {bytes:b,arms:7+Math.floor((word(0)/65535)*10),h1:n(2)*360,h2:n(5)*360,len:.46+n(8)*.34,sides:3+Math.floor(n(10)*6),rot:n(12)*TAU,opacity:.28+n(14)*.54,curve:.65+n(16)*.7,rings:4+Math.floor(n(20)*7),density:16+Math.floor(n(24)*34),glow:14+n(28)*38,spin:(n(30)-.5)*.00018,seed:word(28)^word(0),harmonics,field:['LISSAJOUS','FOURIER','PHASE FLOW'][b[27]%3],drift:(n(25)-.5)*.8,hex:hex(b)}
}
function rand(seed){return function(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
function mix(a,b,t){let o={};for(const k in b)o[k]=typeof b[k]==='number'&&typeof a[k]==='number'?a[k]+(b[k]-a[k])*t:b[k];return o}
function setAura(p){previous=current;target=p;transition=0}
function resize(){const d=Math.min(devicePixelRatio||1,1.5),r=canvas.getBoundingClientRect(),nw=Math.max(1,Math.round(r.width*d)),nh=Math.max(1,Math.round(r.height*d));if(canvas.width!==nw||canvas.height!==nh){canvas.width=nw;canvas.height=nh;ctx.setTransform(d,0,0,d,0,0)}}
function drawAura(p,time,alpha){
 if(!p)return;
 const w=canvas.clientWidth,h=canvas.clientHeight,cx=w/2,cy=h/2,R=Math.min(w,h)*.46,t=time-started;
 const strandCount=Math.max(12,Math.floor((p.arms*2+6)*quality)), samples=Math.floor(170*quality), fineSamples=Math.floor(120*quality);
 const breath=1+Math.sin(t*.00155)*.018, spin=t*p.spin, rnd=rand(p.seed);
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(cx,cy);ctx.rotate(spin);ctx.scale(breath,breath);
 // A hash-derived atmosphere: the field is broad enough to make the black feel inhabited.
 const atmosphere=ctx.createRadialGradient(0,0,0,0,0,R*1.16);
 atmosphere.addColorStop(0,`hsla(${p.h1},72%,42%,.20)`);atmosphere.addColorStop(.34,`hsla(${p.h2},80%,45%,.085)`);atmosphere.addColorStop(.72,`hsla(${(p.h1+110)%360},70%,35%,.035)`);atmosphere.addColorStop(1,'transparent');
 ctx.fillStyle=atmosphere;ctx.beginPath();ctx.arc(0,0,R*1.17,0,TAU);ctx.fill();
 // Generalised Lissajous / Fourier trajectories. Each strand has its own frequencies,
 // phase, radial wobble and angular drift; arms are a loose scaffold, not a mirror.
 const strands=strandCount;
 for(let s=0;s<strands;s++){
   const base=s/strands*TAU + (rnd()-.5)*.45, reach=R*(.56+p.len*.42)*(0.86+rnd()*.22), phase=rnd()*TAU, freq=1.4+rnd()*2.7, wobble=.22+rnd()*.34;
   ctx.beginPath();
   for(let j=0;j<=samples;j++){
     const q=j/170, u=q*TAU*1.04, h1=p.harmonics[s%p.harmonics.length], h2=p.harmonics[(s+2)%p.harmonics.length];
     const fx=Math.sin((h1.x+freq)*u+phase)+h1.amp*Math.sin((h2.x+freq*1.7)*u+h1.phase)+.12*Math.sin(7*u+phase*.7);
     const fy=Math.cos((h1.y+freq*.72)*u+phase*h1.twist)+h2.amp*Math.cos((h2.y+freq*1.3)*u+h2.phase)+.13*Math.cos(5*u-phase);
     let x,y;
     if(patternMode==='mandala'){const radial=R*(.10+q*.73)+fx*R*wobble*.105;const ang=base+fy*.22+q*q*p.drift*.35;x=Math.cos(ang)*radial;y=Math.sin(ang)*radial+fy*R*.06;}
     else if(patternMode==='mesh'){const grid=q*2-1; x=grid*R*.92+Math.sin(u*2.0+phase)*R*.18+fx*R*.08; y=Math.sin(grid*TAU*1.5+phase)*R*.34+Math.cos(u*3.0+phase)*R*.22+fy*R*.1;}
     else {const radial=R*(.08+q*.82)+fx*R*wobble*.16;const ang=base+fy*.45+Math.sin(u*1.7+phase)*.18+q*q*p.drift;x=Math.cos(ang)*radial+Math.sin(u*2.7+phase)*R*.08;y=Math.sin(ang)*radial+fy*R*.15;}
     j?ctx.lineTo(x,y):ctx.moveTo(x,y);
   }
   const hueNow=(p.h1+s*13+p.h2*.12)%360;ctx.strokeStyle=`hsla(${hueNow},${68+rnd()*26}%,${63+rnd()*20}%,${.10+rnd()*.22})`;ctx.lineWidth=.45+rnd()*1.25;ctx.shadowBlur=p.glow*(.35+rnd()*.45);ctx.shadowColor=hue(hueNow,90,68);ctx.stroke();
 }
 // A second, finer Fourier contour gives the aura its almost biological edge.
 ctx.globalCompositeOperation='lighter';
 for(let s=0;s<strands*.65;s++){
   const base=rnd()*TAU, phase=rnd()*TAU, amp=R*(.045+rnd()*.11);ctx.beginPath();
   for(let j=0;j<=fineSamples;j++){const q=j/120,u=q*TAU*1.2;let rad=R*(.22+q*.68);for(let k=0;k<4;k++)rad+=Math.sin(u*(k+2+p.harmonics[k].x*.2)+phase*k)*amp/(k+1);const a=base+Math.cos(u*(2+p.harmonics[s%5].y*.13)+phase)*.22+q*p.drift*.3;const x=Math.cos(a)*rad,y=Math.sin(a)*rad;if(j)ctx.lineTo(x,y);else ctx.moveTo(x,y)}
   ctx.strokeStyle=`hsla(${(p.h2+s*19)%360},90%,75%,${.06+rnd()*.12})`;ctx.lineWidth=.35+rnd()*.7;ctx.stroke();
 }
 // Concentric rings are intentionally eccentric: they breathe and drift instead of becoming a target.
 ctx.globalCompositeOperation='source-over';ctx.shadowBlur=p.glow*.55;
 for(let i=0;i<p.rings;i++){const rr=R*(.17+i*.073),off=Math.sin(t*.00045+i)*.012;ctx.globalAlpha=alpha*p.opacity*(1-i/p.rings)*.55;ctx.strokeStyle=hue((p.h2+i*17)%360,72,70);ctx.lineWidth=.45+(i%2)*.35;ctx.beginPath();for(let j=0;j<=96;j++){const a=j/96*TAU, wob=rr*(1+off*Math.sin(a*(3+i%4)+p.rot));const x=Math.cos(a)*wob,y=Math.sin(a)*wob; j?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}
 // Particles sample the same trajectories, so they feel like matter in the field.
 ctx.globalAlpha=alpha;ctx.shadowBlur=p.glow*.8;for(let i=0;i<p.arms*p.density;i++){const strand=i%strands,q=rnd(),u=q*TAU*1.04,h1=p.harmonics[strand%5],ang=strand/strands*TAU+Math.sin(u*1.4+h1.phase)*.26+q*q*p.drift*.7,rad=R*(.10+q*.73)+Math.sin(u*h1.x+h1.phase)*R*.04;ctx.save();ctx.translate(Math.cos(ang)*rad,Math.sin(ang)*rad);const size=.65+rnd()*1.65+Math.sin(t*.002+i)*.35;ctx.fillStyle=i%4?`hsla(${p.h2+strand*11},90%,78%,${.22+rnd()*.62})`:`hsla(${p.h1},92%,82%,.75)`;ctx.beginPath();ctx.arc(0,0,size,0,TAU);ctx.fill();ctx.restore()}
 // Cursor glimmer: a local lens reveals the nearby field without changing it.
 if(pointer){const dx=pointer.x-cx,dy=pointer.y-cy,co=Math.cos(-spin),si=Math.sin(-spin),mx=(dx*co-dy*si)/breath,my=(dx*si+dy*co)/breath,dist=Math.hypot(mx,my);if(dist<R*1.25){const lens=ctx.createRadialGradient(mx,my,0,mx,my,R*.46);lens.addColorStop(0,`hsla(${p.h2},100%,82%,.12)`);lens.addColorStop(.28,`hsla(${p.h1},100%,68%,.07)`);lens.addColorStop(1,'transparent');ctx.globalAlpha=alpha;ctx.fillStyle=lens;ctx.beginPath();ctx.arc(mx,my,R*.48,0,TAU);ctx.fill();}}
 // A quiet central singularity anchors the otherwise non-symmetric system.
 ctx.shadowBlur=p.glow*1.4;ctx.fillStyle=hue(p.h1,90,82);ctx.globalAlpha=alpha*.52;ctx.beginPath();ctx.arc(0,0,1.7+Math.sin(t*.002)*.7,0,TAU);ctx.fill();ctx.restore();
}
function frame(now){resize();ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);if(current&&target&&transition<1)transition=clamp(transition+.018,0,1);if(previous&&transition<1)drawAura(previous,now,1-transition);drawAura(target&&current?mix(current,target,transition):target,now,1);if(current&&target&&transition>=1){current=target;previous=null}requestAnimationFrame(frame)}
async function update(){const val=input.value;const p=await digest(val);if(p.hex===lastHash)return;lastHash=p.hex;hashEl.textContent='sha-256 · '+p.hex;document.getElementById('field').textContent=p.field;document.getElementById('harmonics').textContent=p.harmonics.map(h=>h.x+'×'+h.y).join(' ');document.getElementById('drift').textContent=(p.drift>=0?'+':'')+p.drift.toFixed(2);setAura(p)}
function b64(s){return btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function from64(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return new TextDecoder().decode(Uint8Array.from(atob(s),c=>c.charCodeAt(0)))}
function b64bytes(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function bytesFrom64(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function sealPayload(){const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']);const iv=crypto.getRandomValues(new Uint8Array(12));const body=new TextEncoder().encode(JSON.stringify({text:input.value,pattern:patternMode}));const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,body);const raw=await crypto.subtle.exportKey('raw',key);return {d:b64bytes(iv)+'.'+b64bytes(new Uint8Array(cipher)),k:b64bytes(new Uint8Array(raw))}}
async function openPayload(d,k){const parts=d.split('.');if(parts.length!==2)throw Error('bad payload');const key=await crypto.subtle.importKey('raw',bytesFrom64(k),{name:'AES-GCM'},false,['decrypt']);const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytesFrom64(parts[0])},key,bytesFrom64(parts[1]));return JSON.parse(new TextDecoder().decode(plain))}
input.addEventListener('input',update);
canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();pointer={x:e.clientX-r.left,y:e.clientY-r.top};});canvas.addEventListener('pointerleave',()=>pointer=null);
document.querySelectorAll('[data-pattern]').forEach(btn=>btn.addEventListener('click',()=>{patternMode=btn.dataset.pattern;document.querySelectorAll('[data-pattern]').forEach(x=>x.classList.toggle('active',x===btn));}));
document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{const decode=btn.dataset.tab==='decode';document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===btn));document.querySelector('.create-zone').style.display=decode?'none':'';document.getElementById('decodeZone').classList.toggle('open',decode);}));document.getElementById('decodeBtn').addEventListener('click',async()=>{try{const u=new URL(document.getElementById('decodeInput').value.trim()),d=u.searchParams.get('d'),k=u.hash.startsWith('#k=')?u.hash.slice(3):'';if(!d||!k)throw Error('missing encrypted payload');const payload=await openPayload(d,k);input.value=payload.text;if(['mandala','mesh','nebula'].includes(payload.pattern)){patternMode=payload.pattern;document.querySelectorAll('[data-pattern]').forEach(x=>x.classList.toggle('active',x.dataset.pattern===patternMode));}lastHash='';await update();document.querySelector('[data-tab="create"]').click();document.getElementById('decodeStatus').textContent='Encrypted aura decoded — the original text is back in the generator.';}catch(e){document.getElementById('decodeStatus').textContent='Invalid or incomplete encrypted Veyra link.';}});
document.getElementById('share').addEventListener('click',async()=>{const pack=await sealPayload();const url=location.origin+location.pathname+'?d='+pack.d+'#k='+pack.k;try{await navigator.clipboard.writeText(url)}catch{const ta=document.createElement('textarea');ta.value=url;document.body.append(ta);ta.select();document.execCommand('copy');ta.remove()}toast.textContent='encrypted link copied ✓';toast.classList.add('show');setTimeout(()=>{toast.classList.remove('show');toast.textContent='link copied ✓'},2200)});document.getElementById('download').addEventListener('click',()=>{const a=document.createElement('a');a.download='my-aura.png';a.href=canvas.toDataURL('image/png');a.click()});
async function restoreShared(){try{const params=new URLSearchParams(location.search),d=params.get('d'),k=location.hash.startsWith('#k=')?location.hash.slice(3):'';if(d&&k){const payload=await openPayload(d,k);input.value=payload.text;if(['mandala','mesh','nebula'].includes(payload.pattern)){patternMode=payload.pattern;document.querySelectorAll('[data-pattern]').forEach(x=>x.classList.toggle('active',x.dataset.pattern===patternMode));}}else{const q=params.get('q');if(q!==null)input.value=from64(q);const sharedPattern=params.get('p');if(['mandala','mesh','nebula'].includes(sharedPattern)){patternMode=sharedPattern;document.querySelectorAll('[data-pattern]').forEach(x=>x.classList.toggle('active',x.dataset.pattern===patternMode));}}}catch{toast.textContent='This shared link could not be decoded';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2800)}update()}restoreShared();requestAnimationFrame(frame);window.addEventListener('resize',resize);

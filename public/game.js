
"use strict";
const NS="http://www.w3.org/2000/svg",svg=document.querySelector("#board"),$=s=>document.querySelector(s);
const C=[{id:"red",name:"Красный",fill:"#df2735"},{id:"black",name:"Чёрный",fill:"#171717"},{id:"blue",name:"Синий",fill:"#008fa5"},{id:"whiteblue",name:"Бело-синий",fill:"#f8f7ef"}];
const TRACK=[], A=160,Z=840,STEP=(Z-A)/12;
// 48 outer cells: on each side from center to corner exactly 6 cells.
for(let i=0;i<13;i++)TRACK.push([Z-i*STEP,A]);                 // top, right -> left (13 cells)
for(let i=1;i<13;i++)TRACK.push([A,A+i*STEP]);                 // left, top -> bottom (12 more)
for(let i=1;i<13;i++)TRACK.push([A+i*STEP,Z]);                 // bottom, left -> right (12 more)
for(let i=1;i<12;i++)TRACK.push([Z,Z-i*STEP]);                 // right, bottom -> top (11 more)
// Bases in the exact center of each side.
const START={blue:6,black:18,red:30,whiteblue:42};
const YARD={blue:[[390,82],[445,82],[500,82],[555,82],[610,82]],whiteblue:[[918,390],[918,445],[918,500],[918,555],[918,610]],red:[[390,918],[445,918],[500,918],[555,918],[610,918]],black:[[82,390],[82,445],[82,500],[82,555],[82,610]]};
const HOME={blue:[[500,245],[500,295],[500,345],[500,395],[500,445]],whiteblue:[[755,500],[705,500],[655,500],[605,500],[555,500]],red:[[500,755],[500,705],[500,655],[500,605],[500,555]],black:[[245,500],[295,500],[345,500],[395,500],[445,500]]};
// "Говно" как отдельная дорожка 1 -> 3 -> 6 на краях поля.
const TRAP_ENTRY=new Set([3,15,27,39]), NEED=[1,3,6];
const TRAP={
  // Верх: визуально 1,3,6 слева направо. Стоит ПАРАЛЛЕЛЬНО верхнему ряду.
  blue:[[670,88],[727,88],[783,88]],
  // Право: визуально 1,3,6 сверху вниз. Параллельно правому столбцу.
  whiteblue:[[912,670],[912,727],[912,783]],
  // Низ: визуально 6,3,1 слева направо. Для логики 1->3->6 хранится справа налево.
  red:[[330,912],[273,912],[217,912]],
  // Лево: визуально 6,3,1 сверху вниз. Для логики 1->3->6 хранится снизу вверх.
  black:[[88,330],[88,273],[88,217]]
};
const TRAP_META={
  blue:{entry:3, exit:1},
  whiteblue:{entry:39, exit:37},
  red:{entry:27, exit:25},
  black:{entry:15, exit:13}
};
const DIAG_JUMPS=[
  // ВЕРХ-ПРАВО: локальные клетки 2 -> 10 и 11 -> 1
  {sector:"tr", from:4,  to:44, label:"2→10", sx:613,sy:190,cx:650,cy:330,ex:810,ey:387},
  {sector:"tr", from:43, to:5,  label:"11→1", sx:810,sy:443,cx:690,cy:345,ex:557,ey:190},

  // НИЗ-ПРАВО: та же схема, повернутая на 90°
  {sector:"br", from:40, to:32, label:"2→10", sx:810,sy:613,cx:685,cy:650,ex:613,ey:810},
  {sector:"br", from:31, to:41, label:"11→1", sx:557,sy:810,cx:690,cy:700,ex:810,ey:557},

  // НИЗ-ЛЕВО
  {sector:"bl", from:28, to:20, label:"2→10", sx:387,sy:810,cx:335,cy:670,ex:190,ey:613},
  {sector:"bl", from:19, to:29, label:"11→1", sx:190,sy:557,cx:320,cy:675,ex:443,ey:810},

  // ВЕРХ-ЛЕВО
  {sector:"tl", from:16, to:8,  label:"2→10", sx:190,sy:387,cx:335,cy:330,ex:387,ey:190},
  {sector:"tl", from:7,  to:17, label:"11→1", sx:443,sy:190,cx:330,cy:325,ex:190,ey:443}
];
const DIAG_MAP=Object.fromEntries(DIAG_JUMPS.map(x=>[x.from,x]));
// Других скрытых перелётов больше нет: переходы выполняются только по нарисованным стрелкам.
const TELE={};
let g=null,preview=null,animating=false;
const dice=[$("#d0"),$("#d1")];
let gameMode="local";
function onlineActive(){return gameMode==="online" && !!window.MondavoshkaOnline?.active}
function onlineCanAct(){return !onlineActive() || window.MondavoshkaOnline.canAct()}

function yandexGameplayStart(){
  try{ window.ysdk?.features?.GameplayAPI?.start(); }catch(e){}
}
function yandexGameplayStop(){
  try{ window.ysdk?.features?.GameplayAPI?.stop(); }catch(e){}
}

const WISHES=[
  "Принести завтрак",
  "Принести мороженое",
  "Принести онигири",
  "Принести сок",
  "Моет кофемашину",
  "Делает кофе всем игрокам",
  "Проставиться на обед"
];
let pendingPlayerCount=4;
let selectedWish=null;
let wheelRotation=0;

// Оригинальная процедурная средневековая музыка — без внешних аудиофайлов.
let audioCtx=null;
let musicTimer=null;
let musicEnabled=true;
let musicStep=0;
const MEDIEVAL_SCALE=[0,2,3,5,7,9,10,12]; // дорийский лад

function E(t,a={},p=svg){let e=document.createElementNS(NS,t);for(const[k,v]of Object.entries(a))e.setAttribute(k,v);p.appendChild(e);return e}
function drawBoard(){
 svg.innerHTML="";
 const defs=E("defs");
 const pat=E("pattern",{id:"grain",width:70,height:70,patternUnits:"userSpaceOnUse"},defs);
 E("rect",{width:70,height:70,fill:"#e7c38d"},pat);
 E("path",{d:"M0 16 Q22 8 70 18 M0 47 Q30 39 70 51",fill:"none",stroke:"#a86f3b","stroke-width":1.2,opacity:.18},pat);
 const cellGrad=E("linearGradient",{id:"cellGrad",x1:"0",y1:"0",x2:"0",y2:"1"},defs);
 E("stop",{offset:"0%","stop-color":"#f8e2ba"},cellGrad);E("stop",{offset:"58%","stop-color":"#edcd9a"},cellGrad);E("stop",{offset:"100%","stop-color":"#d4a96f"},cellGrad);
 const baseGrad=E("linearGradient",{id:"baseGrad",x1:"0",y1:"0",x2:"1",y2:"1"},defs);
 E("stop",{offset:"0%","stop-color":"#fff2cf"},baseGrad);E("stop",{offset:"100%","stop-color":"#d9ad73"},baseGrad);
 const woodGrad=E("linearGradient",{id:"woodGrad",x1:"0",y1:"0",x2:"0",y2:"1"},defs);
 E("stop",{offset:"0%","stop-color":"#d49a58"},woodGrad);E("stop",{offset:"55%","stop-color":"#9d6031"},woodGrad);E("stop",{offset:"100%","stop-color":"#6e3c20"},woodGrad);
 const shadow=E("filter",{id:"shadow",x:"-30%",y:"-30%",width:"160%",height:"170%"},defs);
 E("feDropShadow",{dx:0,dy:5,stdDeviation:4,"flood-color":"#2a1409","flood-opacity":.42},shadow);
 const pieceShadow=E("filter",{id:"pieceShadow",x:"-60%",y:"-60%",width:"220%",height:"240%"},defs);
 E("feDropShadow",{dx:0,dy:7,stdDeviation:4,"flood-color":"#120904","flood-opacity":.72},pieceShadow);
 [["redPiece","#ff6971","#d91f2f","#7d0912"],["blackPiece","#676767","#191919","#050505"],["bluePiece","#5ce2ec","#008da3","#004d5b"],["whitePiece","#ffffff","#eee9df","#aaa79e"],["captivePiece","#f2b36d","#c47a33","#6d3d17"]]
  .forEach(([id,a,b,c])=>{const gr=E("radialGradient",{id,cx:"32%",cy:"24%",r:"78%"},defs);E("stop",{offset:"0%","stop-color":a},gr);E("stop",{offset:"57%","stop-color":b},gr);E("stop",{offset:"100%","stop-color":c},gr);});
 const fatArrow=E("marker",{id:"fatArrow",viewBox:"0 0 12 12",refX:10.5,refY:6,markerWidth:5.8,markerHeight:5.8,orient:"auto-start-reverse"},defs);
 E("path",{d:"M0 0 L12 6 L0 12 z",fill:"#18110d"},fatArrow);
 const arrowMarker=E("marker",{id:"thinArrow",viewBox:"0 0 10 10",refX:8,refY:5,markerWidth:7,markerHeight:7,orient:"auto-start-reverse"},defs);
 E("path",{d:"M0 0 L10 5 L0 10 z",fill:"#4c2d19"},arrowMarker);

 // Frame
 E("rect",{x:6,y:6,width:988,height:988,rx:18,fill:"url(#woodGrad)",stroke:"#3c2112","stroke-width":8,filter:"url(#shadow)"});
 E("rect",{x:25,y:25,width:950,height:950,rx:13,fill:"none",stroke:"#efbd78","stroke-width":4,opacity:.65});
 E("rect",{x:39,y:39,width:922,height:922,rx:9,fill:"url(#grain)",stroke:"#5d351b","stroke-width":6});
 E("rect",{x:48,y:48,width:904,height:904,rx:6,fill:"none",stroke:"#f4cf91","stroke-width":2,opacity:.65});

 // Clean center field
 E("rect",{x:210,y:210,width:580,height:580,rx:6,fill:"#efd7ad",stroke:"#6a4628","stroke-width":3,filter:"url(#shadow)"});

 // Переходы по диагональным стрелкам.
 // Визуальная траектория и игровая логика используют ОДНИ И ТЕ ЖЕ DIAG_JUMPS.
 DIAG_JUMPS.forEach(j=>{
   const d=`M${j.sx} ${j.sy} Q${j.cx} ${j.cy} ${j.ex} ${j.ey}`;
   // Мягкая тень под линией
   E("path",{d,fill:"none",stroke:"#7b654f","stroke-width":8.2,opacity:.18,"stroke-linecap":"round"});
   // Основная аккуратная стрелка
   E("path",{d,fill:"none",stroke:"#211914","stroke-width":5.2,opacity:.94,"stroke-linecap":"round","marker-end":"url(#fatArrow)"});
 });

 // Outer 48 cells
 TRACK.forEach((p,i)=>{
   let cls="cell"+(Object.values(START).includes(i)?" start":"")+(TRAP_ENTRY.has(i)?" trap":"");
   E("rect",{x:p[0]-STEP/2+2,y:p[1]-STEP/2+2,width:STEP-4,height:STEP-4,rx:4,class:cls,"data-cell":i,fill:Object.values(START).includes(i)?"url(#baseGrad)":"url(#cellGrad)"});
   E("path",{d:`M${p[0]-STEP/2+7} ${p[1]-STEP/2+7} H${p[0]+STEP/2-7}`,stroke:"#fff2d1","stroke-width":2,opacity:.42,"pointer-events":"none"});
 });

 // Home lane / Domik
 Object.entries(HOME).forEach(([col,arr])=>arr.forEach((p,i)=>E("rect",{x:p[0]-23,y:p[1]-23,width:46,height:46,rx:7,fill:i===4?"#bf8b50":"url(#cellGrad)",stroke:"#674326","stroke-width":3,filter:"url(#shadow)"})));
 E("rect",{x:468,y:468,width:64,height:64,rx:10,fill:"#6f4a2d",stroke:"#3e2718","stroke-width":4,filter:"url(#shadow)"});
 let ct=E("text",{x:500,y:507,class:"smalltxt","text-anchor":"middle",fill:"#fff"});ct.textContent="ДОМИК";

 // Piece yards
 Object.entries(YARD).forEach(([col,arr])=>arr.forEach((p,i)=>{
   E("circle",{cx:p[0],cy:p[1]+3,r:25,fill:"#5e361f",opacity:.45});
   E("circle",{cx:p[0],cy:p[1],r:24,class:"homeHole"});
   E("circle",{cx:p[0],cy:p[1],r:17,class:"homeInner"});
   E("ellipse",{cx:p[0]-5,cy:p[1]-7,rx:8,ry:5,fill:"#e3b375",opacity:.18});
 }));

 // Base labels
 Object.entries(START).forEach(([col,idx])=>{
   let p=TRACK[idx],t=E("text",{x:p[0],y:p[1]+6,class:"smalltxt","text-anchor":"middle",opacity:.62,"pointer-events":"none"});
   t.textContent="БАЗА"
 });

 // Trap cells exactly like original layout, parallel to nearby outer cells
 Object.entries(TRAP).forEach(([col,arr])=>{
   arr.forEach((p,i)=>{
     E("rect",{x:p[0]-24,y:p[1]-24,width:48,height:48,rx:5,fill:"url(#baseGrad)",stroke:"#684326","stroke-width":3,filter:"url(#shadow)"});
     let vis = NEED[i];
     let t=E("text",{x:p[0],y:p[1]+8,class:"txt","text-anchor":"middle"});t.textContent=vis;
   });
 });

 // Thin arrows: one arrow enters the trap at \"1\", another arrow exits from \"6\"
 const thin = [
   // TOP blue: entry from row below up into 1, exit from 6 down to row
   {x1:670, y1:145, x2:670, y2:118},
   {x1:783, y1:118, x2:783, y2:145},

   // RIGHT white-blue: entry from left column into 1, exit from 6 back to left
   {x1:850, y1:670, x2:882, y2:670},
   {x1:882, y1:783, x2:850, y2:783},

   // BOTTOM red: entry from row above down into 1 (rightmost red trap cell), exit from 6 up to row
   {x1:330, y1:850, x2:330, y2:882},
   {x1:217, y1:882, x2:217, y2:850},

   // LEFT black: entry from track into 1 (bottom black trap cell), exit from 6 back to track from top trap cell
   {x1:145, y1:330, x2:118, y2:330},
   {x1:118, y1:217, x2:145, y2:217},
 ];
 thin.forEach(a=>E("line",{x1:a.x1,y1:a.y1,x2:a.x2,y2:a.y2,stroke:"#55341d","stroke-width":4,"marker-end":"url(#thinArrow)","stroke-linecap":"round"}));

 renderPieces();
}function player(){return g.players[g.turn]}
function buildGameState(n,wish=selectedWish){
 return {
   players:C.slice(0,n).map((c,owner)=>({...c,owner,pieces:Array.from({length:5},(_,i)=>({id:c.id+i,owner,n:i,state:"yard",track:null,progress:0,trap:0,trapSide:null,captorSide:null}))})),
   turn:0,d:[0,0],used:[false,false],selected:null,sum:false,rolled:false,double:false,
   forfeit:wish
 };
}
function activateGameState(state,mode="local",statusText="Бросьте две кости."){
 yandexGameplayStart();
 gameMode=mode;
 g=JSON.parse(JSON.stringify(state));
 closeGameMenus();
 clearDice();
 preview=null;
 animating=false;
 setStatus(statusText);
 drawBoard();
 updateUI();
 updatePenaltyCard();
 startMusic();
 if(onlineActive()) window.MondavoshkaOnline.refreshControls();
 else $("#roll").disabled=false;
}
function newGame(n,wish=selectedWish){
 activateGameState(buildGameState(n,wish),"local","Бросьте две кости.");
}
function startOnlineGameState(state,statusText="Онлайн-партия началась."){
 activateGameState(state,"online",statusText);
}
function restoreDiceFromState(){
 if(!g)return;
 if(!g.rolled){clearDice();return;}
 dice.forEach((b,i)=>{
   b.querySelector("span").dataset.v=g.d[i];
   b.classList.toggle("active",g.selected===i);
   b.disabled=!!g.used[i];
 });
 $("#sum").disabled=true;
}
function applyOnlineSnapshot(state,statusText){
 if(!state)return;
 gameMode="online";
 g=JSON.parse(JSON.stringify(state));
 preview=null;
 animating=false;
 resetCellClasses();
 drawBoard();
 updateUI();
 updatePenaltyCard();
 restoreDiceFromState();
 if(statusText)setStatus(statusText);
 window.MondavoshkaOnline?.refreshControls();
}
function allPieces(){ return g.players.flatMap(pl=>pl.pieces); }
function capturedOnSide(side){
  return allPieces().filter(p=>p.state==="captured"&&p.captorSide===side).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
}
function freeYardSlots(side){
  const captor = g.players.find(p=>p.id===side);
  const used = new Set(captor.pieces.filter(p=>p.state==="yard").map(p=>p.n));
  const free=[];
  for(let i=0;i<5;i++) if(!used.has(i)) free.push(i);
  return free;
}
function prisonSlotIndex(pc){
  const free = freeYardSlots(pc.captorSide);
  const list = capturedOnSide(pc.captorSide);
  const idx = list.findIndex(x=>x.id===pc.id);
  return free[Math.max(0, idx)] ?? 0;
}
function renderPieces(){
 if(!g)return;
 svg.querySelectorAll(".piece,.route,.shards").forEach(e=>e.remove());
 if(preview&&preview.path.length){
   let pts=preview.path.map(i=>TRACK[i].join(",")).join(" ");
   E("polyline",{points:pts,class:"route"});
   preview.path.forEach(i=>svg.querySelector(`[data-cell="${i}"]`)?.classList.add("path"));
   if(preview.dest!=null)svg.querySelector(`[data-cell="${preview.dest}"]`)?.classList.add("dest");
   if(preview.jumpTo!=null)svg.querySelector(`[data-cell="${preview.jumpTo}"]`)?.classList.add("jumpdest");
 }
 let legalIds=new Set(currentLegal().map(x=>x.id));
 const drawOrder = allPieces().slice().sort((a,b)=>{
   const sa = a.state==="captured" ? 1 : 0;
   const sb = b.state==="captured" ? 1 : 0;
   return sa-sb;
 });
 drawOrder.forEach(pc=>{
  const pl = g.players[pc.owner];
  let p=pos(pc,pl), cls="piece"+(legalIds.has(pc.id)?" can":"")+(preview?.id===pc.id?" sel":"")+(pc.state==="captured"?" captive":"");
  let grp=E("g",{"data-id":pc.id,class:cls});
  E("ellipse",{cx:p[0],cy:p[1]+8,rx:23,ry:10,fill:"#180d08",opacity:.34},grp);
  E("circle",{cx:p[0],cy:p[1]+4,r:22,fill:"#111",stroke:"#050505","stroke-width":2},grp);
  const grad = pc.state==="captured"
    ? "url(#captivePiece)"
    : (pl.id==="red"?"url(#redPiece)":pl.id==="blue"?"url(#bluePiece)":pl.id==="black"?"url(#blackPiece)":"url(#whitePiece)");
  E("circle",{cx:p[0],cy:p[1],r:21,fill:grad,stroke:"#17100c","stroke-width":3,filter:"url(#pieceShadow)"},grp);
  if(pl.id==="whiteblue" && pc.state!=="captured"){
    E("path",{d:`M${p[0]-15} ${p[1]}h30 M${p[0]} ${p[1]-15}v30`,stroke:"#164b8c","stroke-width":8,"stroke-linecap":"round"},grp);
  }
  if(pc.state==="captured"){
    E("path",{d:`M${p[0]-9} ${p[1]-7} L${p[0]+8} ${p[1]+8} M${p[0]-3} ${p[1]+10} L${p[0]+9} ${p[1]-2}`,stroke:"#6a3516","stroke-width":3,"stroke-linecap":"round"},grp);
  }
  E("ellipse",{cx:p[0]-6,cy:p[1]-8,rx:7,ry:4,fill:"#fff",opacity:.28},grp);
  grp.addEventListener("click",()=>pieceClick(pc));
 });
}
function trapSideByEntry(idx){
  for(const [side,meta] of Object.entries(TRAP_META)) if(meta.entry===idx) return side;
  return null;
}
function pos(pc,pl){
  if(pc.state==="yard") return YARD[pl.id][pc.n];
  if(pc.state==="captured") return YARD[pc.captorSide][prisonSlotIndex(pc)];
  if(pc.state==="trap") return TRAP[pc.trapSide || pl.id][pc.trap];
  if(pc.state==="home"){let k=pl.pieces.filter(x=>x.state==="home"&&x.n<=pc.n).length-1;return HOME[pl.id][Math.max(0,k)]}
  return TRACK[pc.track]
}
function roll(){
 if(animating||!g||g.rolled)return;
 if(onlineActive()){
   if(!onlineCanAct()){
     setStatus(`Сейчас ходит ${player().name}. Ожидайте своей очереди.`);
     window.MondavoshkaOnline.refreshControls();
     return;
   }
   window.MondavoshkaOnline.requestRoll();
   return;
 }
 const r=[1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)];
 applyRollValues(r,false);
}
function applyRollValues(r,fromNetwork=false){
 if(animating||!g||g.rolled)return;
 animating=true;
 $("#roll").disabled=true;
 try{
   dice.forEach(b=>{
     b.disabled=true;
     b.classList.add("rolling");
     b.querySelector("span").dataset.v=1+Math.floor(Math.random()*6);
   });
 }catch(err){
   console.error("Ошибка броска кубиков:",err);
   animating=false;
   g.rolled=false;
   if(onlineActive()) window.MondavoshkaOnline.refreshControls(); else $("#roll").disabled=false;
   setStatus("Не удалось выполнить бросок. Попробуйте ещё раз.");
   return;
 }
 setStatus("Кубики летят…");
 setTimeout(()=>{
   g.d=[Number(r[0]),Number(r[1])];
   g.used=[false,false];
   g.rolled=true;
   g.double=g.d[0]===g.d[1];
   g.sum=false;
   g.selected=null;
   dice.forEach((b,i)=>{
     b.classList.remove("rolling");
     b.querySelector("span").dataset.v=g.d[i];
     b.disabled=true;
   });
   animating=false;
   beginOrderedDice();
   if(fromNetwork) window.MondavoshkaOnline?.afterNetworkRollApplied();
   window.MondavoshkaOnline?.refreshControls();
 },720);
}
function beginOrderedDice(){
 if(!g||!g.rolled)return;

 const unused=[0,1].filter(i=>!g.used[i]);
 if(!unused.length){finishTurn();return;}

 let next;
 if(unused.length===2){
   next = g.d[0]>=g.d[1] ? 0 : 1;   // сначала большая
 }else{
   next=unused[0];                    // затем оставшаяся, то есть меньшая
 }

 const value=g.d[next];
 const canMove=player().pieces.some(p=>legal(p,value,false));

 if(!canMove){
   g.used[next]=true;
   dice[next].disabled=true;

   const left=[0,1].filter(i=>!g.used[i]);
   if(left.length){
     const second=left[0];
     const canSecond=player().pieces.some(p=>legal(p,g.d[second],false));
     if(canSecond){
       dice[second].disabled=false;
       setStatus(`Большей костью ${value} сходить нельзя. Она пропускается. Теперь ходим меньшей костью ${g.d[second]}.`);
       selectDie(second);
       return;
     }
     g.used[second]=true;
   }

   // Никаких зависаний и ожиданий: сразу передаём ход.
   const oldName=player().name;
   finishTurn();
   setStatus(`${oldName}: этими костями ходов нет. Ход передан игроку ${player().name}. Бросайте кости.`);
   $("#roll").disabled=false;
   return;
 }

 dice[next].disabled=false;
 const unusedCount=unused.length;
 if(unusedCount===2 && g.d[0]!==g.d[1]){
   const low=Math.min(g.d[0],g.d[1]);
   setStatus(`Выпало ${g.d[0]} и ${g.d[1]}. Сначала ходим на ${value}. Нажмите зелёную фишку. Затем ходим на ${low}.`);
 }else if(unusedCount===2){
   setStatus(`Дубль ${value}:${value}. Сыграйте первую ${value}.`);
 }else{
   setStatus(`Теперь ходим второй костью: ${value}.`);
 }
 selectDie(next);
}
function selectDie(i){
 if(!g.rolled||g.used[i]||animating||dice[i].disabled)return;

 const unused=[0,1].filter(j=>!g.used[j]);
 if(unused.length===2 && g.d[0]!==g.d[1]){
   const highIndex=g.d[0]>g.d[1]?0:1;
   if(i!==highIndex){
     setStatus(`Сначала нужно использовать большую кость ${g.d[highIndex]}, затем меньшую ${g.d[i]}.`);
     return;
   }
 }

 g.selected=i;
 g.sum=false;
 preview=null;
 dice.forEach((b,j)=>b.classList.toggle("active",i===j));
 $("#sum").classList.remove("active");
 const moves=currentLegal();

 if(!moves.length){
   setStatus(`Кость ${g.d[i]} сейчас не даёт допустимого хода.`);
 }else{
   setStatus(`Ходим на ${g.d[i]}. Зелёным подсвечены допустимые фишки.`);
 }
 resetCellClasses();
 renderPieces()
}
function selectSum(){
 setStatus("В этой версии игры ход суммой отключён. Нужно сходить сначала одной костью, потом второй — как в правилах Мондавошки.");
}
function stepsNow(){return g.selected==null?null:g.d[g.selected]}
function legal(pc,steps,sourceSum=g.sum){
 if(steps==null||pc.owner!==g.turn||pc.state==="home") return null;
 let pl=player();

 // Пленную фишку отдельная шестёрка только возвращает домой, а не выводит на поле.
 if(pc.state==="captured"){
   if(sourceSum||steps!==6) return null;
   return {id:pc.id,rescue:true,path:[],dest:null};
 }

 if(pc.state==="yard"){
   if(sourceSum||steps!==6) return null;
   let s=START[pl.id];
   if(ownAt(s,pc.owner)) return null;
   return {id:pc.id,path:[s],dest:s,exit:true};
 }

 if(pc.state==="trap"){
   if(sourceSum||steps!==NEED[pc.trap]) return null;
   return {id:pc.id,path:[],dest:null,trap:true};
 }

 let path=[];
 for(let k=1;k<=steps;k++){
   let idx=(pc.track-1+TRACK.length)%TRACK.length;
   if(path.length) idx=(path[path.length-1]-1+TRACK.length)%TRACK.length;
   if(k<steps&&anyAt(idx,pc.id)) return null;
   path.push(idx);
 }
 let dest=path.at(-1);
 if(ownAt(dest,pc.owner)) return null;

 const jump=DIAG_MAP[dest];
 if(jump && ownAt(jump.to,pc.owner)) return null;

 return {id:pc.id,path,dest,jumpTo:jump?jump.to:null};
}
function currentLegal(){let s=stepsNow();if(s==null)return[];return player().pieces.map(p=>legal(p,s)).filter(Boolean)}
async function pieceClick(pc){
 if(animating||pc.owner!==g.turn)return;
 if(onlineActive()&&!onlineCanAct()){setStatus(`Сейчас ходит ${player().name}. Ожидайте своей очереди.`);window.MondavoshkaOnline.refreshControls();return;}
 let mv=legal(pc,stepsNow());if(!mv){setStatus("Этой фишкой так сходить нельзя.");return}
 if(preview?.id!==pc.id){
   preview=mv;
   resetCellClasses();
   renderPieces();
   if(mv.rescue) setStatus("Эта шестёрка выкупит пленную фишку и вернёт её в домашнюю ячейку.");
   else if(mv.jumpTo!=null) setStatus(`После обычного хода фишка попадёт на стрелку и перейдёт на клетку назначения.`);
   else if(TRAP_ENTRY.has(mv.dest)) setStatus("Конечная клетка ведёт в ловушку «говно».");
   else if(mv.path && (pc.progress + mv.path.length)>=TRACK.length) setStatus("Этим ходом фишка завершит полный круг и войдёт во внутренний Домик.");
   else setStatus("Маршрут по часовой стрелке показан. Нажмите эту фишку ещё раз, чтобы подтвердить ход.");
   return
 }
 preview=null;await execute(pc,mv);consume();
 if(onlineActive()) window.MondavoshkaOnline.syncState();
}
async function execute(pc,mv){
 animating=true;resetCellClasses();

 if(pc.state==="captured" && mv.rescue){
   const pl=g.players[pc.owner];
   await animate(pc,[YARD[pl.id][pc.n]],420,"fly");
   pc.state="yard";
   pc.captorSide=null;
   pc.track=null;
   pc.progress=0;
   pc.trap=0;
   pc.trapSide=null;
   setStatus("Пленная фишка выкуплена и вернулась в домашнюю ячейку.");
 }

 else if(pc.state==="yard"){
   await animate(pc,[TRACK[mv.dest]],420,"walk");
   let enemy=enemyAt(mv.dest,pc.owner);
   if(enemy) await capture(enemy, player().id);
   pc.state="track";
   pc.track=mv.dest;
   pc.progress=0;
   pc.captorSide=null;
 }

 else if(pc.state==="trap"){
   const side=pc.trapSide;
   const next=pc.trap+1;

   if(next>=3){
     const exit=TRAP_META[side].exit;
     if(!ownAt(exit,pc.owner)){
       let enemy=enemyAt(exit,pc.owner);
       if(enemy) await capture(enemy, player().id);
       await animate(pc,[TRACK[exit]],520,"fly");
       pc.state="track";
       pc.track=exit;
       pc.trap=0;
       pc.trapSide=null;
       setStatus("Фишка вышла из ловушки.");
     }else{
       setStatus("Выход из ловушки занят своей фишкой.");
     }
   }else{
     const ok=await pushTrap(side,next);
     if(ok){
       await animate(pc,[TRAP[side][next]],300,"walk");
       pc.trap=next;
       setStatus("Фишки в ловушке подтолкнулись.");
     }else{
       setStatus("В ловушке продвинуться нельзя.");
     }
   }
 }

 else{
   await animate(pc,mv.path.map(i=>TRACK[i]),Math.max(220,mv.path.length*145),"walk");
   let enemy=enemyAt(mv.dest,pc.owner);
   if(enemy) await capture(enemy, player().id);
   pc.track=mv.dest;
   pc.progress+=mv.path.length;

   const homeGate=START[g.players[pc.owner].id];
   if(pc.progress>=TRACK.length){
     pc.state="home";
     pc.track=null;
     setStatus("Фишка завершила круг и вошла во внутренний Домик!");
   }
   else if(TRAP_ENTRY.has(pc.track)){
     const side=trapSideByEntry(pc.track);
     const ok=await pushTrap(side,0);
     if(ok){
       await animate(pc,[TRAP[side][0]],470,"fall");
       pc.state="trap";
       pc.trapSide=side;
       pc.track=null;
       pc.trap=0;
       setStatus("Попали в ловушку: теперь нужно 1 → 3 → 6.");
     }else{
       setStatus("Ловушка переполнена.");
     }
   }
   else if(DIAG_MAP[pc.track]){
     const jump=DIAG_MAP[pc.track];
     await animate(pc,[TRACK[jump.to]],650,"fly");
     let enemy2=enemyAt(jump.to,pc.owner);
     if(enemy2) await capture(enemy2, player().id);
     pc.track=jump.to;
     setStatus(`Переход по стрелке ${jump.label}.`);
   }
 }
 animating=false;drawBoard();
}
function animate(pc,points,dur,kind){return new Promise(res=>{let el=svg.querySelector(`[data-id="${pc.id}"]`);if(!el||!points.length){res();return}let start=pos(pc,g.players[pc.owner]);let frames=[{transform:`translate(0px,0px) scale(1)`}];points.forEach((p,i)=>{let dx=p[0]-start[0],dy=p[1]-start[1],scale=kind==="fly"&&i<points.length-1?1.25:1;frames.push({transform:`translate(${dx}px,${dy}px) scale(${scale}) rotate(${kind==="fly"?360*(i+1):0}deg)`})});let a=el.animate(frames,{duration:dur,easing:kind==="fly"?"cubic-bezier(.15,.8,.25,1)":"ease-in-out",fill:"forwards"});a.onfinish=res})}
async function capture(pc, captorSide){
  const pl=g.players[pc.owner];
  const p=pos(pc,pl);
  const el=svg.querySelector(`[data-id="${pc.id}"]`);
  if(el){
    // Удар и распад фишки на осколки.
    const shards=E("g",{class:"shards"});
    const color = pc.owner===0 ? "#df2735" : pc.owner===1 ? "#444" : pc.owner===2 ? "#0aa2b8" : "#e8e4da";
    for(let i=0;i<7;i++){
      const dx=[-10,-5,0,6,11,-8,8][i], dy=[-8,6,-1,-6,5,10,9][i];
      const poly=E("polygon",{points:`${p[0]-4+dx},${p[1]-4+dy} ${p[0]+4+dx},${p[1]-2+dy} ${p[0]+1+dx},${p[1]+5+dy}`,fill:color,stroke:"#23150d","stroke-width":1},shards);
      poly.animate([
        {transform:"translate(0px,0px) scale(1)",opacity:1},
        {transform:`translate(${dx*2.5}px,${dy*2.5}px) rotate(${(i-3)*35}deg) scale(.55)`,opacity:.0}
      ],{duration:520,easing:"ease-out",fill:"forwards"});
    }
    let a=el.animate([
      {transform:"scale(1) rotate(0deg)",opacity:1},
      {transform:"scale(1.18) rotate(-15deg)",opacity:1,offset:.25},
      {transform:"scale(.28) rotate(85deg)",opacity:.0}
    ],{duration:520,fill:"forwards"});
    await a.finished.catch(()=>{});
    setTimeout(()=>shards.remove(),600);
  }
  pc.state="captured";
  pc.captorSide=captorSide;
  pc.track=null;
  pc.progress=0;
  pc.trap=0;
  pc.trapSide=null;
}
function trapPieces(side){return allPieces().filter(p=>p.state==="trap"&&p.trapSide===side)}
function trapOcc(side,idx,except=null){return trapPieces(side).find(p=>p.trap===idx&&p.id!==except)}
async function pushTrap(side, idx){
 const occ=trapOcc(side,idx);
 if(!occ) return true;

 if(idx>=3){
   const exit=TRAP_META[side].exit;
   if(ownAt(exit,occ.owner)) return false;
   const enemy=enemyAt(exit,occ.owner);
   if(enemy) await capture(enemy, g.players[occ.owner].id);
   await animate(occ,[TRACK[exit]],420,"fly");
   occ.state="track";
   occ.track=exit;
   occ.trap=0;
   occ.trapSide=null;
   return true;
 }

 const ok=await pushTrap(side,idx+1);
 if(!ok) return false;
 await animate(occ,[TRAP[side][idx]],260,"walk");
 occ.trap=idx;
 return true;
}
function anyAt(i,except=null){for(let pl of g.players)for(let p of pl.pieces)if(p.id!==except&&p.state==="track"&&p.track===i)return p;return null}
function ownAt(i,o){return g.players[o].pieces.some(p=>p.state==="track"&&p.track===i)}
function enemyAt(i,o){for(let pl of g.players)for(let p of pl.pieces)if(p.owner!==o&&p.state==="track"&&p.track===i)return p;return null}
function consume(){
 if(g.selected==null)return;
 const usedIndex=g.selected;
 g.used[usedIndex]=true;
 g.selected=null;
 g.sum=false;
 preview=null;

 dice.forEach(b=>{
   b.disabled=true;
   b.classList.remove("active");
 });
 $("#sum").classList.remove("active");
 $("#sum").disabled=true;
 resetCellClasses();
 renderPieces();

 if(g.used.every(Boolean)){
   finishTurn();
   return;
 }

 beginOrderedDice();
}
function finishTurn(){
 if(player().pieces.every(p=>p.state==="home")){
   setStatus(`${player().name} победил! Проигравший выполняет: ${g.forfeit || "желание с колеса"}.`);
   $("#roll").disabled=true;
   yandexGameplayStop();
   return;
 }

 const extra=g.double;
 g.double=false;
 g.rolled=false;
 g.used=[false,false];
 g.selected=null;
 g.sum=false;
 preview=null;
 animating=false;
 clearDice();

 if(!extra){
   g.turn=(g.turn+1)%g.players.length;
 }

 updateUI();
 renderPieces();

 // Important: enable the next throw only AFTER every render/update operation.
 // A second tick protects against a stale disabled state in embedded browsers.
 const rollBtn=$("#roll");
 if(onlineActive()){
   rollBtn.disabled=true;
   requestAnimationFrame(()=>window.MondavoshkaOnline?.refreshControls());
 }else{
   rollBtn.disabled=false;
   requestAnimationFrame(()=>{
     if(g && !g.rolled && !animating) rollBtn.disabled=false;
   });
 }

 setStatus(extra ? "Дубль — бросайте ещё раз." : "Бросьте две кости.");
}
function clearDice(){dice.forEach(b=>{b.disabled=true;b.classList.remove("active");b.querySelector("span").removeAttribute("data-v")});$("#sum").disabled=true;$("#sum").classList.remove("active")}
function resetCellClasses(){svg.querySelectorAll(".cell").forEach(e=>e.setAttribute("class","cell"+(Object.values(START).includes(+e.dataset.cell)?" start":"")+(TRAP_ENTRY.has(+e.dataset.cell)?" trap":"")))}

function updatePenaltyCard(){
 const el=$("#penaltyText");
 if(!el) return;
 el.textContent=(g&&g.forfeit) ? g.forfeit : (selectedWish || "Определится колесом фортуны перед игрой");
}

function polar(cx,cy,r,a){
 const rad=(a-90)*Math.PI/180;
 return [cx+r*Math.cos(rad),cy+r*Math.sin(rad)];
}
function sectorPath(cx,cy,r,a0,a1){
 const p0=polar(cx,cy,r,a0), p1=polar(cx,cy,r,a1);
 const large=(a1-a0)>180?1:0;
 return `M${cx} ${cy} L${p0[0]} ${p0[1]} A${r} ${r} 0 ${large} 1 ${p1[0]} ${p1[1]} Z`;
}
function drawFortuneWheel(){
 const rotor=$("#wheelRotor");
 if(!rotor) return;
 rotor.innerHTML="";
 const palette=["#ef5350","#ff9f43","#ffd54f","#8bc34a","#22c58b","#42a5f5","#ab6bd6"];
 const short=["Завтрак","Мороженое","Онигири","Сок","Кофемашина","Кофе всем","Обед"];
 const seg=360/WISHES.length;

 WISHES.forEach((wish,i)=>{
   const a0=i*seg, a1=(i+1)*seg;
   const path=document.createElementNS(NS,"path");
   path.setAttribute("d",sectorPath(210,210,185,a0,a1));
   path.setAttribute("fill",palette[i]);
   path.setAttribute("class","wheelSector");
   rotor.appendChild(path);

   const mid=a0+seg/2;
   const [tx,ty]=polar(210,210,122,mid);
   const text=document.createElementNS(NS,"text");
   text.setAttribute("x",tx);
   text.setAttribute("y",ty+5);
   text.setAttribute("text-anchor","middle");
   text.setAttribute("class","wheelLabel");
   text.setAttribute("transform",`rotate(${mid},${tx},${ty})`);
   text.textContent=short[i];
   rotor.appendChild(text);
 });

 const list=$("#wishList");
 if(list){
   list.innerHTML="";
   WISHES.forEach((w,i)=>{
     const d=document.createElement("div");
     d.className="wishChip";
     d.textContent=`${i+1}. ${w}`;
     list.appendChild(d);
   });
 }
}

function openWheel(){
 window.MondavoshkaOnline && (window.MondavoshkaOnline.pendingStart=false);
 yandexGameplayStop();
 startMusic();
 pendingPlayerCount=Number($("#count").value)||4;
 selectedWish=null;
 $("#localModal").classList.remove("show");
 $("#wheelModal").classList.add("show");
 $("#wheelResult").textContent="Нажмите «Крутить колесо»";
 $("#spinWheel").disabled=false;
 $("#beginGame").disabled=true;
 wheelRotation=0;
 const rotor=$("#wheelRotor");
 if(rotor) rotor.style.transform="rotate(0deg)";
 drawFortuneWheel();
}

function openOnlineWheel(n){
 if(!window.MondavoshkaOnline?.active)return;
 window.MondavoshkaOnline.pendingStart=true;
 yandexGameplayStop();
 startMusic();
 pendingPlayerCount=n;
 selectedWish=null;
 closeGameMenus();
 $("#wheelModal").classList.add("show");
 $("#wheelResult").textContent="Нажмите «Крутить колесо»";
 $("#spinWheel").disabled=false;
 $("#beginGame").disabled=true;
 wheelRotation=0;
 const rotor=$("#wheelRotor");
 if(rotor) rotor.style.transform="rotate(0deg)";
 drawFortuneWheel();
}

function spinFortune(){
 const btn=$("#spinWheel");
 if(btn.disabled) return;
 btn.disabled=true;
 $("#beginGame").disabled=true;

 const chosen=Math.floor(Math.random()*WISHES.length);
 const seg=360/WISHES.length;
 // Центр выбранного сектора ставим точно под верхний указатель.
 const landing=-(chosen+0.5)*seg;
 wheelRotation += 360*7 + landing - (wheelRotation%360);
 const rotor=$("#wheelRotor");
 rotor.style.transform=`rotate(${wheelRotation}deg)`;

 $("#wheelResult").textContent="Колесо крутится…";
 setTimeout(()=>{
   selectedWish=WISHES[chosen];
   $("#wheelResult").textContent=`Проигравший выполняет: ${selectedWish}`;
   $("#beginGame").disabled=false;
   btn.disabled=false;
   updatePenaltyCard();
 },4700);
}

function ensureAudio(){
 if(!audioCtx){
   const AC=window.AudioContext||window.webkitAudioContext;
   if(!AC) return null;
   audioCtx=new AC();
 }
 if(audioCtx.state==="suspended") audioCtx.resume();
 return audioCtx;
}
function pluck(freq,duration=.55,volume=.035,type="triangle"){
 const ctx=ensureAudio(); if(!ctx) return;
 const now=ctx.currentTime;
 const osc=ctx.createOscillator();
 const gain=ctx.createGain();
 const filter=ctx.createBiquadFilter();
 osc.type=type;
 osc.frequency.setValueAtTime(freq,now);
 filter.type="lowpass";
 filter.frequency.setValueAtTime(1500,now);
 gain.gain.setValueAtTime(.0001,now);
 gain.gain.exponentialRampToValueAtTime(volume,now+.015);
 gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
 osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
 osc.start(now); osc.stop(now+duration+.05);
}
function drone(freq,duration=2.4){
 const ctx=ensureAudio(); if(!ctx) return;
 const now=ctx.currentTime;
 const osc=ctx.createOscillator();
 const gain=ctx.createGain();
 osc.type="sine"; osc.frequency.value=freq;
 gain.gain.setValueAtTime(.0001,now);
 gain.gain.linearRampToValueAtTime(.018,now+.25);
 gain.gain.linearRampToValueAtTime(.0001,now+duration);
 osc.connect(gain); gain.connect(ctx.destination);
 osc.start(now); osc.stop(now+duration+.05);
}
function musicTick(){
 if(!musicEnabled) return;
 const root=146.83; // D3
 const seq=[0,4,2,5,1,4,6,3,0,5,2,4,1,6,4,2];
 const degree=MEDIEVAL_SCALE[seq[musicStep%seq.length]%MEDIEVAL_SCALE.length];
 const freq=root*Math.pow(2,degree/12);
 pluck(freq,.58,.032,musicStep%4===0?"triangle":"sine");
 if(musicStep%2===1) pluck(freq*2,.34,.012,"triangle");
 if(musicStep%8===0) drone(root/2,3.0);
 musicStep++;
}
function startMusic(){
 if(!musicEnabled)return;
 try{
   const ctx=ensureAudio();
   if(!ctx){updateMusicButton();return;}
   if(musicTimer)return;
   musicTick();
   musicTimer=setInterval(()=>{try{musicTick()}catch(e){}},620);
 }catch(e){}
 updateMusicButton();
}
function stopMusic(){
 if(musicTimer){clearInterval(musicTimer);musicTimer=null;}
 if(audioCtx&&audioCtx.state==="running") audioCtx.suspend();
 updateMusicButton();
}
function toggleMusic(){
 musicEnabled=!musicEnabled;
 if(musicEnabled) startMusic(); else stopMusic();
 updateMusicButton();
}
function updateMusicButton(){
 const b=$("#musicToggle");
 if(b) b.textContent=musicEnabled ? "♫ Музыка: вкл" : "♫ Музыка: выкл";
}


function unlockMusicOnce(){
 if(!musicEnabled)return;
 startMusic();
 document.removeEventListener("pointerdown",unlockMusicOnce);
 document.removeEventListener("keydown",unlockMusicOnce);
}
document.addEventListener("pointerdown",unlockMusicOnce,{once:false});
document.addEventListener("keydown",unlockMusicOnce,{once:false});

function updateUI(){
 let p=player();
 $("#player").textContent=p.name;
 $("#player").style.color=p.id==="red"?"#c51c29":p.id==="blue"?"#007e92":p.id==="black"?"#111":"#164b8c";
 const order=$("#turnOrder");
 if(order) order.textContent=g.players.map(x=>x.name).join(" → ")+" → "+g.players[0].name;
}
function setStatus(s){$("#status").textContent=s}
function closeGameMenus(){
  ["#mainMenu","#localModal","#onlineCreateModal","#onlineJoinModal","#onlineLobbyModal","#wheelModal"].forEach(sel=>{
    const el=$(sel); if(el) el.classList.remove("show");
  });
}
function showMainMenu(){
  yandexGameplayStop();
  if(window.MondavoshkaOnline?.active) window.MondavoshkaOnline.leave(false);
  closeGameMenus();
  $("#mainMenu").classList.add("show");
  selectedWish=null;
  updatePenaltyCard();
}

$("#playLocal").onclick=()=>{
  closeGameMenus();
  $("#localModal").classList.add("show");
};
$("#createOnline").onclick=()=>{
  closeGameMenus();
  $("#onlineCreateModal").classList.add("show");
};
$("#joinOnline").onclick=()=>{
  closeGameMenus();
  $("#onlineJoinModal").classList.add("show");
};
document.querySelectorAll(".backToMenu").forEach(b=>b.onclick=showMainMenu);

$("#start").onclick=openWheel;
$("#spinWheel").onclick=spinFortune;
$("#beginGame").onclick=()=>{
 if(window.MondavoshkaOnline?.active && window.MondavoshkaOnline.pendingStart) window.MondavoshkaOnline.startGame(selectedWish);
 else newGame(pendingPlayerCount,selectedWish);
};
$("#musicToggle").onclick=toggleMusic;
$("#newGame").onclick=showMainMenu;
$("#roll").onclick=roll;
dice.forEach((b,i)=>b.onclick=()=>selectDie(i));
$("#sum").onclick=selectSum;
drawFortuneWheel();
updateMusicButton();
drawBoard();


document.addEventListener("visibilitychange",()=>{
  if(document.hidden){
    yandexGameplayStop();
  }else if(g && !$("#mainMenu").classList.contains("show") && !$("#localModal").classList.contains("show") && !$("#onlineCreateModal").classList.contains("show") && !$("#onlineJoinModal").classList.contains("show") && !$("#onlineLobbyModal").classList.contains("show") && !$("#wheelModal").classList.contains("show")){
    yandexGameplayStart();
  }
});

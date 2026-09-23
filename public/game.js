
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
// Угловая клетка защищает стоящую на ней фишку: сбить её можно только кушем (дублем).
const CORNERS=new Set([0,12,24,36]);
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
let botTimer=null;
let botThinking=false;
function isBotSeat(seat=g?.turn){
 return !!g && (!!g.botSeats?.includes(seat) || g.autoBotSeat===seat);
}
function isBotTurn(){return !!g && isBotSeat(g.turn)}
function canControlBot(){return !onlineActive() || !!window.MondavoshkaOnline?.isBotController?.()}
function cancelBotTimer(){
  if(botTimer){clearTimeout(botTimer);botTimer=null;}
  botThinking=false;
}
function onlineActive(){return gameMode==="online" && !!window.MondavoshkaOnline?.active}
function onlineCanAct(){return !onlineActive() || window.MondavoshkaOnline.canAct()}

function seatStroke(id){
 return id==="red"?"#a91321":id==="blue"?"#00677b":id==="black"?"#050505":"#174f8f";
}
function pieceSkin(pl){
 const id=pl?.skinId||"default";
 return window.MondavoshkaProfile?.skinVisual?.(id)||{color:null,name:"Классика"};
}

function drawCountrySkin(grp,p,skin){
 const f=skin?.flag;
 if(!f)return;

 const x=p[0],y=p[1];
 const line=(x1,y1,x2,y2,color,w=8,opacity=1)=>
   E("path",{d:`M${x1} ${y1} L${x2} ${y2}`,stroke:color,"stroke-width":w,
             "stroke-linecap":"butt",opacity},grp);

 if(f==="RU"){
   line(x-16,y-1,x+16,y-1,"#2456c7",9);
   line(x-16,y+8,x+16,y+8,"#d52b1e",9);
 }else if(f==="BR"){
   E("path",{d:`M${x} ${y-14} L${x+15} ${y} L${x} ${y+14} L${x-15} ${y} Z`,fill:"#f7d117"},grp);
   E("circle",{cx:x,cy:y,r:7,fill:"#2448a5"},grp);
 }else if(f==="AR"){
   line(x-16,y,x+16,y,"#fff",10);
   E("circle",{cx:x,cy:y,r:3.2,fill:"#e0ad25"},grp);
 }else if(f==="FR"){
   line(x,y-16,x,y+16,"#fff",11);
   line(x+10,y-16,x+10,y+16,"#e52b3a",10);
 }else if(f==="DE"){
   line(x-16,y,x+16,y,"#d82431",10);
   line(x-16,y+10,x+16,y+10,"#f0c223",10);
 }else if(f==="ES"){
   line(x-16,y,x+16,y,"#f2c72b",16);
 }else if(f==="IT"){
   line(x,y-16,x,y+16,"#fff",11);
   line(x+10,y-16,x+10,y+16,"#d72b36",10);
 }else if(f==="JP"){
   E("circle",{cx:x,cy:y,r:8,fill:"#c91f37"},grp);
 }else if(f==="KR"){
   E("path",{d:`M${x-7} ${y} A7 7 0 0 1 ${x+7} ${y} A7 7 0 0 1 ${x-7} ${y}`,fill:"#d52c3a"},grp);
   E("path",{d:`M${x-7} ${y} A7 7 0 0 0 ${x+7} ${y} A7 7 0 0 0 ${x-7} ${y}`,fill:"#2056a5"},grp);
   line(x-13,y-10,x-7,y-13,"#202020",2.2);
   line(x+8,y+11,x+14,y+8,"#202020",2.2);
 }else if(f==="US"){
   for(let yy=-12;yy<=12;yy+=6)line(x-16,y+yy,x+16,y+yy,"#c72c3b",3.2);
   E("rect",{x:x-16,y:y-15,width:13,height:11,rx:1,fill:"#23458e"},grp);
   E("circle",{cx:x-11,cy:y-10,r:1.2,fill:"#fff"},grp);
   E("circle",{cx:x-6,cy:y-10,r:1.2,fill:"#fff"},grp);
 }else if(f==="KZ"){
   E("circle",{cx:x,cy:y-1,r:6,fill:"#f1c52e"},grp);
   line(x,y+6,x,y+14,"#f1c52e",3);
   line(x-5,y+8,x-9,y+13,"#f1c52e",2);
   line(x+5,y+8,x+9,y+13,"#f1c52e",2);
 }else if(f==="CN"){
   let t=E("text",{x:x-7,y:y+6,fill:"#f4cd32","font-size":18,"font-weight":900,"text-anchor":"middle"},grp);
   t.textContent="★";
 }
}
function nextActiveSeat(from){
 if(!g?.players?.length)return 0;
 for(let k=1;k<=g.players.length;k++){
   const s=(from+k)%g.players.length;
   if(!g.players[s]?.eliminated)return s;
 }
 return from;
}

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
let pendingLocalFillBots=false;
let pendingLocalHumanCount=4;
function shuffled(arr){
 const a=[...arr];
 for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
 return a;
}

// Оригинальная процедурная средневековая музыка — без внешних аудиофайлов.
let audioCtx=null;
let musicTimer=null;
let musicEnabled=true;
let sfxEnabled=true;
let musicStep=0;
const MEDIEVAL_SCALE=[0,2,3,5,7,9,10,12]; // дорийский лад

function E(t,a={},p=svg){let e=document.createElementNS(NS,t);for(const[k,v]of Object.entries(a))e.setAttribute(k,v);p.appendChild(e);return e}

function svgClientPoint(ev){
  try{
    const pt=svg.createSVGPoint();
    pt.x=ev.clientX;pt.y=ev.clientY;
    const matrix=svg.getScreenCTM();
    return matrix?pt.matrixTransform(matrix.inverse()):null;
  }catch{return null}
}
function mobileSelectablePieces(){
  if(!g)return[];
  if(g.tripleKushPending)return tripleKushEligible(g.turn);
  const steps=stepsNow();
  if(steps==null)return[];
  return player().pieces.filter(pc=>legal(pc,steps,false,!!g.trapOnlySelection));
}
function nearestSelectablePiece(point,maxDist=70){
  if(!point||!g)return null;
  let best=null,bestD=Infinity;
  for(const pc of mobileSelectablePieces()){
    const p=pos(pc,g.players[pc.owner]);
    const d=Math.hypot(point.x-p[0],point.y-p[1]);
    if(d<bestD&&d<=maxDist){best=pc;bestD=d}
  }
  return best;
}
function installMobileBoardTapAssist(){
  if(svg.dataset.mobileTapAssist==="1")return;
  svg.dataset.mobileTapAssist="1";
  svg.addEventListener("click",(ev)=>{
    if(ev.target?.closest?.(".piece"))return;
    if(!g||animating)return;
    if(onlineActive()&&!onlineCanAct())return;
    const pc=nearestSelectablePiece(svgClientPoint(ev));
    if(pc)pieceClick(pc);
  });
}

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
 renderSeatBadges();
}function player(){return g.players[g.turn]}
function playerLabel(pl){
 if(!pl)return "Игрок";
 if(pl.playerName)return `${pl.playerName} — ${pl.name}`;
 return pl.name;
}

function seatBadgeId(colorId){
 return colorId==="blue"?"#seatBadgeTop":
        colorId==="whiteblue"?"#seatBadgeRight":
        colorId==="red"?"#seatBadgeBottom":
        "#seatBadgeLeft";
}
function renderSeatBadges(){
 const ids=["#seatBadgeTop","#seatBadgeRight","#seatBadgeBottom","#seatBadgeLeft"];
 ids.forEach(id=>{
   const e=$(id);
   if(e){e.hidden=true;e.replaceChildren();}
 });
 if(!g?.players?.length)return;

 const onlineSeat=onlineActive()?window.MondavoshkaOnline?.seat:null;
 for(const pl of g.players){
   const el=$(seatBadgeId(pl.id));
   if(!el)continue;

   const isMe=(Number.isInteger(onlineSeat)&&onlineSeat===pl.owner)||pl.playerName==="Вы";
   el.hidden=false;
   el.classList.toggle("isMe",!!isMe);

   const dot=document.createElement("i");
   dot.className=`seatColor seatColor-${pl.id}`;

   const name=document.createElement("span");
   name.textContent=pl.playerName||pl.name||`Игрок ${pl.owner+1}`;

   const color=document.createElement("small");
   color.textContent=pl.name;

   el.append(dot,name,color);

   if(isMe){
     const you=document.createElement("b");
     you.textContent="ВЫ";
     el.appendChild(you);
   }
 }
}
function buildGameState(n,wish=selectedWish){
 const colorSet=n===2?[C[0],C[2]]:n===3?[C[0],C[1],C[2]]:C.slice(0,4);
 return {
   players:colorSet.map((c,owner)=>({...c,owner,skinId:"default",profileId:null,eliminated:false,pieces:Array.from({length:5},(_,i)=>({
     id:c.id+i,owner,n:i,state:"yard",track:null,progress:0,lapComplete:false,homeIndex:null,
     trap:0,trapSide:null,captorSide:null
   }))})),
   turn:0,d:[1,1],used:[false,false],selected:null,sum:false,rolled:false,double:false,
   trapOnlySelection:false,
   forcedSix:false,
   resumeStack:[],
   pendingGiftSeat:null,

   // Три куша подряд: отдельный счётчик для текущего игрока.
   // Переданная за пленника шестёрка сюда не относится.
   doubleStreak:0,
   doubleStreakSeat:null,
   tripleKushPending:false,

   forfeit:wish
 };
}

function activateGameState(state,mode="local",statusText="Бросьте две кости."){
 yandexGameplayStart();
 gameMode=mode;
 const exitBtn=$("#exitGame");if(exitBtn)exitBtn.hidden=false;
 g=JSON.parse(JSON.stringify(state));
 closeGameMenus();
 clearDice();
 preview=null;
 animating=false;
 setStatus(statusText);
 drawBoard();
installMobileBoardTapAssist();
 updateUI();
 updatePenaltyCard();
 startMusic();
 if(onlineActive()) window.MondavoshkaOnline.refreshControls();
 else $("#roll").disabled=isBotTurn();
 if(isBotTurn()&&canControlBot())scheduleBotRoll(850);
}
function buildLocalMixedState(humanCount=4,fillBots=false,wish=selectedWish){
 const humans=Math.max(2,Math.min(4,Number(humanCount)||4));
 const total=fillBots&&humans<4?4:humans;
 const state=buildGameState(total,wish);
 const identities=[];
 for(let i=0;i<humans;i++)identities.push({name:`Игрок ${i+1}`,bot:false,skinId:i===0?(window.MondavoshkaProfile?.equippedSkin||"default"):"default"});
 for(let i=humans;i<total;i++)identities.push({name:`Компьютер ${i-humans+1}`,bot:true,skinId:"default"});
 const draw=shuffled(identities);
 state.botSeats=[];
 state.players.forEach((pl,seat)=>{const id=draw[seat];pl.playerName=id.name;pl.bot=id.bot;pl.skinId=id.skinId;if(id.bot)state.botSeats.push(seat)});
 return state;
}
function newGame(n,wish=selectedWish,fillBots=false){
 cancelBotTimer();
 const state=buildLocalMixedState(n,fillBots,wish);
 activateGameState(state,state.botSeats.length?"mixed":"local",`Жребий цветов проведён. Первым ходит ${playerLabel(state.players[0])}.`);
}
function buildBotGameState(botCount=1){
 const count=Math.max(1,Math.min(3,Number(botCount)||1));
 const state=buildGameState(count+1,null);
 const identities=[{name:"Вы",bot:false,skinId:window.MondavoshkaProfile?.equippedSkin||"default"}];
 for(let i=0;i<count;i++)identities.push({name:`Компьютер ${i+1}`,bot:true,skinId:"default"});
 const draw=shuffled(identities);state.botSeats=[];
 state.players.forEach((pl,seat)=>{const id=draw[seat];pl.playerName=id.name;pl.bot=id.bot;pl.skinId=id.skinId;if(id.bot)state.botSeats.push(seat)});
 return state;
}
function startBotGame(botCount=1){
 cancelBotTimer();selectedWish=null;
 const state=buildBotGameState(botCount);
 activateGameState(state,"bot",`Жребий цветов проведён. Первым ходит ${playerLabel(state.players[0])}.`);
 updatePenaltyCard();
}
function startOnlineGameState(state,statusText="Онлайн-партия началась."){
 activateGameState(state,"online",statusText);
}
function restoreDiceFromState(){
 if(!g)return;
 if(!g.rolled){clearDice();return;}
 dice.forEach((b,i)=>{
   const v=Number(g.d[i]);
   b.querySelector("span").dataset.v=String(v>=1&&v<=6?v:1);
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
function samePoint(a,b,eps=.7){
 return !!a&&!!b&&Math.abs(a[0]-b[0])<=eps&&Math.abs(a[1]-b[1])<=eps;
}
function isTrackPoint(p){
 return TRACK.some(t=>samePoint(t,p));
}
function expandTrackWalkPoints(pc,points){
 if(!pc||pc.state!=="track"||!Array.isArray(points)||!points.length)return points||[];
 const out=[];
 let prev=pos(pc,g.players[pc.owner]);

 for(const target of points){
   if(isTrackPoint(prev)&&isTrackPoint(target)){
     const dx=Math.abs(target[0]-prev[0]),dy=Math.abs(target[1]-prev[1]);
     if(dx>.7&&dy>.7){
       const c1=[target[0],prev[1]];
       const c2=[prev[0],target[1]];
       const c1Track=isTrackPoint(c1),c2Track=isTrackPoint(c2);
       if(c1Track&&!samePoint(c1,prev)&&!samePoint(c1,target))out.push(c1);
       else if(c2Track&&!samePoint(c2,prev)&&!samePoint(c2,target))out.push(c2);
     }
   }
   out.push(target);
   prev=target;
 }
 return out;
}
function walkPreviewCoords(previewMove){
 if(!previewMove)return[];
 const pc=allPieces().find(p=>p.id===previewMove.id);
 return pc?expandTrackWalkPoints(pc,previewMove.routeCoords||[]):(previewMove.routeCoords||[]);
}

function renderPieces(){
 if(!g)return;
 renderSeatBadges();
 updateTripleKushCard();
 svg.querySelectorAll(".piece,.route,.shards").forEach(e=>e.remove());
 if(preview){
   const coords=walkPreviewCoords(preview);
   if(coords.length){
     const pc=allPieces().find(p=>p.id===preview.id);
     const start=pc?pos(pc,g.players[pc.owner]):null;
     const shown=start?[start,...coords]:coords;
     let pts=shown.map(p=>p.join(",")).join(" ");
     E("polyline",{points:pts,class:"route"});
   }
   (preview.path||[]).forEach(i=>svg.querySelector(`[data-cell="${i}"]`)?.classList.add("path"));
   if(preview.dest!=null)svg.querySelector(`[data-cell="${preview.dest}"]`)?.classList.add("dest");
   if(preview.jumpTo!=null)svg.querySelector(`[data-cell="${preview.jumpTo}"]`)?.classList.add("jumpdest");
 }
 let legalIds=g?.tripleKushPending
   ? new Set(tripleKushEligible(g.turn).map(x=>x.id))
   : new Set(currentLegal().map(x=>x.id));
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

  // Пленный сохраняет СВОЙ цвет. Так сразу видно, чья именно фишка сидит в плену.
  const skin=pieceSkin(pl);
  const grad = pl.id==="red"?"url(#redPiece)":pl.id==="blue"?"url(#bluePiece)":pl.id==="black"?"url(#blackPiece)":"url(#whitePiece)";
  const fill=skin.color||grad;
  E("circle",{cx:p[0],cy:p[1],r:21,fill,stroke:pc.state==="captured"?"#9b5b20":seatStroke(pl.id),"stroke-width":pc.state==="captured"?5:4,filter:"url(#pieceShadow)"},grp);
  if(skin.stripe){
    E("path",{d:`M${p[0]-15} ${p[1]-9} H${p[0]+15} M${p[0]-15} ${p[1]+2} H${p[0]+15}`,stroke:skin.stripe,"stroke-width":5,opacity:.9},grp);
  }
  drawCountrySkin(grp,p,skin);
  if(pl.id==="whiteblue"&&!skin.color){
    E("path",{d:`M${p[0]-15} ${p[1]}h30 M${p[0]} ${p[1]-15}v30`,stroke:"#164b8c","stroke-width":8,"stroke-linecap":"round"},grp);
  }
  if(pc.state==="captured"){
    // Две решётки поверх родного цвета — признак пленника, не перекрашиваем его в коричневый.
    E("path",{d:`M${p[0]-12} ${p[1]-16} L${p[0]-2} ${p[1]+16} M${p[0]+2} ${p[1]-16} L${p[0]+12} ${p[1]+16}`,stroke:"#6a3516","stroke-width":3.4,"stroke-linecap":"round",opacity:.9},grp);
  }
  E("ellipse",{cx:p[0]-6,cy:p[1]-8,rx:7,ry:4,fill:"#fff",opacity:.28},grp);
  grp.addEventListener("click",(ev)=>{
    ev.stopPropagation();
    pieceClick(pc);
  });
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
  if(pc.state==="home") return HOME[pl.id][Math.max(0,Math.min(4,Number(pc.homeIndex)||0))];
  return TRACK[pc.track];
}

function roll(){
 if(animating||!g||g.rolled)return;
 if(isBotTurn()){
   setStatus(`Компьютер (${player().name}) сейчас ходит.`);
   return;
 }
 if(onlineActive()){
   if(!onlineCanAct()){
     setStatus(`Сейчас ходит ${playerLabel(player())}. Ожидайте своей очереди.`);
     window.MondavoshkaOnline.refreshControls();
     return;
   }
   window.MondavoshkaOnline.requestRoll();
   return;
 }
 const r=[1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)];
 applyRollValues(r,false);
}
function applyRollValues(r,fromNetwork=false,networkMeta=null){
 if(animating||!g||g.rolled)return;
 animating=true;
 $("#roll").disabled=true;
 sfxDiceRoll();
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
   g.d=[0,1].map(i=>{const v=Number(r[i]);return v>=1&&v<=6?Math.floor(v):1;});
   g.used=[false,false];
   g.rolled=true;
   g.double=g.d[0]===g.d[1];
   g.sum=false;
   g.selected=null;
   if(fromNetwork)applyServerKushMeta(networkMeta||{});
   else registerDoubleStreak();
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

 if(g.tripleKushPending){
   dice.forEach(b=>b.disabled=true);
   g.selected=null;
   g.trapOnlySelection=false;
   preview=null;
   resetCellClasses();
   renderPieces();
   setStatus("🔥 ТРИ КУША ПОДРЯД! СНАЧАЛА выберите одну зелёную фишку — она сразу отправится в Домик. После выбора вы разыграете третий куш обычным способом.");
   if(isBotTurn()&&canControlBot())scheduleTripleKushBonus();
   return;
 }

 g.trapOnlySelection=false;

 const unused=[0,1].filter(i=>!g.used[i]);
 if(!unused.length){finishTurn();return;}

 // Переданная за выкуп шестёрка — это один отдельный ход.
 if(g.forcedSix){
   const i=unused[0];
   const moves=legalMovesForValue(g.d[i],false);
   if(!moves.length){
     g.used[i]=true;
     setStatus(`${player().name}: переданной шестёркой сходить нельзя. Право хода возвращается.`);
     finishTurn();
     return;
   }
   dice.forEach((b,j)=>b.disabled=j!==i);
   selectDie(i);
   setStatus(`${player().name} получает шестёрку за выкуп пленника. Сделайте один ход на 6.`);
   return;
 }

 if(unused.length===1){
   const i=unused[0], value=g.d[i];
   const moves=legalMovesForValue(value,false);
   if(!moves.length){g.used[i]=true;finishTurn();return;}
   dice.forEach((b,j)=>b.disabled=j!==i);
   selectDie(i);
   setStatus(`Теперь ходим второй костью: ${value}.`);
   return;
 }

 // Дубль: обе кости одинаковы, поэтому порядок между ними значения не имеет.
 if(g.d[0]===g.d[1]){
   const i=0;
   const moves=legalMovesForValue(g.d[i],false);
   if(!moves.length){g.used=[true,true];finishTurn();return;}
   dice[0].disabled=false; dice[1].disabled=true;
   selectDie(0);
   setStatus(`Куш ${g.d[0]}:${g.d[1]}. Сыграйте первую ${g.d[0]}. Угловые фишки соперника можно сбивать.`);
   return;
 }

 const highIndex=g.d[0]>g.d[1]?0:1;
 const lowIndex=highIndex===0?1:0;
 const high=g.d[highIndex], low=g.d[lowIndex];
 const highMoves=legalMovesForValue(high,false);
 const lowTrapMoves=legalMovesForValue(low,true);

 dice.forEach(b=>b.disabled=true);

 if(highMoves.length){
   dice[highIndex].disabled=false;
   // Исключение: меньшую кость разрешаем выбрать первой ТОЛЬКО для движения внутри ловушки.
   if(lowTrapMoves.length)dice[lowIndex].disabled=false;
   selectDie(highIndex);
   setStatus(lowTrapMoves.length
     ? `Выпало ${g.d[0]} и ${g.d[1]}. Обычно сначала ${high}. Но в ловушке можно сначала выбрать ${low}.`
     : `Выпало ${g.d[0]} и ${g.d[1]}. Сначала ходим на ${high}, затем на ${low}.`);
   return;
 }

 // Если большая сейчас не играет, но меньшая может двигать фишку в ловушке —
 // меньшую играем первой и потом заново проверяем большую.
 if(lowTrapMoves.length){
   dice[lowIndex].disabled=false;
   selectDie(lowIndex);
   setStatus(`Большая ${high} сейчас не играет. В ловушке можно сначала сходить на ${low}.`);
   return;
 }

 // Обычное правило: если большой сходить невозможно, она пропускается и проверяется меньшая.
 g.used[highIndex]=true;
 const lowMoves=legalMovesForValue(low,false);
 if(lowMoves.length){
   dice[lowIndex].disabled=false;
   selectDie(lowIndex);
   setStatus(`Большей костью ${high} сходить нельзя. Она пропускается. Ходим на ${low}.`);
   return;
 }
 g.used[lowIndex]=true;
 const oldName=player().name;
 finishTurn();
 if(g && !g.rolled)setStatus(`${oldName}: этими костями ходов нет. Ход передан игроку ${player().name}. Бросайте кости.`);
}

function selectDie(i){
 if(!g.rolled||g.used[i]||animating||dice[i].disabled)return;

 g.trapOnlySelection=false;
 const unused=[0,1].filter(j=>!g.used[j]);
 if(!g.forcedSix && unused.length===2 && g.d[0]!==g.d[1]){
   const highIndex=g.d[0]>g.d[1]?0:1;
   if(i!==highIndex){
     // Меньшая раньше большей разрешена только если этой костью реально можно двигать фишку ВНУТРИ ловушки.
     const trapMoves=legalMovesForValue(g.d[i],true);
     if(!trapMoves.length){
       setStatus(`Сначала нужно использовать большую кость ${g.d[highIndex]}. Исключение действует только внутри ловушки.`);
       return;
     }
     g.trapOnlySelection=true;
   }
 }

 g.selected=i;
 g.sum=false;
 preview=null;
 dice.forEach((b,j)=>b.classList.toggle("active",i===j));
 $("#sum").classList.remove("active");
 const moves=currentLegal();
 if(!moves.length)setStatus(`Кость ${g.d[i]} сейчас не даёт допустимого хода.`);
 else if(g.trapOnlySelection)setStatus(`Ходим на ${g.d[i]} внутри ловушки. Выберите зелёную фишку в ловушке.`);
 else setStatus(`Ходим на ${g.d[i]}. Зелёным подсвечены допустимые фишки.`);
 resetCellClasses();
 renderPieces();
 if(isBotTurn())scheduleBotMove();
}

function selectSum(){
 setStatus("В этой версии игры ход суммой отключён. Нужно сходить сначала одной костью, потом второй — как в правилах Мондавошки.");
}
function stepsNow(){return g.selected==null?null:g.d[g.selected]}
function isKush(){return !!(g&&g.rolled&&g.d[0]===g.d[1]&&!g.forcedSix)}
function homeOcc(owner,idx,except=null){
 return g.players[owner].pieces.find(p=>p.id!==except&&p.state==="home"&&Number(p.homeIndex)===idx)||null;
}
function canCaptureAt(idx,owner){
 const enemy=enemyAt(idx,owner);
 if(!enemy)return true;
 return !CORNERS.has(idx)||isKush();
}
function canPushTrap(side,idx){
 const occ=trapOcc(side,idx);
 if(!occ)return true;
 const next=idx+1;
 if(next>=3){
   const exit=TRAP_META[side].exit;
   return !ownAt(exit,occ.owner);
 }
 return canPushTrap(side,next);
}
function legalMovesForValue(value,trapOnly=false){
 if(!g||value==null)return[];
 return player().pieces.map(p=>legal(p,value,false,trapOnly)).filter(Boolean);
}

function legal(pc,steps,sourceSum=g.sum,trapOnly=false){
 if(steps==null||pc.owner!==g.turn) return null;
 if(trapOnly && pc.state!=="trap") return null;
 const pl=player();

 // Пленную фишку шестёрка выкупает. Сама шестёрка затем передаётся тому игроку, у кого был пленник.
 if(pc.state==="captured"){
   // Шестёрка, переданная за выкуп пленника, НЕ может выкупать другого пленника.
   // Ею можно вывести фишку из базы, выйти из ловушки или сделать обычный ход.
   if(g.forcedSix||trapOnly||sourceSum||steps!==6) return null;
   return {id:pc.id,rescue:true,path:[],routeCoords:[],dest:null};
 }

 if(pc.state==="yard"){
   if(trapOnly||sourceSum||steps!==6) return null;
   const s=START[pl.id];
   if(ownAt(s,pc.owner)) return null;
   if(!canCaptureAt(s,pc.owner)) return null;
   return {id:pc.id,path:[s],route:[{kind:"track",index:s}],routeCoords:[TRACK[s]],dest:s,finalKind:"track",exit:true};
 }

 if(pc.state==="trap"){
   if(sourceSum||steps!==NEED[pc.trap]) return null;
   const next=pc.trap+1;
   if(next<3 && !canPushTrap(pc.trapSide,next))return null;
   if(next>=3){
     const exit=TRAP_META[pc.trapSide].exit;
     if(ownAt(exit,pc.owner))return null;
     if(!canCaptureAt(exit,pc.owner))return null;
   }
   return {id:pc.id,path:[],routeCoords:[],dest:null,trap:true};
 }

 // Внутренняя дорожка Домика: движение идёт по клеткам, без прыжков через свои фишки.
 if(pc.state==="home"){
   if(trapOnly)return null;
   const from=Number(pc.homeIndex);
   if(!Number.isInteger(from))return null;
   const to=from+steps;
   if(to>4)return null;
   const homePath=[];
   for(let h=from+1;h<=to;h++){
     if(homeOcc(pc.owner,h,pc.id))return null;
     homePath.push(h);
   }
   return {id:pc.id,homeMove:true,path:[],homePath,route:homePath.map(index=>({kind:"home",index})),routeCoords:homePath.map(index=>HOME[pl.id][index]),destHome:to,finalKind:"home"};
 }

 if(pc.state!=="track"||trapOnly)return null;

 // Маршрут строится ПОШАГОВО.
 // Для завершённого круга используется отдельный флаг lapComplete.
 // Поэтому фишка после первого полного круга больше не может случайно уйти на второй.
 const route=[];
 let track=pc.track;
 let progress=Math.max(0,Number(pc.progress)||0);
 let lapComplete = pc.lapComplete===true ||
   (pc.lapComplete==null && track===START[pl.id] && progress>=TRACK.length);
 let inHome=false;
 let homeIndex=-1;

 for(let k=1;k<=steps;k++){
   if(!inHome){
     // Фишка уже завершила круг и стоит на собственной БАЗЕ.
     // Следующий шаг после БАЗЫ обязательно идёт в первую клетку Домика.
     if(track===START[pl.id] && lapComplete){
       inHome=true;
       homeIndex=0;
       if(homeOcc(pc.owner,0,pc.id))return null;
       route.push({kind:"home",index:0});
       continue;
     }

     const next=(track-1+TRACK.length)%TRACK.length;
     track=next;
     progress++;

     // Фиксируем момент возврата на собственную БАЗУ.
     // Если кубик закончился на этой клетке — фишка остаётся на БАЗЕ.
     if(track===START[pl.id])lapComplete=true;

     route.push({kind:"track",index:track});
   }else{
     homeIndex++;
     if(homeIndex>4)return null;
     if(homeOcc(pc.owner,homeIndex,pc.id))return null;
     route.push({kind:"home",index:homeIndex});
   }
 }

 // Через любую фишку на внешней дороге перепрыгивать нельзя.
 for(let i=0;i<route.length-1;i++){
   const t=route[i];
   if(t.kind==="track"&&anyAt(t.index,pc.id))return null;
 }

 const last=route.at(-1);
 const path=route.filter(t=>t.kind==="track").map(t=>t.index);
 const homePath=route.filter(t=>t.kind==="home").map(t=>t.index);
 const routeCoords=route.map(t=>t.kind==="track"?TRACK[t.index]:HOME[pl.id][t.index]);

 if(last.kind==="home"){
   return {id:pc.id,path,homePath,route,routeCoords,dest:null,destHome:last.index,finalKind:"home",lapCompleteFinal:true};
 }

 const dest=last.index;
 if(ownAt(dest,pc.owner))return null;
 if(!canCaptureAt(dest,pc.owner))return null;

 // В ловушку можно войти только если цепочка реально может протолкнуться.
 if(TRAP_ENTRY.has(dest)){
   const side=trapSideByEntry(dest);
   if(!canPushTrap(side,0))return null;
 }

 const jump=DIAG_MAP[dest];
 if(jump){
   if(ownAt(jump.to,pc.owner))return null;
   if(!canCaptureAt(jump.to,pc.owner))return null;
 }
 return {id:pc.id,path,homePath,route,routeCoords,dest,jumpTo:jump?jump.to:null,finalKind:"track",lapCompleteFinal:lapComplete};
}

function currentLegal(){
 let s=stepsNow();
 if(s==null)return[];
 return player().pieces.map(p=>legal(p,s,false,!!g.trapOnlySelection)).filter(Boolean);
}

function tripleKushHomeCount(owner=g?.turn){
 if(!g?.players?.[owner])return 0;
 return g.players[owner].pieces.filter(p=>p.state==="home").length;
}
function tripleKushEligible(owner=g?.turn){
 if(!g?.players?.[owner])return[];
 // Бонусом нельзя поставить последнюю, пятую фишку.
 if(tripleKushHomeCount(owner)>=4)return[];
 return g.players[owner].pieces.filter(p=>["yard","track","trap"].includes(p.state));
}
function tripleKushHomeSlot(owner=g?.turn){
 // Мгновенно завершённую фишку ставим в самую глубокую свободную клетку
 // Домика, чтобы она не перекрывала вход остальным.
 for(let i=4;i>=0;i--)if(!homeOcc(owner,i))return i;
 return null;
}
function updateTripleKushCard(){
 const card=$("#tripleKushCard"),text=$("#tripleKushText");
 if(!card)return;
 const pending=!!g?.tripleKushPending;
 card.hidden=!pending;
 if(text&&pending){
   text.textContent="Три куша подряд! Выберите зелёную фишку из базы или с поля — она сразу отправится в Домик. Пятую фишку этим бонусом ставить нельзя.";
 }
}
function activateTripleKushBonus(){
 if(!g)return false;

 // После третьего куша серия сразу считается отработанной.
 g.doubleStreak=0;
 g.doubleStreakSeat=null;

 const eligible=tripleKushEligible(g.turn);
 if(!eligible.length){
   g.tripleKushPending=false;
   updateTripleKushCard();
   if(tripleKushHomeCount(g.turn)>=4){
     setStatus("🔥 Три куша подряд! Но бонус нельзя использовать для пятой, последней фишки. Продолжаем обычный ход.");
   }else{
     setStatus("🔥 Три куша подряд! Но сейчас нет фишки в базе или на поле, которую можно отправить в Домик.");
   }
   return false;
 }

 g.tripleKushPending=true;
 updateTripleKushCard();
 return true;
}

function registerDoubleStreak(){
 if(!g||g.forcedSix)return false;

 if(!g.double){
   g.doubleStreak=0;
   g.doubleStreakSeat=null;
   g.tripleKushPending=false;
   updateTripleKushCard();
   return false;
 }

 if(g.doubleStreakSeat===g.turn)g.doubleStreak=(Number(g.doubleStreak)||0)+1;
 else{
   g.doubleStreakSeat=g.turn;
   g.doubleStreak=1;
 }

 if(g.doubleStreak<3)return false;
 return activateTripleKushBonus();
}

// В онлайн-игре серия кушей считается сервером.
// Так третий куш не зависит от задержек state_sync между браузерами.
function applyServerKushMeta(meta){
 if(!g||!meta)return false;

 const count=Math.max(0,Math.min(2,Number(meta.kushStreakCount)||0));
 g.doubleStreak=count;
 g.doubleStreakSeat=Number.isInteger(meta.kushStreakSeat)?meta.kushStreakSeat:(count?g.turn:null);

 if(meta.tripleKush===true){
   return activateTripleKushBonus();
 }

 if(!g.double){
   g.doubleStreak=0;
   g.doubleStreakSeat=null;
 }
 return false;
}
async function claimTripleKushBonus(pc){
 if(!g?.tripleKushPending||pc.owner!==g.turn)return false;
 if(!tripleKushEligible(g.turn).some(x=>x.id===pc.id))return false;

 const slot=tripleKushHomeSlot(g.turn);
 if(slot==null)return false;

 const pl=g.players[pc.owner];
 animating=true;
 preview=null;
 resetCellClasses();

 const target=HOME[pl.id][slot];
 // Плавное перемещение в Домик из базы, внешней дороги или ловушки.
 await animate(pc,[target],620,"fly");

 pc.state="home";
 pc.homeIndex=slot;
 pc.track=null;
 pc.progress=TRACK.length;
 pc.lapComplete=true;
 pc.trap=0;
 pc.trapSide=null;
 pc.captorSide=null;

 g.tripleKushPending=false;
 updateTripleKushCard();
 renderPieces();
 animating=false;

 setStatus(`${playerLabel(pl)} использовал бонус за три куша подряд: выбранная фишка сразу в Домике. Теперь разыграйте выпавший куш.`);
 beginOrderedDice();

 if(onlineActive())window.MondavoshkaOnline?.syncState();
 return true;
}
function tripleKushBotChoice(){
 const list=tripleKushEligible(g?.turn);
 if(!list.length)return null;
 // Компьютер прежде всего спасает фишку из ловушки, затем берёт фишку из базы,
 // затем — наименее продвинутую фишку с поля.
 return list.slice().sort((a,b)=>{
   const rank=p=>p.state==="trap"?300:p.state==="yard"?200:100-(Number(p.progress)||0);
   return rank(b)-rank(a);
 })[0];
}
function scheduleTripleKushBonus(delay=420){
 if(!g?.tripleKushPending||!isBotTurn()||!canControlBot())return;
 if(botTimer)clearTimeout(botTimer);
 botTimer=setTimeout(async()=>{
   botTimer=null;
   if(!g?.tripleKushPending||!isBotTurn()||animating)return;
   const pc=tripleKushBotChoice();
   if(!pc){
     g.tripleKushPending=false;
     updateTripleKushCard();
     beginOrderedDice();
     return;
   }
   setStatus(`${g.autoBotSeat===g.turn?"Система":"Компьютер"} использует бонус за три куша подряд…`);
   await claimTripleKushBonus(pc);
 },delay);
}

async function pieceClick(pc){
 if(animating||pc.owner!==g.turn)return;

 if(g?.tripleKushPending){
   if(isBotTurn()){
     setStatus("Система выбирает фишку для бонуса за три куша подряд…");
     return;
   }
   if(onlineActive()&&!onlineCanAct()){
     setStatus(`Сейчас ходит ${playerLabel(player())}. Ожидайте своей очереди.`);
     window.MondavoshkaOnline.refreshControls();
     return;
   }
   if(!tripleKushEligible(g.turn).some(x=>x.id===pc.id)){
     setStatus("Для бонуса выберите зелёную фишку из своей базы или с игрового поля.");
     return;
   }
   await claimTripleKushBonus(pc);
   return;
 }

 if(isBotTurn()){
   setStatus(`Компьютер (${player().name}) думает…`);
   return;
 }
 if(onlineActive()&&!onlineCanAct()){setStatus(`Сейчас ходит ${playerLabel(player())}. Ожидайте своей очереди.`);window.MondavoshkaOnline.refreshControls();return;}
 const mv=legal(pc,stepsNow(),false,!!g.trapOnlySelection);
 if(!mv){setStatus("Этой фишкой так сходить нельзя.");return;}
 if(preview?.id!==pc.id){
   preview=mv;
   resetCellClasses();
   renderPieces();
   if(mv.rescue) setStatus("Шестёрка выкупит пленника. Затем право одного хода на 6 получит игрок, у которого был пленник.");
   else if(mv.homeMove||mv.finalKind==="home") setStatus("Ход внутри Домика идёт по клеткам. Нажмите фишку ещё раз для подтверждения.");
   else if(mv.jumpTo!=null) setStatus("После обычного хода фишка попадёт на стрелку и перейдёт на клетку назначения.");
   else if(TRAP_ENTRY.has(mv.dest)) setStatus("Конечная клетка ведёт в ловушку «говно».");
   else setStatus("Маршрут показан. Нажмите эту фишку ещё раз, чтобы подтвердить ход.");
   return;
 }
 preview=null;
 await execute(pc,mv);
 consume();
 if(onlineActive()) window.MondavoshkaOnline.syncState();
}

async function execute(pc,mv){
 animating=true;resetCellClasses();

 if(pc.state==="captured" && mv.rescue){
   const pl=g.players[pc.owner];
   const captorId=pc.captorSide;
   const captor=g.players.find(x=>x.id===captorId);
   await animate(pc,[YARD[pl.id][pc.n]],420,"fly");
   pc.state="yard";
   pc.captorSide=null;
   pc.track=null;
   pc.progress=0;
   pc.lapComplete=false;
   pc.homeIndex=null;
   pc.trap=0;
   pc.trapSide=null;
   g.pendingGiftSeat=captor ? captor.owner : null;
   setStatus(captor ? `Пленник выкуплен. Шестёрка передаётся игроку ${captor.name}.` : "Пленная фишка выкуплена и вернулась домой.");
 }

 else if(pc.state==="yard"){
   await animate(pc,[TRACK[mv.dest]],420,"walk");
   const enemy=enemyAt(mv.dest,pc.owner);
   if(enemy)await capture(enemy,player().id);
   pc.state="track";
   pc.track=mv.dest;
   pc.progress=0;
   pc.lapComplete=false;
   pc.homeIndex=null;
   pc.captorSide=null;
 }

 else if(pc.state==="trap"){
   const side=pc.trapSide;
   const next=pc.trap+1;
   if(next>=3){
     const exit=TRAP_META[side].exit;
     const enemy=enemyAt(exit,pc.owner);
     if(enemy)await capture(enemy,player().id);
     const start=TRAP[side][pc.trap],end=TRACK[exit],control=trapCurveControl(side,start,end);
     sfxArrow();
     await animateBezier(pc,start,control,end,560,"trap");
     pc.state="track";
     pc.track=exit;
     pc.trap=0;
     pc.trapSide=null;
     setStatus("Фишка плавно вышла из ловушки.");
   }else{
     const ok=await pushTrapFrom(side,next);
     if(ok){
       await animate(pc,[TRAP[side][next]],300,"walk");
       pc.trap=next;
       setStatus("Фишка продвинулась в ловушке и вытолкнула стоящих впереди.");
     }
   }
 }

 else if(pc.state==="home"){
   await animate(pc,(mv.homePath||[]).map(i=>HOME[g.players[pc.owner].id][i]),Math.max(220,(mv.homePath||[]).length*150),"walk");
   pc.homeIndex=mv.destHome;
   setStatus("Фишка продвинулась по клеткам Домика.");
 }

 else{
   await animate(pc,mv.routeCoords||[],Math.max(220,(mv.routeCoords||[]).length*145),"walk");
   pc.progress+=(mv.path||[]).length;
   pc.lapComplete=mv.lapCompleteFinal===true;

   if(mv.finalKind==="home"){
     pc.state="home";
     pc.homeIndex=mv.destHome;
     pc.track=null;
     setStatus("Фишка завершила один круг и вошла на внутреннюю дорожку Домика.");
   }else{
     const enemy=enemyAt(mv.dest,pc.owner);
     if(enemy)await capture(enemy,player().id);
     pc.track=mv.dest;

     if(TRAP_ENTRY.has(pc.track)){
       const side=trapSideByEntry(pc.track);
       const entry=pc.track;
       const ok=await pushTrapFrom(side,0);
       if(ok){
         // Перерисовываем фишку точно на входной клетке и только затем ведём
         // её в ловушку. Так исключается рывок к старой позиции.
         renderPieces();
         const start=TRACK[entry],end=TRAP[side][0],control=trapCurveControl(side,start,end);
         sfxTrap();
         await animateBezier(pc,start,control,end,520,"trap");
         pc.state="trap";
         pc.trapSide=side;
         pc.track=null;
         pc.trap=0;
         setStatus("Попали в ловушку: теперь нужно 1 → 3 → 6. Внутри ловушки порядок кубиков свободный.");
       }
     }
     else if(DIAG_MAP[pc.track]){
       const jump=DIAG_MAP[pc.track];
       const entry=pc.track;
       // Сбрасываем предыдущую анимацию хода: новая SVG-фишка реально стоит
       // на клетке стрелки, поэтому полёт начинается строго с неё.
       renderPieces();
       const start=TRACK[entry],end=TRACK[jump.to],control=[jump.cx,jump.cy];
       sfxArrow();
       await animateBezier(pc,start,control,end,720,"arrow");
       const enemy2=enemyAt(jump.to,pc.owner);
       if(enemy2)await capture(enemy2,player().id);
       pc.track=jump.to;
       setStatus(`Плавный переход по стрелке ${jump.label}.`);
     }
   }
 }
 animating=false;drawBoard();
}

function animate(pc,points,dur,kind){
 return new Promise(async res=>{
   const el=svg.querySelector(`[data-id="${pc.id}"]`);
   if(!el||!points.length){res();return}

   const base=pos(pc,g.players[pc.owner]);
   const route=kind==="walk"?expandTrackWalkPoints(pc,points):points.slice();
   let prev=base;
   const segmentDur=Math.max(75,Math.round(dur/Math.max(1,route.length)));

   for(let i=0;i<route.length;i++){
     const target=route[i];
     const fromDx=prev[0]-base[0],fromDy=prev[1]-base[1];
     const toDx=target[0]-base[0],toDy=target[1]-base[1];

     if(kind==="walk")sfxStep();

     const a=el.animate([
       {transform:`translate(${fromDx}px,${fromDy}px) scale(1)`},
       {transform:`translate(${toDx}px,${toDy}px) scale(1)`}
     ],{
       duration:segmentDur,
       easing:"ease-in-out",
       fill:"forwards"
     });

     try{await a.finished}catch{}
     prev=target;
   }
   res();
 });
}

function animateBezier(pc,start,control,end,dur,kind="arrow"){
 return new Promise(res=>{
   const el=svg.querySelector(`[data-id="${pc.id}"]`);
   if(!el){res();return}
   const base=pos(pc,g.players[pc.owner]);
   const frames=[];
   const steps=28;
   for(let i=0;i<=steps;i++){
     const t=i/steps,u=1-t;
     const x=u*u*start[0]+2*u*t*control[0]+t*t*end[0];
     const y=u*u*start[1]+2*u*t*control[1]+t*t*end[1];
     const dx=x-base[0],dy=y-base[1];
     const lift=Math.sin(Math.PI*t);
     const scale=kind==="arrow"?1+.13*lift:1-.05*lift;
     frames.push({transform:`translate(${dx}px,${dy}px) scale(${scale})`});
   }
   const a=el.animate(frames,{duration:dur,easing:"linear",fill:"forwards"});
   a.onfinish=()=>res();
   a.oncancel=()=>res();
 });
}

function trapCurveControl(side,start,end){
 const mx=(start[0]+end[0])/2,my=(start[1]+end[1])/2;
 if(side==="blue")return[mx,Math.min(start[1],end[1])-18];
 if(side==="red")return[mx,Math.max(start[1],end[1])+18];
 if(side==="whiteblue")return[Math.max(start[0],end[0])+18,my];
 return[Math.min(start[0],end[0])-18,my];
}

function botMoveScore(pc,mv,steps){
 let score=0;

 // Главный приоритет — закончить круг и продвигаться внутри Домика.
 if(mv.finalKind==="home")score+=150+(Number(mv.destHome)||0)*18;
 if(mv.homeMove)score+=125+(Number(mv.destHome)||0)*18;
 if(Number(mv.destHome)===4)score+=130;

 // В ловушке компьютер старается выбраться как можно быстрее.
 if(pc.state==="trap")score+=95+(Number(pc.trap)||0)*22;

 // Вывести новую фишку полезно, но не ценнее взятия/домика.
 if(pc.state==="yard")score+=42;

 // Выкуп пленника полезен, но учитываем, что шестёрка передастся captor'у.
 if(mv.rescue)score+=38;

 const directDest=Number.isInteger(mv.dest)?mv.dest:null;
 if(directDest!=null){
   const victim=enemyAt(directDest,pc.owner);
   if(victim)score+=145;
   if(CORNERS.has(directDest))score+=18;
   if(TRAP_ENTRY.has(directDest))score-=45;
 }
 if(Number.isInteger(mv.jumpTo)){
   const victim2=enemyAt(mv.jumpTo,pc.owner);
   if(victim2)score+=125;
   score+=30;
   if(CORNERS.has(mv.jumpTo))score+=15;
 }

 score+=(mv.path?.length||0)*4;
 score+=(mv.homePath?.length||0)*10;

 // Небольшая вариативность при равноценных ходах.
 score+=Math.random()*2.5;
 return score;
}

function botCandidatesForDie(i){
 if(!g||g.used[i])return[];
 const value=g.d[i];
 const unused=[0,1].filter(j=>!g.used[j]);
 let trapOnly=false;

 if(!g.forcedSix && unused.length===2 && g.d[0]!==g.d[1]){
   const highIndex=g.d[0]>g.d[1]?0:1;
   if(i!==highIndex)trapOnly=true;
 }

 return player().pieces
   .map(pc=>({pc,mv:legal(pc,value,false,trapOnly)}))
   .filter(x=>x.mv)
   .map(x=>({...x,die:i,trapOnly,score:botMoveScore(x.pc,x.mv,value)}));
}

function chooseBotDieAndMove(){
 if(!g||!g.rolled)return null;
 const enabled=[0,1].filter(i=>!g.used[i]&&!dice[i].disabled);
 if(!enabled.length)return null;

 let options=[];
 for(const i of enabled)options.push(...botCandidatesForDie(i));
 if(!options.length)return null;

 options.sort((a,b)=>b.score-a.score);
 return options[0];
}

function scheduleBotMove(delay=620){
 if(g?.tripleKushPending){
   scheduleTripleKushBonus(Math.min(delay,420));
   return;
 }
 if(!isBotTurn()||!g?.rolled||botThinking||!canControlBot())return;
 if(botTimer)clearTimeout(botTimer);
 botTimer=setTimeout(async()=>{
   botTimer=null;
   if(!isBotTurn()||!g?.rolled||animating||botThinking)return;

   const choice=chooseBotDieAndMove();
   if(!choice){
     // На случай, если выбранная кость после изменения состояния перестала быть доступной.
     beginOrderedDice();
     return;
   }

   if(g.selected!==choice.die){
     selectDie(choice.die);
     return;
   }

   const current=legal(choice.pc,stepsNow(),false,!!g.trapOnlySelection);
   if(!current){
     beginOrderedDice();
     return;
   }

   botThinking=true;
   setStatus(g.autoBotSeat===g.turn ? `Система делает ход за ${playerLabel(player())}: ${stepsNow()}…` : `Компьютер (${player().name}) ходит на ${stepsNow()}…`);
   await new Promise(r=>setTimeout(r,420));

   if(!isBotTurn()||g.selected==null){
     botThinking=false;
     return;
   }

   preview=current;
   resetCellClasses();
   renderPieces();
   await new Promise(r=>setTimeout(r,260));
   preview=null;

   await execute(choice.pc,current);
   botThinking=false;
   consume();
   if(onlineActive())window.MondavoshkaOnline?.syncState();
 },delay);
}

function scheduleBotRoll(delay=720){
 if(!isBotTurn()||!g||g.rolled||animating||!canControlBot())return;
 if(botTimer)clearTimeout(botTimer);
 botTimer=setTimeout(()=>{
   botTimer=null;
   if(!isBotTurn()||!g||g.rolled||animating)return;
   $("#roll").disabled=true;
   setStatus(g.autoBotSeat===g.turn ? `Время истекло — система бросает кости за ${playerLabel(player())}…` : `Компьютер (${player().name}) бросает кости…`);
   if(onlineActive())window.MondavoshkaOnline?.requestRoll();
   else{const r=[1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)];applyRollValues(r,false)}
 },delay);
}

async function capture(pc, captorSide){
  sfxCapture();
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
  pc.lapComplete=false;
  pc.homeIndex=null;
  pc.trap=0;
  pc.trapSide=null;
}
function trapPieces(side){return allPieces().filter(p=>p.state==="trap"&&p.trapSide===side)}
function trapOcc(side,idx,except=null){return trapPieces(side).find(p=>p.trap===idx&&p.id!==except)}
async function pushTrap(side,idx){return pushTrapFrom(side,idx)}
async function pushTrapFrom(side,idx){
 const occ=trapOcc(side,idx);
 if(!occ)return true;
 const next=idx+1;
 if(next>=3){
   const exit=TRAP_META[side].exit;
   if(ownAt(exit,occ.owner))return false;
   const enemy=enemyAt(exit,occ.owner);
   if(enemy)await capture(enemy,g.players[occ.owner].id);
   const start=TRAP[side][occ.trap],end=TRACK[exit],control=trapCurveControl(side,start,end);
   sfxArrow();
   await animateBezier(occ,start,control,end,500,"trap");
   occ.state="track";
   occ.track=exit;
   occ.trap=0;
   occ.trapSide=null;
   return true;
 }
 const ok=await pushTrapFrom(side,next);
 if(!ok)return false;
 await animate(occ,[TRAP[side][next]],260,"walk");
 occ.trap=next;
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
 g.trapOnlySelection=false;
 preview=null;

 dice.forEach(b=>{b.disabled=true;b.classList.remove("active");});
 $("#sum").classList.remove("active");
 $("#sum").disabled=true;
 resetCellClasses();
 renderPieces();

 // Выкуп пленника: использованная шестёрка не исчезает — право одного хода на 6
 // передаётся тому, кто держал пленника. После этого исходный ход продолжается.
 if(Number.isInteger(g.pendingGiftSeat)){
   const seat=g.pendingGiftSeat;
   g.pendingGiftSeat=null;
   startGiftSix(seat);
   return;
 }

 if(g.used.every(Boolean)){finishTurn();return;}
 beginOrderedDice();
}
function startGiftSix(seat){
 if(!Number.isInteger(seat)||!g.players[seat]){beginOrderedDice();return;}
 g.resumeStack=Array.isArray(g.resumeStack)?g.resumeStack:[];
 g.resumeStack.push({
   turn:g.turn,d:[...g.d],used:[...g.used],selected:null,sum:false,rolled:g.rolled,double:g.double,
   trapOnlySelection:false,forcedSix:!!g.forcedSix,
   doubleStreak:Number(g.doubleStreak)||0,
   doubleStreakSeat:Number.isInteger(g.doubleStreakSeat)?g.doubleStreakSeat:null,
   tripleKushPending:!!g.tripleKushPending
 });
 g.turn=seat;
 g.d=[6,6];
 g.used=[false,true];
 g.selected=null;
 g.sum=false;
 g.rolled=true;
 g.double=false;
 g.forcedSix=true;
 g.trapOnlySelection=false;
 preview=null;
 updateUI();
 restoreDiceFromState();
 renderPieces();
 beginOrderedDice();
}
function restoreAfterGiftSix(){
 const stack=Array.isArray(g.resumeStack)?g.resumeStack:[];
 const resume=stack.pop();
 if(!resume){
   g.forcedSix=false;
   g.rolled=false;
   g.used=[false,false];
   g.selected=null;
   clearDice();
   return;
 }
 Object.assign(g,resume);
 g.resumeStack=stack;
 g.pendingGiftSeat=null;
 preview=null;
 updateUI();
 restoreDiceFromState();
 renderPieces();
 if(g.used.every(Boolean))finishTurn();
 else beginOrderedDice();
}

function finishTurn(){
 // Победа проверяется и после обычного хода, и после переданной шестёрки.
 if(player().pieces.every(p=>p.state==="home")){
   cancelBotTimer();
   $("#roll").disabled=true;
   yandexGameplayStop();
   showVictory(g.turn);
   return;
 }

 if(g.forcedSix){
   g.forcedSix=false;
   restoreAfterGiftSix();
   return;
 }

 const extra=g.double;
 g.double=false;
 g.tripleKushPending=false;
 updateTripleKushCard();
 g.rolled=false;
 g.used=[false,false];
 g.selected=null;
 g.sum=false;
 g.trapOnlySelection=false;
 preview=null;
 animating=false;
 clearDice();

 if(!extra){
   g.doubleStreak=0;
   g.doubleStreakSeat=null;
   g.turn=nextActiveSeat(g.turn);
 }
 updateUI();
 renderPieces();

 const rollBtn=$("#roll");
 if(onlineActive()){
   rollBtn.disabled=true;
   requestAnimationFrame(()=>window.MondavoshkaOnline?.refreshControls());
 }else if(isBotTurn()){
   rollBtn.disabled=true;
 }else{
   rollBtn.disabled=false;
   requestAnimationFrame(()=>{if(g&&!g.rolled&&!animating&&!isBotTurn())rollBtn.disabled=false;});
 }

 if(isBotTurn()){
   setStatus(extra
     ? `У компьютера (${player().name}) куш — он бросает ещё раз.`
     : `Ход компьютера (${player().name}).`);
   scheduleBotRoll(extra?520:760);
 }else{
   setStatus(extra ? "Куш — бросайте ещё раз." : (gameMode==="bot" ? "Ваш ход. Бросьте две кости." : "Бросьте две кости."));
 }
}

function clearDice(){
 dice.forEach((b,i)=>{
   b.disabled=true;
   b.classList.remove("active","rolling");
   const span=b.querySelector("span");
   const old=Number(span.dataset.v);
   span.dataset.v=String(old>=1&&old<=6?old:1);
 });
 $("#sum").disabled=true;
 $("#sum").classList.remove("active");
}

function resetCellClasses(){svg.querySelectorAll(".cell").forEach(e=>e.setAttribute("class","cell"+(Object.values(START).includes(+e.dataset.cell)?" start":"")+(TRAP_ENTRY.has(+e.dataset.cell)?" trap":"")))}

function updatePenaltyCard(){
 const el=$("#penaltyText");
 if(!el) return;
 if(gameMode==="bot"){
   el.textContent="Игра против компьютера — колесо желаний не используется.";
   return;
 }
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
 pendingLocalHumanCount=pendingPlayerCount;
 pendingLocalFillBots=!!$("#fillLocalBots")?.checked && pendingPlayerCount<4;
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

function sfxTone(freq=220,duration=.08,volume=.05,type="sine",endFreq=null,delay=0){
 if(!sfxEnabled)return;
 const ctx=ensureAudio();if(!ctx)return;
 const now=ctx.currentTime+Math.max(0,delay);
 const osc=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
 osc.type=type;
 osc.frequency.setValueAtTime(Math.max(30,freq),now);
 if(endFreq!=null)osc.frequency.exponentialRampToValueAtTime(Math.max(30,endFreq),now+duration);
 filter.type="lowpass";filter.frequency.setValueAtTime(2200,now);
 gain.gain.setValueAtTime(.0001,now);
 gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),now+.008);
 gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
 osc.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
 osc.start(now);osc.stop(now+duration+.03);
}
function sfxNoise(duration=.08,volume=.035,cutoff=1500,delay=0){
 if(!sfxEnabled)return;
 const ctx=ensureAudio();if(!ctx)return;
 const rate=ctx.sampleRate,len=Math.max(1,Math.floor(rate*duration));
 const buf=ctx.createBuffer(1,len,rate),data=buf.getChannelData(0);
 for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);
 const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
 src.buffer=buf;filter.type="lowpass";filter.frequency.value=cutoff;
 const now=ctx.currentTime+Math.max(0,delay);
 gain.gain.setValueAtTime(Math.max(.0002,volume),now);
 gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
 src.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
 src.start(now);src.stop(now+duration+.02);
}
function sfxDiceRoll(){
 if(!sfxEnabled)return;
 for(let i=0;i<8;i++){
   const d=i*.072;
   sfxTone(270+Math.random()*220,.045,.032,"square",150+Math.random()*120,d);
   sfxNoise(.035,.018,1250+Math.random()*800,d);
 }
 sfxTone(150,.11,.05,"triangle",90,.56);
}
function sfxStep(){
 if(!sfxEnabled)return;
 sfxTone(165+Math.random()*35,.055,.026,"triangle",105,.0);
 sfxNoise(.035,.012,850,.0);
}
function sfxCapture(){
 if(!sfxEnabled)return;
 sfxTone(105,.18,.075,"sawtooth",48,0);
 sfxNoise(.16,.07,1100,0);
 sfxTone(310,.11,.035,"square",120,.035);
}
function sfxTrap(){
 if(!sfxEnabled)return;
 sfxTone(230,.30,.07,"sine",58,0);
 sfxNoise(.13,.04,650,.08);
 sfxTone(72,.22,.05,"triangle",48,.13);
}
function sfxArrow(){
 if(!sfxEnabled)return;
 sfxNoise(.42,.035,2100,0);
 sfxTone(180,.42,.04,"sine",620,0);
 sfxTone(360,.30,.018,"triangle",860,.08);
}
function toggleSfx(){
 sfxEnabled=!sfxEnabled;
 updateSfxButton();
 if(sfxEnabled)sfxTone(420,.07,.03,"triangle",620);
}
function updateSfxButton(){
 const b=$("#sfxToggle");
 if(b)b.textContent=sfxEnabled?"🔊 Звуки: вкл":"🔇 Звуки: выкл";
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
 $("#player").textContent=isBotTurn()?`${p.playerName||"Компьютер"} — ${p.name}`:playerLabel(p);
 $("#player").style.color=p.id==="red"?"#c51c29":p.id==="blue"?"#007e92":p.id==="black"?"#111":"#164b8c";
 const order=$("#turnOrder");
 if(order) order.textContent=g.players.map(x=>`${playerLabel(x)}${x.eliminated?" (выбыл)":""}`).join(" → ");
 const you=$("#youAre");
 if(you){
   if(gameMode==="online"&&window.MondavoshkaOnline?.active){
     const seat=window.MondavoshkaOnline.seat;
     const mine=g.players[seat];
     if(mine){you.hidden=false;you.textContent=`Вы играете: ${mine.playerName||window.MondavoshkaOnline.name||"Игрок"} — ${mine.name}`;}
     else you.hidden=true;
   }else you.hidden=true;
 }
}
let fireworksRAF=null,fireworksParticles=[];
function stopFireworks(){
 if(fireworksRAF){cancelAnimationFrame(fireworksRAF);fireworksRAF=null}
 fireworksParticles=[];
}
function startFireworks(){
 stopFireworks();
 const canvas=$("#victoryCanvas");if(!canvas)return;
 const ctx=canvas.getContext("2d");
 const resize=()=>{const r=canvas.getBoundingClientRect();canvas.width=Math.max(1,Math.floor(r.width*devicePixelRatio));canvas.height=Math.max(1,Math.floor(r.height*devicePixelRatio));ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)};
 resize();
 const colors=["#ffcf33","#ff5364","#61d3ff","#8cff6a","#c77cff","#ffffff"];let last=0;
 function burst(w,h){const x=50+Math.random()*Math.max(40,w-100),y=55+Math.random()*Math.max(80,h*.5);const c=colors[Math.floor(Math.random()*colors.length)];for(let i=0;i<36;i++){const a=Math.random()*Math.PI*2,s=1.5+Math.random()*4.4;fireworksParticles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,c})}}
 function frame(t){const r=canvas.getBoundingClientRect(),w=r.width,h=r.height;if(t-last>480){burst(w,h);last=t}ctx.clearRect(0,0,w,h);for(const p of fireworksParticles){p.x+=p.vx;p.y+=p.vy;p.vy+=.035;p.vx*=.993;p.life-=.014;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,2.2,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;fireworksParticles=fireworksParticles.filter(p=>p.life>0);fireworksRAF=requestAnimationFrame(frame)}
 fireworksRAF=requestAnimationFrame(frame);
}
function showVictory(seat,statusText=""){
 const pl=g?.players?.[seat];if(!pl)return;
 const modal=$("#victoryModal"),title=$("#victoryTitle"),sub=$("#victorySubtitle");
 if(title)title.textContent=`${pl.playerName||"Игрок"} победил!`;
 if(sub)sub.textContent=`Победные фишки: ${pl.name}. Все 5 фишек в Домике.`+(statusText?` ${statusText}`:"");
 modal?.classList.add("show");startFireworks();
}
function showMatchEnded(statusText="Партия завершена."){
 const modal=$("#victoryModal"),title=$("#victoryTitle"),sub=$("#victorySubtitle");
 if(title)title.textContent="Партия завершена";
 if(sub)sub.textContent=statusText;
 modal?.classList.add("show");
 startFireworks();
}
function closeVictory(){stopFireworks();$("#victoryModal")?.classList.remove("show")}

function setStatus(s){$("#status").textContent=s}
function closeGameMenus(){
  ["#mainMenu","#localModal","#botModal","#randomOnlineModal","#onlineCreateModal","#onlineJoinModal","#onlineLobbyModal","#wheelModal"].forEach(sel=>{
    const el=$(sel); if(el) el.classList.remove("show");
  });
}
function showMainMenu(){
  cancelBotTimer();
  yandexGameplayStop();
  const exitBtn=$("#exitGame");if(exitBtn)exitBtn.hidden=true;
  $("#exitGameModal")?.classList.remove("show");
  if(window.MondavoshkaOnline?.active) window.MondavoshkaOnline.leave(false);
  closeGameMenus();
  $("#mainMenu").classList.add("show");
  selectedWish=null;
}

$("#playLocal").onclick=()=>{
  closeGameMenus();
  $("#localModal").classList.add("show");
};
$("#playBot").onclick=()=>{
  closeGameMenus();
  $("#botModal").classList.add("show");
};
$("#startBot").onclick=()=>{
  closeGameMenus();
  startBotGame(Number($("#botCount").value)||1);
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

const localCountEl=$("#count"),localFillWrap=$("#fillLocalBotsWrap");
function updateLocalFillOffer(){if(localFillWrap)localFillWrap.hidden=Number(localCountEl?.value||4)>=4}
localCountEl?.addEventListener("change",updateLocalFillOffer);updateLocalFillOffer();
$("#victoryMenu").onclick=()=>{closeVictory();showMainMenu()};
$("#victoryAgain").onclick=()=>{const mode=gameMode;closeVictory();showMainMenu();if(mode==="local"||mode==="mixed"){$("#mainMenu").classList.remove("show");$("#localModal").classList.add("show")}else if(mode==="bot"){$("#mainMenu").classList.remove("show");$("#botModal").classList.add("show")}};
$("#start").onclick=()=>{
 pendingPlayerCount=Number($("#count").value)||4;
 pendingLocalHumanCount=pendingPlayerCount;
 pendingLocalFillBots=!!$("#fillLocalBots")?.checked && pendingPlayerCount<4;
 $("#localModal").classList.remove("show");
 newGame(pendingLocalHumanCount,null,pendingLocalFillBots);
};
$("#musicToggle").onclick=toggleMusic;
$("#sfxToggle").onclick=toggleSfx;
updateSfxButton();
$("#newGame").onclick=showMainMenu;

$("#exitGame").onclick=()=>{
 const modal=$("#exitGameModal"),text=$("#exitGameText");
 if(text){
   text.textContent=(gameMode==="online"&&window.MondavoshkaOnline?.active)
     ?"Если выйти из онлайн-партии, это будет считаться добровольным поражением. Партия завершится для всех остальных игроков."
     :"Текущая партия завершится, и вы вернётесь в главное меню.";
 }
 modal?.classList.add("show");
};
$("#cancelExitGame").onclick=()=>$("#exitGameModal")?.classList.remove("show");
$("#confirmExitGame").onclick=()=>{
 $("#exitGameModal")?.classList.remove("show");
 if(gameMode==="online"&&window.MondavoshkaOnline?.active){
   window.MondavoshkaOnline.forfeitAndLeave?.();
 }else{
   showMainMenu();
 }
};

$("#roll").onclick=roll;
dice.forEach((b,i)=>b.onclick=()=>selectDie(i));
$("#sum").onclick=selectSum;
updateMusicButton();
drawBoard();


document.addEventListener("visibilitychange",()=>{
  if(document.hidden){
    yandexGameplayStop();
  }else if(g && !$("#mainMenu").classList.contains("show") && !$("#localModal").classList.contains("show") && !$("#botModal").classList.contains("show") && !$("#onlineCreateModal").classList.contains("show") && !$("#onlineJoinModal").classList.contains("show") && !$("#onlineLobbyModal").classList.contains("show")){
    yandexGameplayStart();
  }
});

window.MondavoshkaVictory={show:showVictory,showEnded:showMatchEnded,close:closeVictory};

"use strict";
(()=>{
 const colors=[
  {name:"Красный",fill:"#df2735"},{name:"Чёрный",fill:"#171717"},
  {name:"Синий",fill:"#008fa5"},{name:"Бело-синий",fill:"#f8f7ef"}
 ];
 const S={socket:null,active:false,connected:false,started:false,code:null,token:null,seat:null,host:false,players:[],name:"",actionSeat:null,pendingStart:false,reconnectTimer:null,manualClose:false,lastVersion:0};

 function wsUrl(){
   const configured=String(window.MONDAVOSHKA_WS_URL||"").trim();
   if(configured)return configured;
   if(location.protocol==="file:")return "ws://localhost:8080/ws";
   const proto=location.protocol==="https:"?"wss:":"ws:";
   return `${proto}//${location.host}/ws`;
 }
 function cleanName(v){return String(v||"").trim().slice(0,24)||"Игрок"}
 function normalizeCode(v){return String(v||"").replace(/\D/g,"").slice(0,6)}
 function setErr(id,text){const e=document.querySelector(id);if(e)e.textContent=text||""}
 function setConnection(text,ok=null){
   const e=document.querySelector("#onlineConnection");if(!e)return;
   e.textContent=text;e.classList.remove("ok","bad");if(ok===true)e.classList.add("ok");if(ok===false)e.classList.add("bad");
 }
 function send(obj){
   if(!S.socket||S.socket.readyState!==WebSocket.OPEN)return false;
   S.socket.send(JSON.stringify(obj));return true;
 }
 function connect(){
   if(S.socket&&S.socket.readyState===WebSocket.OPEN)return Promise.resolve();
   if(S.socket&&S.socket.readyState===WebSocket.CONNECTING){
     return new Promise((resolve,reject)=>{const t=setInterval(()=>{if(S.socket.readyState===WebSocket.OPEN){clearInterval(t);resolve()}else if(S.socket.readyState>1){clearInterval(t);reject(new Error("Не удалось подключиться"))}},80)});
   }
   S.manualClose=false;
   return new Promise((resolve,reject)=>{
     let done=false;
     try{S.socket=new WebSocket(wsUrl())}catch(e){reject(e);return}
     const timer=setTimeout(()=>{if(!done){done=true;try{S.socket.close()}catch{};reject(new Error("Сервер не отвечает"))}},7000);
     S.socket.onopen=()=>{clearTimeout(timer);done=true;S.connected=true;setConnection("Связь с сервером установлена",true);resolve()};
     S.socket.onmessage=e=>{try{handle(JSON.parse(e.data))}catch(err){console.error("Online message error",err)}};
     S.socket.onerror=()=>{if(!done){clearTimeout(timer);done=true;reject(new Error("Не удалось подключиться к онлайн-серверу"))}};
     S.socket.onclose=()=>{
       S.connected=false;setConnection("Связь с сервером потеряна",false);
       if(!S.manualClose&&S.active&&S.code&&S.token){clearTimeout(S.reconnectTimer);S.reconnectTimer=setTimeout(reconnect,1800)}
     };
   });
 }
 async function reconnect(){
   try{await connect();send({type:"reconnect_room",code:S.code,token:S.token,name:S.name})}catch(e){S.reconnectTimer=setTimeout(reconnect,2500)}
 }
 function saveSession(){try{localStorage.setItem("mondavoshka-online",JSON.stringify({code:S.code,token:S.token,name:S.name}))}catch{}}
 function clearSession(){try{localStorage.removeItem("mondavoshka-online")}catch{}}

 function showLobby(){
   closeGameMenus();
   document.querySelector("#onlineLobbyModal")?.classList.add("show");
   renderLobby();
 }
 function renderLobby(){
   const code=document.querySelector("#lobbyCode");if(code)code.textContent=S.code||"------";
   const box=document.querySelector("#lobbyPlayers");if(box){
     box.innerHTML="";
     S.players.slice().sort((a,b)=>a.seat-b.seat).forEach(p=>{
       const d=document.createElement("div");d.className="lobbyPlayer"+(p.connected?"":" offline");
       const dot=document.createElement("span");dot.className="lobbyDot";dot.style.background=colors[p.seat]?.fill||"#999";
       const text=document.createElement("span");text.textContent=`${colors[p.seat]?.name||"Игрок"}: ${p.name}${p.host?" • создатель":""}${p.connected?"":" • не в сети"}`;
       d.append(dot,text);
       if(p.seat===S.seat){const you=document.createElement("span");you.className="you";you.textContent="это вы";d.appendChild(you)}
       box.appendChild(d);
     });
   }
   const btn=document.querySelector("#startOnlineGame");
   const connectedCount=S.players.filter(p=>p.connected).length;
   if(btn){btn.style.display=S.host?"":"none";btn.disabled=!S.host||connectedCount<2||S.started}
   const hint=document.querySelector("#lobbyHint");
   if(hint){
     if(S.started)hint.textContent="Партия уже началась.";
     else if(S.host)hint.textContent=connectedCount<2?"Для начала игры нужен ещё минимум 1 игрок.":`Подключено ${connectedCount}. Можно начинать игру.`;
     else hint.textContent="Ждём, пока создатель комнаты начнёт игру.";
   }
   setConnection(S.connected?"Связь с сервером установлена":"Нет связи с сервером",S.connected);
 }
 function canAct(){return !!(S.active&&S.started&&g&&S.seat===g.turn&&S.connected)}
 function refreshControls(){
   if(!S.active||!g)return;
   const mine=canAct();
   const roll=document.querySelector("#roll");
   if(roll)roll.disabled=!(mine&&!g.rolled&&!animating);
   if(!mine)dice.forEach(b=>b.disabled=true);
   if(!mine && S.started && g){
     const current=g.players[g.turn];
     if(current)setStatus(`Сейчас ходит ${current.name}. Ожидайте своей очереди.`);
   }
 }
 function syncState(){
   if(!S.active||!S.started||!S.connected||!g)return;
   if(S.actionSeat!==S.seat)return;
   send({type:"state_update",code:S.code,state:JSON.parse(JSON.stringify(g)),status:document.querySelector("#status")?.textContent||""});
 }
 function afterNetworkRollApplied(){
   refreshControls();
   if(S.actionSeat===S.seat)setTimeout(syncState,30);
 }
 function requestRoll(){
   if(!canAct()){refreshControls();return}
   const roll=document.querySelector("#roll");if(roll)roll.disabled=true;
   send({type:"roll",code:S.code});
 }
 async function createRoom(){
   setErr("#createOnlineError","");
   S.name=cleanName(document.querySelector("#createPlayerName")?.value);
   try{await connect();send({type:"create_room",name:S.name})}
   catch(e){setErr("#createOnlineError",`${e.message}. Проверьте адрес онлайн-сервера.`)}
 }
 async function joinRoom(){
   setErr("#joinOnlineError","");
   S.name=cleanName(document.querySelector("#joinPlayerName")?.value);
   const code=normalizeCode(document.querySelector("#roomCode")?.value);
   if(code.length!==6){setErr("#joinOnlineError","Введите 6-значный код комнаты.");return}
   try{await connect();send({type:"join_room",code,name:S.name})}
   catch(e){setErr("#joinOnlineError",`${e.message}. Проверьте адрес онлайн-сервера.`)}
 }
 function leave(showMenu=true){
   if(S.connected&&S.code)send({type:"leave_room",code:S.code});
   S.manualClose=true;try{S.socket?.close()}catch{}
   clearTimeout(S.reconnectTimer);
   S.socket=null;S.active=false;S.connected=false;S.started=false;S.code=null;S.token=null;S.seat=null;S.host=false;S.players=[];S.actionSeat=null;S.pendingStart=false;S.lastVersion=0;
   clearSession();gameMode="local";
   if(showMenu){closeGameMenus();document.querySelector("#mainMenu")?.classList.add("show")}
 }
 function startGame(wish){
   if(!S.host||S.players.filter(p=>p.connected).length<2)return;
   const n=S.players.length;
   const state=buildGameState(n,wish);
   send({type:"start_game",code:S.code,wish,state});
   S.pendingStart=false;
 }
 function handle(m){
   if(!m||typeof m.type!=="string")return;
   if(m.type==="error"){
     const text=m.message||"Ошибка онлайн-игры";
     if(document.querySelector("#onlineCreateModal")?.classList.contains("show"))setErr("#createOnlineError",text);
     else if(document.querySelector("#onlineJoinModal")?.classList.contains("show"))setErr("#joinOnlineError",text);
     else setStatus(text);
     return;
   }
   if(m.type==="room_created"||m.type==="room_joined"||m.type==="room_reconnected"){
     S.active=true;S.connected=true;S.code=m.code;S.token=m.token;S.seat=m.seat;S.host=!!m.host;S.players=m.players||[];S.started=!!m.started;S.lastVersion=m.version||0;
     saveSession();showLobby();
     if(m.started&&m.state){S.started=true;startOnlineGameState(m.state,m.status||"Вы вернулись в онлайн-партию.");refreshControls()}
     return;
   }
   if(m.type==="seat_update"){
     S.seat=m.seat;S.host=!!m.host;S.players=m.players||S.players;renderLobby();return;
   }
   if(m.type==="room_update"){
     S.players=m.players||S.players;S.host=!!S.players.find(p=>p.seat===S.seat)?.host;S.started=!!m.started;renderLobby();return;
   }
   if(m.type==="game_started"){
     S.started=true;S.actionSeat=null;S.pendingStart=false;S.lastVersion=m.version||S.lastVersion;
     startOnlineGameState(m.state,m.status||"Онлайн-партия началась. Красный ходит первым.");refreshControls();return;
   }
   if(m.type==="roll_result"){
     if((m.version||0)<S.lastVersion)return;
     S.actionSeat=m.seat;S.lastVersion=Math.max(S.lastVersion,m.version||0);
     applyRollValues(m.dice,true);return;
   }
   if(m.type==="state_sync"){
     if((m.version||0)<S.lastVersion)return;
     S.lastVersion=m.version||S.lastVersion;
     if(m.state){applyOnlineSnapshot(m.state,m.status||"")}
     S.actionSeat=m.actionSeat??null;refreshControls();return;
   }
   if(m.type==="player_left"){
     S.players=m.players||S.players;renderLobby();if(S.started)setStatus(`${m.name||"Игрок"} отключился. Ожидаем возвращения.`);return;
   }
 }

 // Override V24 placeholder menu actions.
 document.querySelector("#createOnline").onclick=()=>{closeGameMenus();document.querySelector("#onlineCreateModal").classList.add("show")};
 document.querySelector("#joinOnline").onclick=()=>{closeGameMenus();document.querySelector("#onlineJoinModal").classList.add("show")};
 document.querySelector("#createRoomBtn").onclick=createRoom;
 document.querySelector("#joinRoomBtn").onclick=joinRoom;
 document.querySelector("#roomCode").addEventListener("input",e=>e.target.value=normalizeCode(e.target.value));
 document.querySelector("#startOnlineGame").onclick=()=>{if(S.host){S.pendingStart=true;openOnlineWheel(S.players.length)}};
 document.querySelector("#leaveOnlineRoom").onclick=()=>leave(true);
 document.querySelector("#copyRoomCode").onclick=async()=>{try{await navigator.clipboard.writeText(S.code||"");document.querySelector("#copyRoomCode").textContent="Скопировано";setTimeout(()=>document.querySelector("#copyRoomCode").textContent="Копировать код",1200)}catch{}};

 const oldShowMain=showMainMenu;
 document.querySelectorAll(".backToMenu").forEach(b=>b.onclick=()=>{if(S.active)leave(true);else oldShowMain()});
 document.querySelector("#newGame").onclick=()=>{if(S.active)leave(true);else oldShowMain()};

 window.MondavoshkaOnline={
   get active(){return S.active},get connected(){return S.connected},get seat(){return S.seat},get pendingStart(){return S.pendingStart},set pendingStart(v){S.pendingStart=!!v},
   canAct,refreshControls,requestRoll,syncState,afterNetworkRollApplied,startGame,leave,wsUrl
 };
})();

"use strict";
(()=>{
 const colors=[
  {name:"Красный",fill:"#df2735"},{name:"Чёрный",fill:"#171717"},
  {name:"Синий",fill:"#008fa5"},{name:"Бело-синий",fill:"#f8f7ef"}
 ];
 const S={socket:null,active:false,connected:false,started:false,code:null,token:null,seat:null,host:false,players:[],name:"",actionSeat:null,pendingStart:false,reconnectTimer:null,manualClose:false,lastVersion:0,randomSearching:false,randomSize:2,matchMode:"room",deadline:0,misses:[],matchPoints:[],fillBots:false,autoSeat:null,autoControllerSeat:null,timerEnabled:true,chatHistory:[]};

 function wsUrl(){
   const configured=String(window.MONDAVOSHKA_WS_URL||"").trim();
   if(configured)return configured;
   if(location.protocol==="file:")return "ws://localhost:8080/ws";
   const proto=location.protocol==="https:"?"wss:":"ws:";
   return `${proto}//${location.host}/ws`;
 }
 function cleanName(v){return String(v||"").replace(/[<>\u0000-\u001f]/g,"").trim().slice(0,24)||"Игрок"}
 function normalizeCode(v){return String(v||"").replace(/\D/g,"").slice(0,6)}
 function setErr(id,text){const e=document.querySelector(id);if(e)e.textContent=text||""}
 function profilePayload(){
   const p=window.MondavoshkaProfile?.publicProfile?.()||{};
   return {profileId:p.id||null,skinId:p.skinId||"default",rating:Number(p.rating)||0};
 }
 function playerTextBySeat(seat){
   const p=S.players.find(x=>x.seat===seat);const color=p?.color||g?.players?.[seat]?.name||colors[seat]?.name||"Игрок";
   return p?`${p.name} — ${color}`:color;
 }
 function setConnection(text,ok=null){
   const e=document.querySelector("#onlineConnection");if(!e)return;
   e.textContent=text;e.classList.remove("ok","bad");if(ok===true)e.classList.add("ok");if(ok===false)e.classList.add("bad");
 }
 function send(obj){
   if(!S.socket||S.socket.readyState!==WebSocket.OPEN)return false;
   S.socket.send(JSON.stringify(obj));return true;
 }
 const chatBubbleTimers=new Map();

 function setChatVisible(show){
   const card=document.querySelector("#chatCard");
   if(card)card.hidden=!show;
   if(!show){
     const input=document.querySelector("#chatInput");
     if(input)input.value="";
     document.querySelector("#chatBubbleLayer")?.replaceChildren();
     for(const t of chatBubbleTimers.values())clearTimeout(t);
     chatBubbleTimers.clear();
     S.chatHistory=[];
     renderChatHistory();
   }
 }

 function cleanChatText(value){
   return String(value||"").replace(/[\u0000-\u001f\u007f]/g," ")
     .replace(/\s+/g," ").trim().slice(0,80);
 }

 function chatPlacement(seat){
   const p=S.players.find(x=>x.seat===seat);
   const c=String(p?.color||"").toLowerCase();
   if(c.includes("крас"))return "chatBubbleBottom";
   if(c.includes("чёр")||c.includes("чер"))return "chatBubbleLeft";
   // "Бело-синий" тоже содержит "син", поэтому его проверяем раньше.
   if(c.includes("бело"))return "chatBubbleRight";
   if(c.includes("син"))return "chatBubbleTop";
   return ["chatBubbleBottom","chatBubbleLeft","chatBubbleTop","chatBubbleRight"][seat%4]||"chatBubbleBottom";
 }

 function chatAccent(seat){
   const p=S.players.find(x=>x.seat===seat);
   const c=String(p?.color||"").toLowerCase();
   if(c.includes("крас"))return "#df2735";
   if(c.includes("чёр")||c.includes("чер"))return "#262626";
   if(c.includes("син")&&!c.includes("бело"))return "#008fa5";
   if(c.includes("бело"))return "#3178b8";
   return "#8b5b32";
 }

 function renderChatHistory(){
   const box=document.querySelector("#chatHistory");
   if(!box)return;
   box.replaceChildren();
   const items=(S.chatHistory||[]).slice(-30);
   if(!items.length){
     const empty=document.createElement("div");
     empty.className="chatHistoryEmpty";
     empty.textContent="Пока сообщений нет";
     box.appendChild(empty);
     return;
   }
   for(const m of items){
     const row=document.createElement("div");
     row.className="chatHistoryRow";
     row.style.setProperty("--chat-accent",chatAccent(Number(m.seat)));
     const who=document.createElement("b");
     who.textContent=String(m.name||"Игрок").slice(0,24);
     const msg=document.createElement("span");
     msg.textContent=cleanChatText(m.text);
     row.append(who,msg);
     box.appendChild(row);
   }
   box.scrollTop=box.scrollHeight;
 }
 function setChatHistory(items){
   S.chatHistory=Array.isArray(items)?items.slice(-30):[];
   renderChatHistory();
 }
 function appendChatHistory(m){
   const clean={seat:Number(m.seat),name:String(m.name||"Игрок").slice(0,24),text:cleanChatText(m.text),ts:Number(m.ts)||Date.now()};
   if(!clean.text)return;
   S.chatHistory.push(clean);
   if(S.chatHistory.length>30)S.chatHistory.splice(0,S.chatHistory.length-30);
   renderChatHistory();
 }

 function showChatBubble(m){
   const layer=document.querySelector("#chatBubbleLayer");
   if(!layer)return;
   const seat=Number(m.seat);
   const key=Number.isInteger(seat)?seat:String(m.name||"player");

   const previous=layer.querySelector(`[data-chat-seat="${CSS.escape(String(key))}"]`);
   if(previous)previous.remove();
   if(chatBubbleTimers.has(key))clearTimeout(chatBubbleTimers.get(key));

   const bubble=document.createElement("div");
   bubble.className=`chatBubble ${chatPlacement(seat)}`;
   bubble.dataset.chatSeat=String(key);
   bubble.style.setProperty("--chat-accent",chatAccent(seat));

   const who=document.createElement("b");
   who.textContent=String(m.name||"Игрок").slice(0,24);

   const msg=document.createElement("span");
   msg.textContent=cleanChatText(m.text);

   bubble.append(who,msg);
   layer.appendChild(bubble);
   requestAnimationFrame(()=>bubble.classList.add("show"));

   const timer=setTimeout(()=>{
     bubble.classList.remove("show");
     bubble.classList.add("hide");
     setTimeout(()=>bubble.remove(),260);
     chatBubbleTimers.delete(key);
   },4300);
   chatBubbleTimers.set(key,timer);
 }

 function sendChat(text){
   const clean=cleanChatText(text);
   if(!clean||!S.active||!S.started||!S.connected)return false;
   const ok=send({type:"chat_message",code:S.code,text:clean});
   if(ok){
     const input=document.querySelector("#chatInput");
     if(input)input.value="";
   }
   return ok;
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
       else if(S.randomSearching){setRandomStatus("Связь потеряна. Нажмите «Искать снова».",false);setRandomForm(false)}
     };
   });
 }
 async function reconnect(){
   try{await connect();send({type:"reconnect_room",code:S.code,token:S.token,name:S.name,...profilePayload()})}catch(e){S.reconnectTimer=setTimeout(reconnect,2500)}
 }
 function saveSession(){try{localStorage.setItem("mondavoshka-online",JSON.stringify({code:S.code,token:S.token,name:S.name}))}catch{}}
 function clearSession(){try{localStorage.removeItem("mondavoshka-online")}catch{}}

 function showLobby(){
   closeGameMenus();
   document.querySelector("#onlineLobbyModal")?.classList.add("show");
   renderLobby();
 }
 function renderLobby(){
   const title=document.querySelector("#lobbyHeading");if(title)title.textContent=S.matchMode==="random"?"Случайная онлайн-партия":"Онлайн-комната";
   const codeBox=document.querySelector("#roomCodeBox");if(codeBox)codeBox.style.display=S.matchMode==="random"?"none":"grid";
   const code=document.querySelector("#lobbyCode");if(code)code.textContent=S.code||"------";
   const box=document.querySelector("#lobbyPlayers");if(box){
     box.innerHTML="";
     S.players.slice().sort((a,b)=>a.seat-b.seat).forEach(p=>{
       const d=document.createElement("div");d.className="lobbyPlayer"+(p.connected?"":" offline");
       const dot=document.createElement("span");dot.className="lobbyDot";dot.style.background=colors[p.seat]?.fill||"#999";
       const text=document.createElement("span");text.textContent=`${p.name} — ${p.color||colors[p.seat]?.name||"Игрок"}${p.bot?" • компьютер":""}${p.host?" • создатель":""}${p.connected?"":" • не в сети"}`;
       d.append(dot,text);
       if(p.seat===S.seat){const you=document.createElement("span");you.className="you";you.textContent="это вы";d.appendChild(you)}
       box.appendChild(d);
     });
   }
   const btn=document.querySelector("#startOnlineGame");
   const connectedCount=S.players.filter(p=>p.connected&&!p.bot).length;
   if(btn){btn.style.display=S.host?"":"none";btn.disabled=!S.host||connectedCount<2||S.started}
   const fillWrap=document.querySelector("#fillOnlineBotsWrap"),fill=document.querySelector("#fillOnlineBots");
   if(fillWrap)fillWrap.hidden=!(S.host&&!S.started&&(connectedCount===2||connectedCount===3));
   if(fill&&connectedCount>=4){fill.checked=false;S.fillBots=false}
   const timerMode=document.querySelector("#lobbyTimerMode");
   if(timerMode)timerMode.textContent=S.timerEnabled?"⏱ Режим: 25 секунд на ход · 3 просрочки = поражение":"∞ Режим: без таймера";
   const hint=document.querySelector("#lobbyHint");
   if(hint){
     if(S.started)hint.textContent="Партия уже началась.";
     else if(S.matchMode==="random"&&S.host)hint.textContent=`Соперники найдены (${connectedCount}). Можно начинать партию.`;
     else if(S.matchMode==="random")hint.textContent=`Соперники найдены. Ждём, пока ${S.players.find(p=>p.host)?.name||"создатель"} запустит игру.`;
     else if(S.host)hint.textContent=connectedCount<2?"Для начала игры нужен ещё минимум 1 игрок.":`Подключено ${connectedCount}. Можно начинать игру.`;
     else hint.textContent="Ждём, пока создатель комнаты начнёт игру.";
   }
   setConnection(S.connected?"Связь с сервером установлена":"Нет связи с сервером",S.connected);
 }
 function controlsSeat(seat){
   if(S.seat===seat)return true;
   if(S.autoSeat===seat && S.autoControllerSeat===S.seat)return true;
   return !!(S.host&&g?.botSeats?.includes(seat));
 }
 function canAct(){
   return !!(S.active&&S.started&&g&&controlsSeat(g.turn)&&S.connected&&!g.gameOver&&!g.players?.[g.turn]?.eliminated);
 }
 function isBotController(){
   if(S.autoSeat===g?.turn && S.autoControllerSeat===S.seat)return true;
   return !!(S.active&&S.started&&S.host&&g?.botSeats?.includes(g?.turn));
 }
 function applyAutoControl(m){
   if(Object.prototype.hasOwnProperty.call(m,"autoSeat"))S.autoSeat=Number.isInteger(m.autoSeat)?m.autoSeat:null;
   if(Object.prototype.hasOwnProperty.call(m,"autoControllerSeat"))S.autoControllerSeat=Number.isInteger(m.autoControllerSeat)?m.autoControllerSeat:null;
   if(g)g.autoBotSeat=S.autoSeat;
 }
 function maybeContinueAutoTurn(){
   if(!g || S.autoSeat!==g.turn || S.autoControllerSeat!==S.seat)return;
   g.autoBotSeat=S.autoSeat;
   if(g.rolled)scheduleBotMove(380);
   else scheduleBotRoll(420);
 }
 function renderTurnTimer(){
   const card=document.querySelector("#turnTimerCard"),score=document.querySelector("#matchScoreCard");
   if(card)card.hidden=!(S.active&&S.started);
   if(score)score.hidden=!(S.active&&S.started);
   const timer=document.querySelector("#turnTimer"),unit=document.querySelector("#turnTimerUnit"),bar=document.querySelector("#turnTimerBar"),miss=document.querySelector("#missCounter");
   if(!S.timerEnabled){
     if(timer)timer.textContent="∞";
     if(unit)unit.textContent="без лимита";
     if(bar)bar.style.width="100%";
     if(miss)miss.textContent="Таймер отключён — просрочки не считаются";
   }else{
     const left=Math.max(0,S.deadline-Date.now()),sec=Math.max(0,Math.ceil(left/1000));
     if(timer)timer.textContent=String(sec);
     if(unit)unit.textContent="сек";
     if(bar)bar.style.width=`${Math.max(0,Math.min(100,left/25000*100))}%`;
     if(miss){
       const parts=S.players.filter(p=>!p.bot).slice().sort((a,b)=>a.seat-b.seat).map(p=>`${p.name}: ${S.misses[p.seat]||0}/3`);
       miss.textContent=parts.length?`Просрочки — ${parts.join(" · ")}`:"Просрочки: 0 / 3";
     }
   }
   const mp=document.querySelector("#matchPoints");if(mp)mp.textContent=String(S.matchPoints[S.seat]||0);
 }
 setInterval(renderTurnTimer,250);
 function applyTimer(m){
   if(Object.prototype.hasOwnProperty.call(m,"deadline"))S.deadline=Number(m.deadline)||0;
   if(Object.prototype.hasOwnProperty.call(m,"timerEnabled"))S.timerEnabled=m.timerEnabled!==false;
   if(Array.isArray(m.misses))S.misses=m.misses;
   if(Array.isArray(m.matchPoints))S.matchPoints=m.matchPoints;
   renderTurnTimer();
 }
 function refreshControls(){
   if(!S.active||!g)return;
   const mine=canAct();
   const botTurn=!!g?.botSeats?.includes(g.turn);
   const roll=document.querySelector("#roll");
   if(roll)roll.disabled=!(mine&&!botTurn&&!g.rolled&&!animating);
   if(!mine)dice.forEach(b=>b.disabled=true);
   if(!mine&&S.started&&g){
     const current=g.players[g.turn];
     if(current)setStatus(`Сейчас ходит ${current.playerName||playerTextBySeat(g.turn)} — ${current.name}. Ожидайте своей очереди.`.replace(` — ${current.name} — ${current.name}`,` — ${current.name}`));
   }
 }
 function syncState(){
   if(!S.active||!S.started||!S.connected||!g)return;
   if(S.actionSeat!=null&&!controlsSeat(S.actionSeat))return;
   send({type:"state_update",code:S.code,state:JSON.parse(JSON.stringify(g)),status:document.querySelector("#status")?.textContent||""});
 }
 function afterNetworkRollApplied(){refreshControls();if(S.actionSeat!=null&&controlsSeat(S.actionSeat))setTimeout(syncState,30)}
 function requestRoll(){
   if(!canAct()){refreshControls();return}
   const roll=document.querySelector("#roll");if(roll)roll.disabled=true;
   send({type:"roll",code:S.code});
 }
 async function createRoom(){
   setErr("#createOnlineError","");S.matchMode="room";
   S.name=cleanName(document.querySelector("#createPlayerName")?.value);
   S.timerEnabled=document.querySelector("#createTimerMode")?.value!=="off";
   try{await connect();send({type:"create_room",name:S.name,timerEnabled:S.timerEnabled,...profilePayload()})}
   catch(e){setErr("#createOnlineError",`${e.message}. Проверьте адрес онлайн-сервера.`)}
 }
 async function joinRoom(){
   setErr("#joinOnlineError","");S.matchMode="room";
   S.name=cleanName(document.querySelector("#joinPlayerName")?.value);
   const code=normalizeCode(document.querySelector("#roomCode")?.value);
   if(code.length!==6){setErr("#joinOnlineError","Введите 6-значный код комнаты.");return}
   try{await connect();send({type:"join_room",code,name:S.name,...profilePayload()})}
   catch(e){setErr("#joinOnlineError",`${e.message}. Проверьте адрес онлайн-сервера.`)}
 }
 function setRandomStatus(text,searching=null){
   const el=document.querySelector("#randomStatus");if(el)el.textContent=text||"";
   if(searching!==null){const spin=document.querySelector("#randomSpinner");if(spin)spin.style.display=searching?"inline-block":"none"}
 }
 function setRandomForm(searching){
   S.randomSearching=!!searching;
   const find=document.querySelector("#findRandomBtn"),cancel=document.querySelector("#cancelRandomBtn");
   const name=document.querySelector("#randomPlayerName"),size=document.querySelector("#randomPlayerCount"),timerMode=document.querySelector("#randomTimerMode");
   if(find)find.disabled=searching;if(cancel)cancel.style.display=searching?"inline-block":"none";
   if(name)name.disabled=searching;if(size)size.disabled=searching;if(timerMode)timerMode.disabled=searching;
 }
 async function findRandom(){
   setErr("#randomOnlineError","");
   S.name=cleanName(document.querySelector("#randomPlayerName")?.value);
   S.randomSize=Math.max(2,Math.min(4,Number(document.querySelector("#randomPlayerCount")?.value)||2));
   S.timerEnabled=document.querySelector("#randomTimerMode")?.value!=="off";
   S.matchMode="random";setRandomForm(true);setRandomStatus("Подключаемся к серверу…",true);
   try{await connect();send({type:"random_queue",name:S.name,size:S.randomSize,timerEnabled:S.timerEnabled,...profilePayload()});setRandomStatus(S.timerEnabled?"Ищем соперников с таймером 25 секунд…":"Ищем соперников без таймера…",true)}
   catch(e){setRandomForm(false);setRandomStatus("");setErr("#randomOnlineError",`${e.message}. Проверьте адрес онлайн-сервера.`)}
 }
 function cancelRandom(showMenu=false){
   if(S.connected)send({type:"cancel_random"});
   setRandomForm(false);setRandomStatus("Поиск отменён.",false);
   if(showMenu){closeGameMenus();document.querySelector("#mainMenu")?.classList.add("show")}
 }
 function leave(showMenu=true){
   if(S.randomSearching&&!S.active)send({type:"cancel_random"});
   if(S.connected&&S.code)send({type:"leave_room",code:S.code,forfeit:false});
   S.manualClose=true;try{S.socket?.close()}catch{}
   clearTimeout(S.reconnectTimer);
   S.socket=null;S.active=false;S.connected=false;S.started=false;S.code=null;S.token=null;S.seat=null;S.host=false;S.players=[];S.actionSeat=null;S.pendingStart=false;S.lastVersion=0;S.randomSearching=false;S.matchMode="room";S.deadline=0;S.misses=[];S.matchPoints=[];S.timerEnabled=true;S.chatHistory=[];
   clearSession();gameMode="local";setChatVisible(false);
   if(showMenu){closeGameMenus();document.querySelector("#mainMenu")?.classList.add("show")}
 }
 function forfeitAndLeave(){
   if(S.connected&&S.code&&S.started){
     send({type:"leave_room",code:S.code,forfeit:true});
     setTimeout(()=>leave(true),180);
   }else{
     leave(true);
   }
 }
 function startGame(wish){
   const realPlayers=S.players.filter(p=>p.connected&&!p.bot);
   if(!S.host||realPlayers.length<2)return;
   S.fillBots=!!document.querySelector("#fillOnlineBots")?.checked && realPlayers.length<4;
   const n=S.fillBots?4:realPlayers.length;
   const state=buildGameState(n,wish);
   send({type:"start_game",code:S.code,wish,state,fillBots:S.fillBots});
   S.pendingStart=false;
 }
 function acceptRoomMessage(m,mode){
   S.active=true;S.connected=true;S.randomSearching=false;S.matchMode=mode||S.matchMode;setRandomForm(false);
   S.code=m.code;S.token=m.token;S.seat=m.seat;S.host=!!m.host;S.players=m.players||[];S.started=!!m.started;S.lastVersion=m.version||0;S.deadline=m.deadline||0;S.misses=m.misses||[];S.matchPoints=m.matchPoints||[];
   if(Object.prototype.hasOwnProperty.call(m,"timerEnabled"))S.timerEnabled=m.timerEnabled!==false;
   if(Array.isArray(m.chatHistory))setChatHistory(m.chatHistory);
   saveSession();showLobby();
   if(m.started&&m.state){
     S.started=true;setChatVisible(true);
     startOnlineGameState(m.state,m.status||"Вы вернулись в онлайн-партию.");refreshControls()
   }
 }
 function handle(m){
   if(!m||typeof m.type!=="string")return;
   if(m.type==="error"){
     const text=m.message||"Ошибка онлайн-игры";
     if(document.querySelector("#onlineCreateModal")?.classList.contains("show"))setErr("#createOnlineError",text);
     else if(document.querySelector("#onlineJoinModal")?.classList.contains("show"))setErr("#joinOnlineError",text);
     else if(document.querySelector("#randomOnlineModal")?.classList.contains("show")){setErr("#randomOnlineError",text);setRandomForm(false);setRandomStatus("",false)}
     else setStatus(text);
     return;
   }
   if(m.type==="random_waiting"){
     S.randomSearching=true;S.randomSize=m.size||S.randomSize;
     if(Object.prototype.hasOwnProperty.call(m,"timerEnabled"))S.timerEnabled=m.timerEnabled!==false;
     setRandomForm(true);setRandomStatus(`Ищем игроков ${S.timerEnabled?"с таймером":"без таймера"}: ${m.waiting||1} из ${m.size||S.randomSize}. Ваша позиция в очереди: ${m.position||1}.`,true);return;
   }
   if(m.type==="random_cancelled"){S.randomSearching=false;setRandomForm(false);setRandomStatus("Поиск отменён.",false);return}
   if(m.type==="random_matched"){acceptRoomMessage(m,"random");return}
   if(m.type==="room_created"||m.type==="room_joined"||m.type==="room_reconnected"){acceptRoomMessage(m,"room");return}
   if(m.type==="seat_update"){S.seat=m.seat;S.host=!!m.host;S.players=m.players||S.players;renderLobby();return}
   if(m.type==="room_update"){
     S.players=m.players||S.players;S.host=!!S.players.find(p=>p.seat===S.seat)?.host;S.started=!!m.started;
     if(Array.isArray(m.chatHistory))setChatHistory(m.chatHistory);
     applyTimer(m);applyAutoControl(m);renderLobby();return
   }
   if(m.type==="chat_message"){
     appendChatHistory(m);
     showChatBubble(m);
     return;
   }
   if(m.type==="game_started"){
     S.started=true;setChatVisible(true);S.actionSeat=null;S.pendingStart=false;S.lastVersion=m.version||S.lastVersion;
     if(Number.isInteger(m.seat))S.seat=m.seat;
     if(Array.isArray(m.players))S.players=m.players;
     if(Array.isArray(m.chatHistory))setChatHistory(m.chatHistory);
     startOnlineGameState(m.state,m.status||"Жребий цветов проведён. Начинается партия.");applyTimer(m);applyAutoControl(m);refreshControls();maybeContinueAutoTurn();return;
   }
   if(m.type==="roll_result"){
     if((m.version||0)<S.lastVersion)return;
     S.actionSeat=m.seat;S.lastVersion=Math.max(S.lastVersion,m.version||0);
     applyRollValues(m.dice,true,{
       tripleKush:m.tripleKush===true,
       kushStreakCount:Number(m.kushStreakCount)||0,
       kushStreakSeat:Number.isInteger(m.kushStreakSeat)?m.kushStreakSeat:null
     });
     return;
   }
   if(m.type==="state_sync"){
     if((m.version||0)<S.lastVersion)return;
     S.lastVersion=m.version||S.lastVersion;if(m.state)applyOnlineSnapshot(m.state,m.status||"");
     S.actionSeat=m.actionSeat??null;applyTimer(m);applyAutoControl(m);refreshControls();maybeContinueAutoTurn();return;
   }
   if(m.type==="turn_timer"){applyTimer(m);applyAutoControl(m);refreshControls();if(g?.botSeats?.includes(g.turn)&&isBotController())scheduleBotRoll(650);maybeContinueAutoTurn();return}
   if(m.type==="timeout_autoplay"){
     if((m.version||0)<S.lastVersion)return;
     S.lastVersion=m.version||S.lastVersion;
     S.actionSeat=m.seat;
     if(m.state)applyOnlineSnapshot(m.state,m.status||"Время истекло — система делает ход.");
     applyTimer(m);applyAutoControl(m);refreshControls();
     if(Array.isArray(m.dice))applyRollValues(m.dice,true,{
       tripleKush:m.tripleKush===true,
       kushStreakCount:Number(m.kushStreakCount)||0,
       kushStreakSeat:Number.isInteger(m.kushStreakSeat)?m.kushStreakSeat:null
     });
     else maybeContinueAutoTurn();
     return;
   }
   if(m.type==="turn_timeout"){
     if(m.state)applyOnlineSnapshot(m.state,m.status||"Время хода истекло.");
     applyTimer(m);applyAutoControl(m);S.actionSeat=null;refreshControls();if(g?.botSeats?.includes(g.turn)&&isBotController())scheduleBotRoll(650);maybeContinueAutoTurn();return;
   }
   if(m.type==="rating_award"){
     if(m.profile)window.MondavoshkaProfile?.awardFromServer?.(m.profile,m.delta,m.matchPoints,m.reason||"");
     if(Array.isArray(m.matchPoints))S.matchPoints=m.matchPoints;
     renderTurnTimer();return;
   }
   if(m.type==="score_update"){
     if(Array.isArray(m.matchPoints))S.matchPoints=m.matchPoints;
     renderTurnTimer();return;
   }
   if(m.type==="match_over"){
     if(m.state)applyOnlineSnapshot(m.state,m.status||"Партия завершена.");
     S.autoSeat=null;S.autoControllerSeat=null;if(g)g.autoBotSeat=null;
     applyTimer(m);S.actionSeat=null;
     const roll=document.querySelector("#roll");if(roll)roll.disabled=true;
     window.MondavoshkaProfile?.loadLeaderboard?.();
     if(Number.isInteger(m.winnerSeat)){
       setTimeout(()=>window.MondavoshkaVictory?.show?.(m.winnerSeat,m.status||""),250);
     }else{
       setTimeout(()=>window.MondavoshkaVictory?.showEnded?.(m.status||"Партия завершена."),250);
     }
     return;
   }
   if(m.type==="player_left"){
     S.players=m.players||S.players;renderLobby();if(S.started)setStatus(`${m.name||"Игрок"} отключился. Ожидаем возвращения.`);return;
   }
 }

 const chatInput=document.querySelector("#chatInput");
 const sendChatBtn=document.querySelector("#sendChat");
 if(sendChatBtn)sendChatBtn.onclick=()=>{
   if(!sendChat(chatInput?.value||"")){
     const hint=document.querySelector("#chatHint");
     if(hint){hint.textContent="Нет связи с комнатой";setTimeout(()=>hint.textContent="Enter — отправить · максимум 80 знаков",1400)}
   }
 };
 if(chatInput)chatInput.addEventListener("keydown",e=>{
   if(e.key==="Enter"&&!e.shiftKey){
     e.preventDefault();
     sendChat(chatInput.value);
   }
 });
 document.querySelectorAll("#quickEmoji [data-emoji]").forEach(btn=>{
   btn.addEventListener("click",()=>{
     const emoji=btn.dataset.emoji||"";
     // Быстрые реакции отправляются одним нажатием.
     sendChat(emoji);
   });
 });

 document.querySelector("#createOnline").onclick=()=>{closeGameMenus();document.querySelector("#onlineCreateModal").classList.add("show")};
 document.querySelector("#joinOnline").onclick=()=>{closeGameMenus();document.querySelector("#onlineJoinModal").classList.add("show")};
 document.querySelector("#randomOnline").onclick=()=>{closeGameMenus();setRandomForm(false);setRandomStatus("Введите имя и нажмите «Найти соперников».",false);document.querySelector("#randomOnlineModal").classList.add("show")};
 document.querySelector("#createRoomBtn").onclick=createRoom;
 document.querySelector("#joinRoomBtn").onclick=joinRoom;
 document.querySelector("#findRandomBtn").onclick=findRandom;
 document.querySelector("#cancelRandomBtn").onclick=()=>cancelRandom(false);
 document.querySelector("#roomCode").addEventListener("input",e=>e.target.value=normalizeCode(e.target.value));
 document.querySelector("#startOnlineGame").onclick=()=>{
   if(!S.host)return;
   const real=S.players.filter(p=>p.connected&&!p.bot).length;
   S.fillBots=!!document.querySelector("#fillOnlineBots")?.checked&&real<4;
   S.pendingStart=false;
   startGame(null);
 };
 document.querySelector("#leaveOnlineRoom").onclick=()=>leave(true);
 document.querySelector("#copyRoomCode").onclick=async()=>{try{await navigator.clipboard.writeText(S.code||"");document.querySelector("#copyRoomCode").textContent="Скопировано";setTimeout(()=>document.querySelector("#copyRoomCode").textContent="Копировать код",1200)}catch{}};

 const oldShowMain=showMainMenu;
 document.querySelectorAll(".backToMenu").forEach(b=>b.onclick=()=>{if(S.randomSearching&&!S.active)cancelRandom(true);else if(S.active)leave(true);else oldShowMain()});
 document.querySelector("#newGame").onclick=()=>{if(S.randomSearching&&!S.active)cancelRandom(true);else if(S.active)leave(true);else oldShowMain()};

 window.MondavoshkaOnline={
   get active(){return S.active},get connected(){return S.connected},get seat(){return S.seat},get name(){return S.name},get players(){return S.players},get pendingStart(){return S.pendingStart},set pendingStart(v){S.pendingStart=!!v},
   canAct,isBotController,refreshControls,requestRoll,syncState,afterNetworkRollApplied,startGame,leave,forfeitAndLeave,sendChat,wsUrl,playerTextBySeat
 };
})();

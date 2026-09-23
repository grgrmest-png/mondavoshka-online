"use strict";
const http=require("http"),crypto=require("crypto"),fs=require("fs"),path=require("path");
const PORT=Number(process.env.PORT||8080);
const PUBLIC=path.join(__dirname,"public");
const PROFILE_FILE=path.join(__dirname,"profiles.json");
const USED_PURCHASES_FILE=path.join(__dirname,"used-purchases.json");
const TURN_MS=25000,MAX_MISSES=3;
const COLOR_SETS={2:["Красный","Синий"],3:["Красный","Чёрный","Синий"],4:["Красный","Чёрный","Синий","Бело-синий"]};
const rooms=new Map(),randomQueue=[],profiles=new Map(),usedPurchaseTokens=new Set();
const COLORS=["Красный","Чёрный","Синий","Бело-синий"];
const POINT_SKINS=new Set(["default","emerald","violet","gold","orange","pink","lime","ice","silver","burgundy","turquoise"]);
const POINT_TABLES=new Map([["table_classic",0],["table_ice",500],["table_stone",500],["table_neon",600],["table_north",600]]);
const POINT_DICE=new Map([["dice_ivory",0],["dice_gold",300],["dice_ice",300],["dice_obsidian",300],["dice_ruby",300]]);
const ACHIEVEMENT_IDS=new Set(["first_home","first_capture","triple_kush","hunter3","trap_escape","kush_master","first_win","full_house"]);
const PREMIUM_PRODUCTS={
 skin_barcelona:"club_barcelona",
 skin_real_madrid:"club_real_madrid",
 skin_bayern:"club_bayern",
 skin_manchester_city:"club_manchester_city",
 skin_liverpool:"club_liverpool",

 skin_country_russia:"country_russia",
 skin_country_brazil:"country_brazil",
 skin_country_argentina:"country_argentina",
 skin_country_france:"country_france",
 skin_country_germany:"country_germany",
 skin_country_spain:"country_spain",
 skin_country_italy:"country_italy",
 skin_country_japan:"country_japan",
 skin_country_korea:"country_korea",
 skin_country_usa:"country_usa",
 skin_country_kazakhstan:"country_kazakhstan",
 skin_country_china:"country_china"
};
const GUID="258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function loadData(){
 try{const obj=JSON.parse(fs.readFileSync(PROFILE_FILE,"utf8"));for(const [k,v] of Object.entries(obj||{}))profiles.set(k,v)}catch{}
 try{for(const t of JSON.parse(fs.readFileSync(USED_PURCHASES_FILE,"utf8"))||[])usedPurchaseTokens.add(t)}catch{}
}
function saveProfiles(){try{fs.writeFileSync(PROFILE_FILE,JSON.stringify(Object.fromEntries(profiles),null,2))}catch{}}
function saveTokens(){try{fs.writeFileSync(USED_PURCHASES_FILE,JSON.stringify([...usedPurchaseTokens],null,2))}catch{}}
loadData();

function mime(file){const e=path.extname(file).toLowerCase();return ({".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".svg":"image/svg+xml",".json":"application/json; charset=utf-8"})[e]||"application/octet-stream"}
function cors(h={}){return {"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"content-type",...h}}
function json(res,status,obj){res.writeHead(status,cors({"content-type":"application/json; charset=utf-8","cache-control":"no-store"}));res.end(JSON.stringify(obj))}
function readBody(req,limit=200000){return new Promise((resolve,reject)=>{let b="";req.on("data",c=>{b+=c;if(b.length>limit){reject(new Error("too large"));req.destroy()}});req.on("end",()=>resolve(b));req.on("error",reject)})}
function safeName(x){return String(x||"Игрок").replace(/[<>\u0000-\u001f]/g,"").trim().slice(0,24)||"Игрок"}
function safeChatText(x){return String(x||"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,80)}
function timerEnabledValue(v){return !(v===false||v===0||v==="0"||String(v).toLowerCase()==="false"||String(v).toLowerCase()==="off")}
function safeProfileId(x){return String(x||"").replace(/[^a-zA-Z0-9_.:-]/g,"").slice(0,120)}
function safeSkin(x){const s=String(x||"default");return POINT_SKINS.has(s)||Object.values(PREMIUM_PRODUCTS).includes(s)?s:"default"}
function safeTable(x){const s=String(x||"table_classic");return POINT_TABLES.has(s)?s:"table_classic"}
function safeDice(x){const s=String(x||"dice_ivory");return POINT_DICE.has(s)?s:"dice_ivory"}
function safeAchievement(x){const s=String(x||"");return ACHIEVEMENT_IDS.has(s)?s:null}
function safeAvatar(x){const s=String(x||"animal:tiger");if(/^animal:(tiger|lion|bear|wolf|eagle|fox)$/.test(s))return s;if(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(s)&&s.length<=18000)return s;return "animal:tiger"}
function getProfile(id,name=null,seed=null){
 id=safeProfileId(id)||("guest-"+crypto.randomBytes(8).toString("hex"));
 let p=profiles.get(id);
 if(!p){
   p={id,name:safeName(name||"Игрок"),rating:Math.max(0,+seed?.rating||0),balance:Math.max(0,+seed?.balance||0),wins:Math.max(0,+seed?.wins||0),games:Math.max(0,+seed?.games||0),owned:["default"],equipped:"default",avatar:safeAvatar(seed?.avatar),ownedTables:["table_classic"],equippedTable:"table_classic",ownedDice:["dice_ivory"],equippedDice:"dice_ivory",achievements:[],updatedAt:Date.now()};
   if(Array.isArray(seed?.owned))p.owned=[...new Set(["default",...seed.owned.map(safeSkin)])];
   if(seed?.equipped&&p.owned.includes(safeSkin(seed.equipped)))p.equipped=safeSkin(seed.equipped);
   if(Array.isArray(seed?.ownedTables))p.ownedTables=[...new Set(["table_classic",...seed.ownedTables.map(safeTable)])];
   if(seed?.equippedTable&&p.ownedTables.includes(safeTable(seed.equippedTable)))p.equippedTable=safeTable(seed.equippedTable);
   if(Array.isArray(seed?.ownedDice))p.ownedDice=[...new Set(["dice_ivory",...seed.ownedDice.map(safeDice)])];
   if(seed?.equippedDice&&p.ownedDice.includes(safeDice(seed.equippedDice)))p.equippedDice=safeDice(seed.equippedDice);
   if(Array.isArray(seed?.achievements))p.achievements=[...new Set(seed.achievements.map(safeAchievement).filter(Boolean))];
   profiles.set(id,p);saveProfiles();
 }else{
   if(name)p.name=safeName(name);p.avatar=safeAvatar(p.avatar);p.ownedTables=Array.isArray(p.ownedTables)?p.ownedTables:["table_classic"];p.equippedTable=safeTable(p.equippedTable);p.ownedDice=Array.isArray(p.ownedDice)?p.ownedDice:["dice_ivory"];p.equippedDice=safeDice(p.equippedDice);p.achievements=Array.isArray(p.achievements)?p.achievements:[];p.updatedAt=Date.now();
 }
 return p;
}
function pubProfile(p){return {id:p.id,name:p.name,rating:p.rating||0,balance:p.balance||0,wins:p.wins||0,games:p.games||0,owned:p.owned||["default"],equipped:p.equipped||"default",avatar:safeAvatar(p.avatar),ownedTables:p.ownedTables||["table_classic"],equippedTable:safeTable(p.equippedTable),ownedDice:p.ownedDice||["dice_ivory"],equippedDice:safeDice(p.equippedDice),achievements:(p.achievements||[]).map(safeAchievement).filter(Boolean)}}
function leaderboard(limit=30){return [...profiles.values()].sort((a,b)=>(b.rating||0)-(a.rating||0)||(b.wins||0)-(a.wins||0)).slice(0,limit).map(pubProfile)}
function verifySignedBlob(signature){
 const key=String(process.env.YANDEX_GAMES_SECRET||"");
 if(!key)throw new Error("YANDEX_GAMES_SECRET не задан на сервере.");
 const parts=String(signature||"").split(".");if(parts.length!==2)throw new Error("Некорректная подпись Яндекс Игр.");
 const sign=Buffer.from(parts[0],"base64"),message=Buffer.from(parts[1],"base64");
 const calc=crypto.createHmac("sha256",Buffer.from(key,"utf8")).update(message).digest();
 if(sign.length!==calc.length||!crypto.timingSafeEqual(sign,calc))throw new Error("Подпись покупки не прошла проверку.");
 return JSON.parse(message.toString("utf8"));
}
function processPurchaseData(payload){
 const list=Array.isArray(payload?.data)?payload.data:[payload?.data].filter(Boolean);
 let lastProfile=null;
 for(const d of list){
   const token=String(d?.token||"");const product=d?.product||{};const productId=String(product.id||"");
   if(!token||!PREMIUM_PRODUCTS[productId])continue;
   let developer={};try{developer=JSON.parse(d.developerPayload||"{}")}catch{}
   const profileId=safeProfileId(developer.profileId);if(!profileId)continue;
   const p=getProfile(profileId,developer.name||"Игрок");
   const skin=PREMIUM_PRODUCTS[productId];
   if(!p.owned.includes(skin))p.owned.push(skin);
   p.equipped=skin;p.updatedAt=Date.now();lastProfile=p;
   if(!usedPurchaseTokens.has(token)){usedPurchaseTokens.add(token)}
 }
 saveProfiles();saveTokens();return lastProfile;
}
async function handleApi(req,res,u){
 if(req.method==="OPTIONS"){res.writeHead(204,cors());res.end();return true}
 if(req.method==="GET"&&u.pathname==="/api/leaderboard"){
   json(res,200,{entries:leaderboard(Math.max(1,Math.min(100,+u.searchParams.get("limit")||30)))});return true
 }
 if(req.method==="GET"&&u.pathname==="/api/profile"){
   const id=safeProfileId(u.searchParams.get("id"));if(!id){json(res,400,{error:"id required"});return true}
   json(res,200,{profile:pubProfile(getProfile(id,null))});return true
 }
 if(req.method==="POST"&&["/api/sync-profile","/api/buy-skin","/api/equip-skin","/api/buy-cosmetic","/api/equip-cosmetic"].includes(u.pathname)){
   let body;try{body=JSON.parse(await readBody(req)||"{}")}catch{json(res,400,{error:"bad json"});return true}
   const id=safeProfileId(body.id);if(!id){json(res,400,{error:"profile id required"});return true}
   if(u.pathname==="/api/sync-profile"){
     const exists=profiles.has(id),p=getProfile(id,body.name||"Игрок",body);
     if(exists){
       p.rating=Math.max(p.rating||0,Math.max(0,+body.rating||0));
       p.wins=Math.max(p.wins||0,Math.max(0,+body.wins||0));
       p.games=Math.max(p.games||0,Math.max(0,+body.games||0));
       if(Array.isArray(body.owned))p.owned=[...new Set([...(p.owned||["default"]),...body.owned.map(safeSkin)])];
       if(body.equipped&&p.owned.includes(safeSkin(body.equipped)))p.equipped=safeSkin(body.equipped);
       if(body.avatar)p.avatar=safeAvatar(body.avatar);
       if(Array.isArray(body.ownedTables))p.ownedTables=[...new Set([...(p.ownedTables||["table_classic"]),...body.ownedTables.map(safeTable)])];
       if(body.equippedTable&&p.ownedTables.includes(safeTable(body.equippedTable)))p.equippedTable=safeTable(body.equippedTable);
       if(Array.isArray(body.ownedDice))p.ownedDice=[...new Set([...(p.ownedDice||["dice_ivory"]),...body.ownedDice.map(safeDice)])];
       if(body.equippedDice&&p.ownedDice.includes(safeDice(body.equippedDice)))p.equippedDice=safeDice(body.equippedDice);
       if(Array.isArray(body.achievements))p.achievements=[...new Set([...(p.achievements||[]),...body.achievements.map(safeAchievement).filter(Boolean)])];
       // Баланс с клиента принимаем вверх только как восстановление после нового деплоя.
       p.balance=Math.max(p.balance||0,Math.max(0,+body.balance||0));
       saveProfiles();
     }
     json(res,200,{profile:pubProfile(p)});return true
   }
   const p=getProfile(id,body.name||null);
   if(u.pathname==="/api/buy-cosmetic"||u.pathname==="/api/equip-cosmetic"){
     const kind=body.kind==="table"?"table":body.kind==="dice"?"dice":"";
     if(!kind){json(res,400,{error:"Неизвестный вид оформления."});return true}
     const item=kind==="table"?safeTable(body.itemId):safeDice(body.itemId);
     const prices=kind==="table"?POINT_TABLES:POINT_DICE;
     const ownedKey=kind==="table"?"ownedTables":"ownedDice",equippedKey=kind==="table"?"equippedTable":"equippedDice";
     p[ownedKey]=Array.isArray(p[ownedKey])?p[ownedKey]:(kind==="table"?["table_classic"]:["dice_ivory"]);
     if(u.pathname==="/api/buy-cosmetic"){
       const price=prices.get(item);
       if(price==null||price<=0){json(res,400,{error:"Этот предмет не продаётся."});return true}
       if(!p[ownedKey].includes(item)){
         if((p.balance||0)<price){json(res,400,{error:`Нужно ${price} очков на балансе.`});return true}
         p.balance-=price;p[ownedKey].push(item);
       }
       p[equippedKey]=item;saveProfiles();json(res,200,{profile:pubProfile(p)});return true
     }
     if(!p[ownedKey].includes(item)){json(res,400,{error:"Этот предмет ещё не куплен."});return true}
     p[equippedKey]=item;saveProfiles();json(res,200,{profile:pubProfile(p)});return true
   }
   const skin=safeSkin(body.skinId);
   if(u.pathname==="/api/buy-skin"){
     if(!POINT_SKINS.has(skin)||skin==="default"){json(res,400,{error:"Эта фишка не продаётся за очки."});return true}
     if(p.owned.includes(skin)){json(res,200,{profile:pubProfile(p)});return true}
     if((p.balance||0)<200){json(res,400,{error:"Нужно 200 очков на балансе."});return true}
     p.balance-=200;p.owned.push(skin);p.equipped=skin;saveProfiles();json(res,200,{profile:pubProfile(p)});return true
   }
   if(!p.owned.includes(skin)){json(res,400,{error:"Эта фишка ещё не куплена."});return true}
   p.equipped=skin;saveProfiles();json(res,200,{profile:pubProfile(p)});return true
 }
 if(req.method==="POST"&&(u.pathname==="/api/validate-purchase"||u.pathname==="/api/purchases-sync")){
   try{
     const signature=await readBody(req);const payload=verifySignedBlob(signature);const p=processPurchaseData(payload);
     if(!p){json(res,400,{error:"В подписи нет поддерживаемой покупки."});return true}
     json(res,200,{ok:true,profile:pubProfile(p)})
   }catch(e){json(res,400,{error:e.message||"Ошибка проверки покупки"})}
   return true
 }
 return false
}
function serve(req,res){
 const u=new URL(req.url,"http://localhost");
 handleApi(req,res,u).then(done=>{
   if(done)return;
   if(u.pathname==="/health"){json(res,200,{ok:true,rooms:rooms.size,randomQueue:randomQueue.length,profiles:profiles.size});return}
   let rel=decodeURIComponent(u.pathname);if(rel==="/")rel="/index.html";
   const file=path.normalize(path.join(PUBLIC,rel));
   if(!file.startsWith(PUBLIC)){res.writeHead(403);res.end("Forbidden");return}
   fs.stat(file,(err,st)=>{if(err||!st.isFile()){res.writeHead(404);res.end("Not found");return}res.writeHead(200,cors({"content-type":mime(file),"cache-control":"no-cache"}));fs.createReadStream(file).pipe(res)});
 }).catch(e=>json(res,500,{error:e.message||"server error"}));
}
const server=http.createServer(serve);

function frameText(text,opcode=1){
 const payload=Buffer.from(text);let head;
 if(payload.length<126){head=Buffer.alloc(2);head[0]=0x80|opcode;head[1]=payload.length}
 else if(payload.length<65536){head=Buffer.alloc(4);head[0]=0x80|opcode;head[1]=126;head.writeUInt16BE(payload.length,2)}
 else{head=Buffer.alloc(10);head[0]=0x80|opcode;head[1]=127;head.writeBigUInt64BE(BigInt(payload.length),2)}
 return Buffer.concat([head,payload]);
}
function send(ws,obj){if(!ws||ws.destroyed)return;try{ws.write(frameText(JSON.stringify(obj)))}catch{}}
function sendControl(ws,opcode,payload=Buffer.alloc(0)){if(!ws||ws.destroyed)return;try{let h=Buffer.from([0x80|opcode,payload.length]);ws.write(Buffer.concat([h,payload]))}catch{}}
function roomCode(){for(let i=0;i<50;i++){const c=String(crypto.randomInt(100000,1000000));if(!rooms.has(c))return c}throw new Error("code")}
function token(){return crypto.randomBytes(18).toString("hex")}
function roomColors(room){return COLOR_SETS[room.state?.players?.length||room.players.length]||COLOR_SETS[4]}
function playerList(room){const cs=roomColors(room);return room.players.map(p=>({seat:p.seat,name:p.name,connected:p.bot?true:!!p.connected,bot:!!p.bot,host:!!p.host,color:cs[p.seat]||COLORS[p.seat],profileId:p.profileId||null,skinId:p.skinId||"default",avatar:safeAvatar(p.avatar||(p.profileId?profiles.get(p.profileId)?.avatar:null)),rating:p.profileId?(profiles.get(p.profileId)?.rating||0):0,eliminated:!!room.state?.players?.[p.seat]?.eliminated,misses:room.misses?.[p.seat]||0})).sort((a,b)=>a.seat-b.seat)}
function broadcast(room,obj){for(const p of room.players)if(p.connected&&p.ws)send(p.ws,obj)}
function roomUpdate(room){broadcast(room,{type:"room_update",code:room.code,players:playerList(room),started:room.started,deadline:room.deadline||0,misses:room.misses||[],matchPoints:room.matchPoints||[],timerEnabled:room.timerEnabled!==false,chatHistory:room.chatHistory||[],autoSeat:room.autoSeat,autoControllerSeat:room.autoControllerSeat})}
function err(ws,message){send(ws,{type:"error",message})}
function attach(ws,p,room){p.ws=ws;p.connected=true;ws._room=room.code;ws._token=p.token;ws._seat=p.seat}
function findFreeSeat(room){for(let s=0;s<4;s++)if(!room.players.some(p=>p.seat===s))return s;return -1}
function compactSeats(room){
 room.players.sort((a,b)=>a.seat-b.seat);
 room.players.forEach((p,i)=>{p.seat=i});
 for(const p of room.players)if(p.connected&&p.ws)send(p.ws,{type:"seat_update",seat:p.seat,host:p.host,players:playerList(room)});
}
function validateState(room,state,expected=room.players.length){
 if(!state||typeof state!=="object"||!Array.isArray(state.players))return false;
 if(state.players.length!==expected)return false;
 if(!Number.isInteger(state.turn)||state.turn<0||state.turn>=state.players.length)return false;
 if(!Array.isArray(state.d)||state.d.length!==2||!Array.isArray(state.used)||state.used.length!==2)return false;
 for(let i=0;i<state.players.length;i++){const pl=state.players[i];if(!pl||pl.owner!==i||!Array.isArray(pl.pieces)||pl.pieces.length!==5)return false}
 return JSON.stringify(state).length<65000;
}
function queueSize(v){const n=Number(v);return Number.isInteger(n)&&n>=2&&n<=4?n:2}
function queueEntries(size,timerEnabled=true){return randomQueue.filter(e=>e.size===size&&e.timerEnabled===timerEnabled&&!e.ws.destroyed&&!e.ws._room)}
function notifyRandomQueue(size,timerEnabled=true){
 const active=queueEntries(size,timerEnabled);
 active.forEach((e,i)=>send(e.ws,{type:"random_waiting",size,timerEnabled,waiting:active.length,position:i+1}));
}
function removeFromRandomQueue(ws,notify=true){
 const affected=[];
 for(let i=randomQueue.length-1;i>=0;i--){
   if(randomQueue[i].ws===ws){
     affected.push([randomQueue[i].size,randomQueue[i].timerEnabled]);
     randomQueue.splice(i,1);
   }
 }
 ws._randomQueued=false;ws._randomSize=null;ws._randomTimerEnabled=null;
 if(notify){
   const seen=new Set();
   for(const [size,timerEnabled] of affected){
     const key=`${size}:${timerEnabled}`;
     if(seen.has(key))continue;
     seen.add(key);notifyRandomQueue(size,timerEnabled);
   }
 }
}
function playerFromMessage(m,seat,host,ws){
 const profileId=safeProfileId(m.profileId);const p=profileId?getProfile(profileId,m.name||"Игрок",{rating:m.rating||0}):null;
 return {seat,name:safeName(m.name),token:token(),host,connected:true,ws,profileId:profileId||null,skinId:safeSkin(m.skinId||(p?.equipped)||"default"),avatar:safeAvatar(m.avatar||(p?.avatar)||"animal:tiger")};
}
function botPlayer(i){return {seat:-1,name:`Компьютер ${i}`,token:`bot-${crypto.randomBytes(8).toString("hex")}`,host:false,connected:true,ws:null,profileId:null,skinId:"default",avatar:"animal:bear",bot:true}}
function shufflePlayersForColors(room){
 for(let i=room.players.length-1;i>0;i--){const j=crypto.randomInt(0,i+1);[room.players[i],room.players[j]]=[room.players[j],room.players[i]]}
 room.players.forEach((p,i)=>p.seat=i);
 for(const p of room.players)if(!p.bot&&p.connected&&p.ws)send(p.ws,{type:"seat_update",seat:p.seat,host:!!p.host,players:playerList(room)});
}
function canControlSeat(room,p,seat){
 return p.seat===seat
   || (!!p.host&&!!room.state?.botSeats?.includes(seat))
   || (room.autoSeat===seat && room.autoControllerSeat===p.seat);
}
function stampPlayerNames(room,state){
 if(!state||!Array.isArray(state.players))return state;
 for(const rp of room.players)if(state.players[rp.seat]){
   state.players[rp.seat].playerName=rp.name;state.players[rp.seat].profileId=rp.profileId||null;state.players[rp.seat].skinId=rp.skinId||"default";state.players[rp.seat].bot=!!rp.bot;
   if(room.state?.players?.[rp.seat]?.eliminated)state.players[rp.seat].eliminated=true;
 }
 return state;
}
function createRoomObject(code,players,random=false,targetSize=null,timerEnabled=true){
 return {code,players,started:false,state:null,status:"",actionSeat:null,version:1,lastActive:Date.now(),random,targetSize,
   timerEnabled:timerEnabled!==false,deadline:0,timeoutInProgress:false,
   misses:Array(players.length).fill(0),matchPoints:Array(players.length).fill(0),awardedHomes:Array(players.length).fill(0),
   kushStreakSeat:null,kushStreakCount:0,
   chatHistory:[],gameOver:false,winnerSeat:null,autoSeat:null,autoControllerSeat:null};
}
function tryRandomMatch(size,timerEnabled=true){
 const active=queueEntries(size,timerEnabled);if(active.length<size){notifyRandomQueue(size,timerEnabled);return}
 const picked=active.slice(0,size);for(const e of picked)removeFromRandomQueue(e.ws,false);
 const code=roomCode();const players=picked.map((e,seat)=>playerFromMessage(e,seat,seat===0,e.ws));
 const room=createRoomObject(code,players,true,size,timerEnabled);rooms.set(code,room);players.forEach(p=>attach(p.ws,p,room));
 players.forEach(p=>send(p.ws,{type:"random_matched",code,token:p.token,seat:p.seat,host:p.host,players:playerList(room),started:false,version:room.version,random:true,targetSize:size,timerEnabled:room.timerEnabled,chatHistory:room.chatHistory,misses:room.misses,matchPoints:room.matchPoints}));
 roomUpdate(room);notifyRandomQueue(size,timerEnabled);
}
function enqueueRandom(ws,m){
 if(ws._room)return err(ws,"Вы уже находитесь в комнате.");removeFromRandomQueue(ws,false);
 const size=queueSize(m.size),timerEnabled=timerEnabledValue(m.timerEnabled);
 const entry={ws,name:safeName(m.name),size,timerEnabled,queuedAt:Date.now(),profileId:safeProfileId(m.profileId),skinId:safeSkin(m.skinId),avatar:safeAvatar(m.avatar),rating:+m.rating||0};
 randomQueue.push(entry);ws._randomQueued=true;ws._randomSize=size;ws._randomTimerEnabled=timerEnabled;
 const active=queueEntries(size,timerEnabled);
 send(ws,{type:"random_waiting",size,timerEnabled,waiting:active.length,position:active.length});tryRandomMatch(size,timerEnabled);
}
function nextActiveSeat(state,from){
 for(let k=1;k<=state.players.length;k++){const s=(from+k)%state.players.length;if(!state.players[s]?.eliminated)return s}
 return from;
}
function activeSeats(state){return state.players.map((p,i)=>p.eliminated?null:i).filter(x=>x!==null)}
function resetTurnState(state){
 state.rolled=false;state.double=false;state.forcedSix=false;state.used=[false,false];state.selected=null;state.sum=false;state.trapOnlySelection=false;state.resumeStack=[];state.pendingGiftSeat=null;
}
function registerKushRoll(room,seat,dice){
 const isDouble=Array.isArray(dice)&&dice.length===2&&Number(dice[0])===Number(dice[1]);

 if(!isDouble){
   room.kushStreakSeat=null;
   room.kushStreakCount=0;
   return {tripleKush:false,kushStreakSeat:null,kushStreakCount:0};
 }

 if(room.kushStreakSeat===seat)room.kushStreakCount=(Number(room.kushStreakCount)||0)+1;
 else{
   room.kushStreakSeat=seat;
   room.kushStreakCount=1;
 }

 if(room.kushStreakCount>=3){
   // Третий куш уже подтверждён сервером. Следующая серия начнётся с нуля.
   room.kushStreakSeat=null;
   room.kushStreakCount=0;
   return {tripleKush:true,kushStreakSeat:seat,kushStreakCount:0};
 }

 return {
   tripleKush:false,
   kushStreakSeat:seat,
   kushStreakCount:room.kushStreakCount
 };
}

function startTurnTimer(room){
 if(!room.started||room.gameOver||!room.state)return;
 room.timeoutInProgress=false;
 room.deadline=room.timerEnabled===false?0:Date.now()+TURN_MS;
 broadcast(room,{type:"turn_timer",turn:room.state.turn,deadline:room.deadline,timerEnabled:room.timerEnabled!==false,misses:room.misses,matchPoints:room.matchPoints,autoSeat:room.autoSeat,autoControllerSeat:room.autoControllerSeat});
}
function homeCount(state,seat){return state.players?.[seat]?.pieces?.filter(x=>x.state==="home").length||0}
function awardHomePoints(room,state){
 for(let seat=0;seat<state.players.length;seat++){
   const count=Math.max(0,Math.min(5,homeCount(state,seat))),target=count*20,prev=room.matchPoints[seat]||0;
   if(target<=prev)continue;
   const delta=target-prev;room.matchPoints[seat]=target;room.awardedHomes[seat]=count;
   const rp=room.players.find(x=>x.seat===seat);
   if(rp?.profileId){const p=getProfile(rp.profileId,rp.name);p.rating=(p.rating||0)+delta;p.balance=(p.balance||0)+delta;p.updatedAt=Date.now();saveProfiles();send(rp.ws,{type:"rating_award",delta,matchPoints:target,profile:pubProfile(p)})}
 }
 broadcast(room,{type:"score_update",matchPoints:room.matchPoints});
}
function finishMatch(room,winnerSeat,reason){
 if(room.gameOver)return;
 room.gameOver=true;room.winnerSeat=winnerSeat;room.deadline=0;room.actionSeat=null;room.autoSeat=null;room.autoControllerSeat=null;
 if(room.state)room.state.gameOver=true;
 for(const rp of room.players){
   if(!rp.profileId)continue;
   const p=getProfile(rp.profileId,rp.name);p.games=(p.games||0)+1;if(rp.seat===winnerSeat)p.wins=(p.wins||0)+1;saveProfiles();
   send(rp.ws,{type:"rating_award",delta:0,matchPoints:room.matchPoints[rp.seat]||0,profile:pubProfile(p)});
 }
 room.version++;
 const winner=room.players.find(x=>x.seat===winnerSeat);
 room.status=reason||`Победил ${winner?.name||"игрок"} — ${roomColors(room)[winnerSeat]||""}.`;
 broadcast(room,{type:"match_over",winnerSeat,state:room.state,status:room.status,deadline:0,timerEnabled:room.timerEnabled,misses:room.misses,matchPoints:room.matchPoints,version:room.version,autoSeat:null,autoControllerSeat:null});
}

function chooseAutoController(room,timedOutSeat){
 const live=room.players
   .filter(p=>!p.bot&&p.connected&&p.ws&&!room.state?.players?.[p.seat]?.eliminated&&p.seat!==timedOutSeat)
   .sort((a,b)=>(a.host?0:1)-(b.host?0:1)||a.seat-b.seat);
 return live[0]||null;
}
function awardAfkCompensation(room,loserSeat,amount=20){
 const recipients=[];
 const reason=`+${amount} очков: соперник проиграл из-за просрочек/выхода из партии`;
 for(const rp of room.players){
   if(rp.bot||rp.seat===loserSeat||room.state?.players?.[rp.seat]?.eliminated||!rp.profileId)continue;
   const p=getProfile(rp.profileId,rp.name);
   p.rating=(p.rating||0)+amount;
   p.balance=(p.balance||0)+amount;
   p.updatedAt=Date.now();
   saveProfiles();
   recipients.push(rp.seat);
   if(rp.connected&&rp.ws)send(rp.ws,{
     type:"rating_award",delta:amount,matchPoints:room.matchPoints[rp.seat]||0,
     profile:pubProfile(p),reason
   });
 }
 return recipients;
}
function finishForcedLoss(room,loserSeat,reason,bonus=20){
 if(room.gameOver)return;
 const loser=room.players.find(x=>x.seat===loserSeat);
 if(room.state?.players?.[loserSeat])room.state.players[loserSeat].eliminated=true;

 const rewarded=awardAfkCompensation(room,loserSeat,bonus);

 room.gameOver=true;
 room.deadline=0;
 room.actionSeat=null;
 room.autoSeat=null;
 room.autoControllerSeat=null;
 room.winnerSeat=null;
 if(room.state)room.state.gameOver=true;

 const remainingReal=room.players.filter(x=>!x.bot&&x.seat!==loserSeat&&!room.state?.players?.[x.seat]?.eliminated);
 let winnerSeat=null;
 if(remainingReal.length===1)winnerSeat=remainingReal[0].seat;

 for(const rp of room.players){
   if(!rp.profileId)continue;
   const p=getProfile(rp.profileId,rp.name);
   p.games=(p.games||0)+1;
   if(rp.seat===winnerSeat)p.wins=(p.wins||0)+1;
   saveProfiles();
   if(rp.connected&&rp.ws)send(rp.ws,{
     type:"rating_award",delta:0,matchPoints:room.matchPoints[rp.seat]||0,profile:pubProfile(p)
   });
 }

 room.version++;
 const rewardedNames=rewarded.map(seat=>room.players.find(x=>x.seat===seat)?.name).filter(Boolean);
 const bonusText=rewardedNames.length
   ? ` Остальные игроки получили по +${bonus} очков: ${rewardedNames.join(", ")}.`
   : "";

 room.status=`${loser?.name||"Игрок"} ${reason}.${bonusText}`;
 broadcast(room,{
   type:"match_over",
   winnerSeat:Number.isInteger(winnerSeat)?winnerSeat:null,
   loserSeat,
   state:room.state,
   status:room.status,
   deadline:0,
   timerEnabled:room.timerEnabled,
   misses:room.misses,
   matchPoints:room.matchPoints,
   version:room.version,
   autoSeat:null,
   autoControllerSeat:null
 });
}

function beginTimeoutAutoplay(room,seat){
 const controller=chooseAutoController(room,seat);
 // If another real client is available, it temporarily runs the same bot
 // engine used by computer opponents. The server remains authoritative for
 // dice, timer count and accepted state updates.
 if(!controller)return false;
 resetTurnState(room.state);
 room.state.turn=seat;
 room.autoSeat=seat;
 room.autoControllerSeat=controller.seat;
 room.actionSeat=seat;
 room.deadline=0;
 const dice=[crypto.randomInt(1,7),crypto.randomInt(1,7)];
 const kush=registerKushRoll(room,seat,dice);
 room.version++;
 const rp=room.players.find(x=>x.seat===seat);
 room.status=`${rp?.name||"Игрок"} не успел за 25 секунд. Просрочка ${room.misses[seat]}/${MAX_MISSES}. Система автоматически делает один ход.`;
 broadcast(room,{
   type:"timeout_autoplay",seat,controllerSeat:controller.seat,dice,...kush,state:room.state,status:room.status,
   deadline:0,timerEnabled:room.timerEnabled,misses:room.misses,matchPoints:room.matchPoints,version:room.version,
   autoSeat:room.autoSeat,autoControllerSeat:room.autoControllerSeat
 });
 return true;
}

function timeoutTurn(room){
 if(!room.started||room.gameOver||!room.state||room.timerEnabled===false||!room.deadline||Date.now()<room.deadline||room.timeoutInProgress)return;

 // Одно истечение таймера = ровно одна просрочка.
 room.timeoutInProgress=true;
 room.deadline=0;

 const seat=room.state.turn;
 if(room.state.players[seat]?.eliminated){
   room.state.turn=nextActiveSeat(room.state,seat);
   room.autoSeat=null;room.autoControllerSeat=null;room.actionSeat=null;
   room.timeoutInProgress=false;
   startTurnTimer(room);return;
 }

 room.misses[seat]=(room.misses[seat]||0)+1;
 const missesCount=room.misses[seat];
 const rp=room.players.find(x=>x.seat===seat);

 // Только третья просрочка завершает партию.
 if(missesCount>=MAX_MISSES){
   resetTurnState(room.state);
   room.actionSeat=null;room.autoSeat=null;room.autoControllerSeat=null;
   finishForcedLoss(room,seat,"трижды не успел сделать ход и автоматически проиграл",20);
   return;
 }

 // Первая и вторая просрочки: один автоматический ход.
 if(beginTimeoutAutoplay(room,seat))return;

 // Если некому выполнить автоход, просто передаём очередь.
 resetTurnState(room.state);
 room.actionSeat=null;room.autoSeat=null;room.autoControllerSeat=null;
 room.state.turn=nextActiveSeat(room.state,seat);room.version++;
 room.status=`${rp?.name||"Игрок"} не успел за 25 секунд. Просрочка ${missesCount}/${MAX_MISSES}. Автоход временно недоступен, очередь передана дальше.`;
 broadcast(room,{
   type:"turn_timeout",seat,missesCount,state:room.state,status:room.status,
   deadline:0,timerEnabled:room.timerEnabled,misses:room.misses,matchPoints:room.matchPoints,version:room.version,
   autoSeat:null,autoControllerSeat:null
 });
 room.timeoutInProgress=false;
 startTurnTimer(room);
}

function onMessage(ws,m){
 if(!m||typeof m.type!=="string")return;
 if(m.type==="random_queue"){enqueueRandom(ws,m);return}
 if(m.type==="cancel_random"){removeFromRandomQueue(ws);send(ws,{type:"random_cancelled"});return}
 if(m.type==="create_room"){
   removeFromRandomQueue(ws);if(ws._room)return err(ws,"Вы уже находитесь в комнате.");
   const code=roomCode(),p=playerFromMessage(m,0,true,ws),timerEnabled=timerEnabledValue(m.timerEnabled),room=createRoomObject(code,[p],false,null,timerEnabled);rooms.set(code,room);attach(ws,p,room);
   send(ws,{type:"room_created",code,token:p.token,seat:0,host:true,players:playerList(room),started:false,version:room.version,timerEnabled:room.timerEnabled,chatHistory:room.chatHistory,misses:room.misses,matchPoints:room.matchPoints});roomUpdate(room);return;
 }
 if(m.type==="join_room"){
   removeFromRandomQueue(ws);const code=String(m.code||""),room=rooms.get(code);if(!room)return err(ws,"Комната с таким кодом не найдена.");
   if(room.started)return err(ws,"Партия уже началась. Новые игроки войти не могут.");const seat=findFreeSeat(room);if(seat<0)return err(ws,"В комнате уже 4 игрока.");
   const p=playerFromMessage(m,seat,false,ws);room.players.push(p);room.misses.push(0);room.matchPoints.push(0);room.awardedHomes.push(0);room.lastActive=Date.now();attach(ws,p,room);
   send(ws,{type:"room_joined",code,token:p.token,seat:p.seat,host:false,players:playerList(room),started:false,version:room.version,timerEnabled:room.timerEnabled,chatHistory:room.chatHistory,misses:room.misses,matchPoints:room.matchPoints});roomUpdate(room);return;
 }
 if(m.type==="reconnect_room"){
   removeFromRandomQueue(ws);const room=rooms.get(String(m.code||""));if(!room)return err(ws,"Комната больше не существует.");
   const p=room.players.find(x=>x.token===m.token);if(!p)return err(ws,"Не удалось восстановить место игрока.");
   p.name=safeName(m.name||p.name);if(m.profileId)p.profileId=safeProfileId(m.profileId);if(m.skinId)p.skinId=safeSkin(m.skinId);if(m.avatar)p.avatar=safeAvatar(m.avatar);attach(ws,p,room);room.lastActive=Date.now();
   send(ws,{type:"room_reconnected",code:room.code,token:p.token,seat:p.seat,host:p.host,players:playerList(room),started:room.started,state:room.state,status:room.status,version:room.version,deadline:room.deadline,timerEnabled:room.timerEnabled,chatHistory:room.chatHistory,misses:room.misses,matchPoints:room.matchPoints,autoSeat:room.autoSeat,autoControllerSeat:room.autoControllerSeat});roomUpdate(room);return;
 }
 const room=rooms.get(String(m.code||ws._room||""));if(!room)return err(ws,"Комната не найдена.");
 const p=room.players.find(x=>x.token===ws._token);if(!p)return err(ws,"Игрок не найден в комнате.");room.lastActive=Date.now();
 if(m.type==="leave_room"){
   if(!room.started){
     room.players=room.players.filter(x=>x.token!==p.token);
     compactSeats(room);
   }else if(m.forfeit){
     finishForcedLoss(room,p.seat,"добровольно вышел из партии и получил поражение",20);
     p.connected=false;p.ws=null;
   }else{
     p.connected=false;p.ws=null;
   }
   ws._room=null;ws._token=null;
   roomUpdate(room);
   if(!room.players.filter(x=>!x.bot).length)rooms.delete(room.code);
   return;
 }
 if(m.type==="chat_message"){
   if(!room.started)return err(ws,"Чат доступен после начала партии.");
   if(p.bot)return;
   const now=Date.now();
   if(now-(p.lastChatAt||0)<650)return;
   const text=safeChatText(m.text);
   if(!text)return;
   p.lastChatAt=now;
   const entry={seat:p.seat,name:p.name,text,ts:now};
   room.chatHistory.push(entry);
   if(room.chatHistory.length>50)room.chatHistory.splice(0,room.chatHistory.length-50);
   broadcast(room,{type:"chat_message",...entry});
   return;
 }
 if(m.type==="start_game"){
   if(!p.host)return err(ws,"Начать игру может только создатель комнаты.");
   const real=room.players.filter(x=>!x.bot&&x.connected);if(real.length<2)return err(ws,"Для игры нужны минимум 2 реальных игрока.");
   if(room.started)return err(ws,"Игра уже началась.");
   const fillBots=!!m.fillBots&&real.length<4,total=fillBots?4:real.length;
   if(!validateState(room,m.state,total))return err(ws,"Некорректное начальное состояние игры.");
   room.players=room.players.filter(x=>!x.bot);
   let bi=1;while(fillBots&&room.players.length<4)room.players.push(botPlayer(bi++));
   shufflePlayersForColors(room);
   room.started=true;room.state=stampPlayerNames(room,m.state);room.state.botSeats=room.players.filter(x=>x.bot).map(x=>x.seat);
   room.misses=Array(total).fill(0);room.matchPoints=Array(total).fill(0);room.awardedHomes=Array(total).fill(0);
   room.deadline=room.timerEnabled===false?0:Date.now()+TURN_MS;room.timeoutInProgress=false;room.actionSeat=null;room.autoSeat=null;room.autoControllerSeat=null;
   room.kushStreakSeat=null;room.kushStreakCount=0;room.version++;
   const first=room.players.find(x=>x.seat===0),color=roomColors(room)[0]||"Красный";
   room.status=room.timerEnabled===false
     ? `Жребий цветов проведён. Первым ходит ${first?.name||"игрок"} — ${color}. Игра без таймера.`
     : `Жребий цветов проведён. Первым ходит ${first?.name||"игрок"} — ${color}. На ход 25 секунд.`;
   for(const rp of room.players)if(!rp.bot&&rp.connected&&rp.ws)send(rp.ws,{type:"game_started",seat:rp.seat,players:playerList(room),state:room.state,status:room.status,version:room.version,deadline:room.deadline,timerEnabled:room.timerEnabled,chatHistory:room.chatHistory,misses:room.misses,matchPoints:room.matchPoints,autoSeat:null,autoControllerSeat:null});
   roomUpdate(room);broadcast(room,{type:"turn_timer",turn:room.state.turn,deadline:room.deadline,timerEnabled:room.timerEnabled,misses:room.misses,matchPoints:room.matchPoints});return;
 }
 if(room.gameOver)return err(ws,"Эта партия уже завершена.");
 if(room.state?.players?.[p.seat]?.eliminated)return err(ws,"Вы выбыли из этой партии.");
 if(m.type==="roll"){
   if(!room.started||!room.state)return err(ws,"Игра ещё не началась.");if(room.actionSeat!==null)return err(ws,"Сначала завершите текущий ход.");
   if(room.state.rolled)return err(ws,"Кости уже брошены.");if(!canControlSeat(room,p,room.state.turn))return err(ws,"Сейчас ход другого игрока.");
   const autoController=(room.autoSeat===room.state.turn&&room.autoControllerSeat===p.seat);
   if(!autoController&&room.timerEnabled!==false&&room.deadline>0&&Date.now()>room.deadline){timeoutTurn(room);return}
   const actingSeat=room.state.turn,dice=[crypto.randomInt(1,7),crypto.randomInt(1,7)];
   const kush=registerKushRoll(room,actingSeat,dice);
   room.actionSeat=actingSeat;room.version++;
   broadcast(room,{type:"roll_result",seat:actingSeat,dice,...kush,version:room.version});return;
 }
 if(m.type==="state_update"){
   if(!room.started)return err(ws,"Игра ещё не началась.");if(room.actionSeat==null||!canControlSeat(room,p,room.actionSeat))return err(ws,"Это состояние может отправить только игрок, который сейчас делает ход.");
   if(!validateState(room,m.state))return err(ws,"Сервер отклонил некорректное состояние игры.");
   const tempController=(room.autoSeat!=null&&room.autoControllerSeat===p.seat);
   if(room.timeoutInProgress&&!tempController&&room.autoSeat!=null)return err(ws,"Просрочка уже обрабатывается: система выполняет автоход.");
   if(!tempController&&room.timerEnabled!==false&&room.deadline>0&&Date.now()>room.deadline){timeoutTurn(room);return}
   const oldTurn=room.state.turn,oldRolled=!!room.state.rolled;
   const next=stampPlayerNames(room,m.state);
   for(let i=0;i<room.state.players.length;i++)if(room.state.players[i]?.eliminated)next.players[i].eliminated=true;
   awardHomePoints(room,next);room.state=next;room.status=String(m.status||"").slice(0,500);room.version++;
   if(oldTurn!==room.state.turn){
     room.kushStreakSeat=null;
     room.kushStreakCount=0;
   }
   const winnerSeat=room.state.players.findIndex(pl=>!pl.eliminated&&pl.pieces.every(x=>x.state==="home"));
   if(winnerSeat>=0){finishMatch(room,winnerSeat,`${room.players.find(x=>x.seat===winnerSeat)?.name||"Игрок"} завёл все 5 фишек в Домик и победил!`);return}
   const autoOriginal=room.autoSeat;
   const autoStillPending=autoOriginal!=null && (
     room.state.turn===autoOriginal ||
     !!room.state.forcedSix ||
     (Array.isArray(room.state.resumeStack)&&room.state.resumeStack.some(x=>x&&x.turn===autoOriginal))
   );

   if(autoOriginal!=null && !autoStillPending){
     room.autoSeat=null;room.autoControllerSeat=null;
   }

   room.actionSeat=room.state.rolled?room.state.turn:null;

   // During a gifted six to another real player, that player gets a normal
   // 25-second window. When state restores to the timed-out player, the
   // temporary controller resumes automatically.
   const giftHumanTurn=room.autoSeat!=null && room.state.turn!==room.autoSeat && !!room.state.forcedSix;
   if(giftHumanTurn){
     room.actionSeat=room.state.turn;
     startTurnTimer(room);
   }else if(room.autoSeat==null && (oldTurn!==room.state.turn||(oldRolled&&!room.state.rolled))){
     startTurnTimer(room);
   }else if(room.autoSeat!=null){
     room.deadline=0;
   }

   broadcast(room,{type:"state_sync",state:room.state,status:room.status,actionSeat:room.actionSeat,
     deadline:room.deadline,timerEnabled:room.timerEnabled,misses:room.misses,matchPoints:room.matchPoints,version:room.version,
     autoSeat:room.autoSeat,autoControllerSeat:room.autoControllerSeat});
   return;
 }
}

function parseFrames(ws,chunk){
 ws._buf=Buffer.concat([ws._buf||Buffer.alloc(0),chunk]);
 while(ws._buf.length>=2){
   const b=ws._buf,fin=!!(b[0]&0x80),opcode=b[0]&0x0f,masked=!!(b[1]&0x80);let len=b[1]&0x7f,off=2;
   if(len===126){if(b.length<4)return;len=b.readUInt16BE(2);off=4}
   else if(len===127){if(b.length<10)return;const n=b.readBigUInt64BE(2);if(n>BigInt(1e6)){ws.destroy();return}len=Number(n);off=10}
   let mask=null;if(masked){if(b.length<off+4)return;mask=b.subarray(off,off+4);off+=4}if(b.length<off+len)return;
   let payload=Buffer.from(b.subarray(off,off+len));ws._buf=b.subarray(off+len);if(masked)for(let i=0;i<payload.length;i++)payload[i]^=mask[i%4];
   if(opcode===8){sendControl(ws,8);ws.end();return}if(opcode===9){sendControl(ws,10,payload.subarray(0,125));continue}if(opcode===10)continue;if(opcode!==1||!fin||payload.length>100000)continue;
   try{onMessage(ws,JSON.parse(payload.toString("utf8")))}catch{err(ws,"Сервер не смог прочитать сообщение.")}
 }
}
server.on("upgrade",(req,socket)=>{
 if(new URL(req.url,"http://localhost").pathname!=="/ws"){socket.destroy();return}
 const key=req.headers["sec-websocket-key"];if(!key){socket.destroy();return}
 const accept=crypto.createHash("sha1").update(key+GUID).digest("base64");
 socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: "+accept+"\r\n\r\n");
 socket._buf=Buffer.alloc(0);socket.on("data",c=>parseFrames(socket,c));
 socket.on("close",()=>{
   removeFromRandomQueue(socket);const room=rooms.get(socket._room);if(!room)return;const p=room.players.find(x=>x.token===socket._token);if(!p)return;
   room.lastActive=Date.now();if(!room.started){room.players=room.players.filter(x=>x.token!==p.token);compactSeats(room)}else{p.connected=false;p.ws=null}
   broadcast(room,{type:"player_left",name:p.name,players:playerList(room)});roomUpdate(room);if(!room.players.filter(x=>!x.bot).length)rooms.delete(room.code);
 });socket.on("error",()=>{});
});
setInterval(()=>{
 const now=Date.now();
 for(const room of rooms.values()){
   if(room.started&&!room.gameOver&&room.timerEnabled!==false&&room.deadline&&!room.timeoutInProgress&&now>=room.deadline)timeoutTurn(room);
   if(room.players.filter(p=>!p.bot).every(p=>!p.connected)&&now-room.lastActive>30*60*1000)rooms.delete(room.code);
 }
},500).unref();
server.listen(PORT,"0.0.0.0",()=>console.log(`Partis Online V48: http://localhost:${PORT}`));

"use strict";
const http=require("http"),crypto=require("crypto"),fs=require("fs"),path=require("path");
const PORT=Number(process.env.PORT||8080);
const PUBLIC=path.join(__dirname,"public");
const rooms=new Map();
const COLORS=["Красный","Чёрный","Синий","Бело-синий"];
const GUID="258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function mime(file){const e=path.extname(file).toLowerCase();return ({".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".svg":"image/svg+xml",".json":"application/json; charset=utf-8"})[e]||"application/octet-stream"}
function serve(req,res){
 const u=new URL(req.url,"http://localhost");
 if(u.pathname==="/health"){res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({ok:true,rooms:rooms.size}));return}
 let rel=decodeURIComponent(u.pathname);if(rel==="/")rel="/index.html";
 const file=path.normalize(path.join(PUBLIC,rel));
 if(!file.startsWith(PUBLIC)){res.writeHead(403);res.end("Forbidden");return}
 fs.stat(file,(err,st)=>{if(err||!st.isFile()){res.writeHead(404);res.end("Not found");return}res.writeHead(200,{"content-type":mime(file),"cache-control":"no-cache"});fs.createReadStream(file).pipe(res)});
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
function safeName(x){return String(x||"Игрок").replace(/[<>\u0000-\u001f]/g,"").trim().slice(0,24)||"Игрок"}
function roomCode(){for(let i=0;i<50;i++){const c=String(crypto.randomInt(100000,1000000));if(!rooms.has(c))return c}throw new Error("code")}
function token(){return crypto.randomBytes(18).toString("hex")}
function playerList(room){return room.players.map(p=>({seat:p.seat,name:p.name,connected:!!p.connected,host:!!p.host,color:COLORS[p.seat]})).sort((a,b)=>a.seat-b.seat)}
function broadcast(room,obj){for(const p of room.players)if(p.connected&&p.ws)send(p.ws,obj)}
function roomUpdate(room){broadcast(room,{type:"room_update",code:room.code,players:playerList(room),started:room.started})}
function err(ws,message){send(ws,{type:"error",message})}
function attach(ws,p,room){p.ws=ws;p.connected=true;ws._room=room.code;ws._token=p.token;ws._seat=p.seat}
function findFreeSeat(room){for(let s=0;s<4;s++)if(!room.players.some(p=>p.seat===s))return s;return -1}
function compactSeats(room){
 room.players.sort((a,b)=>a.seat-b.seat);
 room.players.forEach((p,i)=>{p.seat=i;p.host=i===0});
 for(const p of room.players)if(p.connected&&p.ws)send(p.ws,{type:"seat_update",seat:p.seat,host:p.host,players:playerList(room)});
}
function validateState(room,state){
 if(!state||typeof state!=="object"||!Array.isArray(state.players))return false;
 if(state.players.length!==room.players.length)return false;
 if(!Number.isInteger(state.turn)||state.turn<0||state.turn>=state.players.length)return false;
 if(!Array.isArray(state.d)||state.d.length!==2||!Array.isArray(state.used)||state.used.length!==2)return false;
 for(let i=0;i<state.players.length;i++){
   const pl=state.players[i];if(!pl||pl.owner!==i||!Array.isArray(pl.pieces)||pl.pieces.length!==5)return false;
 }
 return JSON.stringify(state).length<60000;
}
function cleanupEmpty(room){if(room.players.every(p=>!p.connected)&&Date.now()-room.lastActive>30*60*1000)rooms.delete(room.code)}

function onMessage(ws,m){
 if(!m||typeof m.type!=="string")return;
 if(m.type==="create_room"){
   if(ws._room)return err(ws,"Вы уже находитесь в комнате.");
   const code=roomCode(),p={seat:0,name:safeName(m.name),token:token(),host:true,connected:true,ws};
   const room={code,players:[p],started:false,state:null,status:"",actionSeat:null,version:1,lastActive:Date.now()};rooms.set(code,room);attach(ws,p,room);
   send(ws,{type:"room_created",code,token:p.token,seat:0,host:true,players:playerList(room),started:false,version:room.version});roomUpdate(room);return;
 }
 if(m.type==="join_room"){
   const code=String(m.code||"");const room=rooms.get(code);if(!room)return err(ws,"Комната с таким кодом не найдена.");
   if(room.started)return err(ws,"Партия уже началась. Новые игроки войти не могут.");
   const seat=findFreeSeat(room);if(seat<0)return err(ws,"В комнате уже 4 игрока.");
   const p={seat,name:safeName(m.name),token:token(),host:false,connected:true,ws};room.players.push(p);room.lastActive=Date.now();attach(ws,p,room);
   send(ws,{type:"room_joined",code,token:p.token,seat:p.seat,host:false,players:playerList(room),started:false,version:room.version});roomUpdate(room);return;
 }
 if(m.type==="reconnect_room"){
   const room=rooms.get(String(m.code||""));if(!room)return err(ws,"Комната больше не существует.");
   const p=room.players.find(x=>x.token===m.token);if(!p)return err(ws,"Не удалось восстановить место игрока.");
   p.name=safeName(m.name||p.name);attach(ws,p,room);room.lastActive=Date.now();
   send(ws,{type:"room_reconnected",code:room.code,token:p.token,seat:p.seat,host:p.host,players:playerList(room),started:room.started,state:room.state,status:room.status,version:room.version});roomUpdate(room);return;
 }
 const room=rooms.get(String(m.code||ws._room||""));if(!room)return err(ws,"Комната не найдена.");
 const p=room.players.find(x=>x.token===ws._token);if(!p)return err(ws,"Игрок не найден в комнате.");room.lastActive=Date.now();
 if(m.type==="leave_room"){
   if(!room.started){room.players=room.players.filter(x=>x.token!==p.token);compactSeats(room)}
   else{p.connected=false;p.ws=null}
   ws._room=null;ws._token=null;roomUpdate(room);if(!room.players.length)rooms.delete(room.code);return;
 }
 if(m.type==="start_game"){
   if(!p.host)return err(ws,"Начать игру может только создатель комнаты.");
   const connected=room.players.filter(x=>x.connected);if(connected.length<2)return err(ws,"Для игры нужны минимум 2 игрока.");
   if(room.started)return err(ws,"Игра уже началась.");
   if(!validateState(room,m.state))return err(ws,"Некорректное начальное состояние игры.");
   room.started=true;room.state=m.state;room.status="Онлайн-партия началась. Красный ходит первым.";room.actionSeat=null;room.version++;
   broadcast(room,{type:"game_started",state:room.state,status:room.status,version:room.version});roomUpdate(room);return;
 }
 if(m.type==="roll"){
   if(!room.started||!room.state)return err(ws,"Игра ещё не началась.");
   if(room.actionSeat!==null)return err(ws,"Сначала завершите текущий ход.");
   if(room.state.rolled)return err(ws,"Кости уже брошены.");
   if(room.state.turn!==p.seat)return err(ws,"Сейчас ход другого игрока.");
   const dice=[crypto.randomInt(1,7),crypto.randomInt(1,7)];room.actionSeat=p.seat;room.version++;
   broadcast(room,{type:"roll_result",seat:p.seat,dice,version:room.version});return;
 }
 if(m.type==="state_update"){
   if(!room.started)return err(ws,"Игра ещё не началась.");
   if(room.actionSeat!==p.seat)return err(ws,"Это состояние может отправить только игрок, который сейчас делает ход.");
   if(!validateState(room,m.state))return err(ws,"Сервер отклонил некорректное состояние игры.");
   room.state=m.state;room.status=String(m.status||"").slice(0,500);room.version++;
   // Активное право действия следует за state.turn, пока текущий бросок не завершён.
   // Это нужно, в частности, для передачи шестёрки владельцу пленника при выкупе.
   room.actionSeat=room.state.rolled ? room.state.turn : null;
   broadcast(room,{type:"state_sync",state:room.state,status:room.status,actionSeat:room.actionSeat,version:room.version});return;
 }
}

function parseFrames(ws,chunk){
 ws._buf=Buffer.concat([ws._buf||Buffer.alloc(0),chunk]);
 while(ws._buf.length>=2){
   const b=ws._buf;const fin=!!(b[0]&0x80),opcode=b[0]&0x0f,masked=!!(b[1]&0x80);let len=b[1]&0x7f,off=2;
   if(len===126){if(b.length<4)return;len=b.readUInt16BE(2);off=4}
   else if(len===127){if(b.length<10)return;const n=b.readBigUInt64BE(2);if(n>BigInt(1e6)){ws.destroy();return}len=Number(n);off=10}
   let mask=null;if(masked){if(b.length<off+4)return;mask=b.subarray(off,off+4);off+=4}
   if(b.length<off+len)return;
   let payload=Buffer.from(b.subarray(off,off+len));ws._buf=b.subarray(off+len);
   if(masked)for(let i=0;i<payload.length;i++)payload[i]^=mask[i%4];
   if(opcode===8){sendControl(ws,8);ws.end();return}
   if(opcode===9){sendControl(ws,10,payload.subarray(0,125));continue}
   if(opcode===10)continue;
   if(opcode!==1||!fin||payload.length>100000)continue;
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
   const room=rooms.get(socket._room);if(!room)return;const p=room.players.find(x=>x.token===socket._token);if(!p)return;
   room.lastActive=Date.now();
   if(!room.started){room.players=room.players.filter(x=>x.token!==p.token);compactSeats(room)}
   else{p.connected=false;p.ws=null}
   broadcast(room,{type:"player_left",name:p.name,players:playerList(room)});roomUpdate(room);if(!room.players.length)rooms.delete(room.code);
 });
 socket.on("error",()=>{});
});
setInterval(()=>{const now=Date.now();for(const room of rooms.values()){if(room.players.every(p=>!p.connected)&&now-room.lastActive>30*60*1000)rooms.delete(room.code)}},60*1000).unref();
server.listen(PORT,"0.0.0.0",()=>console.log(`Mondavoshka Online: http://localhost:${PORT}`));

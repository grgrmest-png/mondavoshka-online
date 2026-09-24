"use strict";
(()=>{
 const SKINS=[
  {id:"default",name:"Классика",color:null,free:true},
  {id:"emerald",name:"Изумруд",color:"#16a66a"},{id:"violet",name:"Фиолетовый",color:"#7b4bc9"},
  {id:"gold",name:"Золотой",color:"#d6a51e"},{id:"orange",name:"Апельсин",color:"#ed7b24"},
  {id:"pink",name:"Розовый",color:"#e45a9b"},{id:"lime",name:"Лайм",color:"#86c73f"},
  {id:"ice",name:"Ледяной",color:"#73cfe8"},{id:"silver",name:"Серебро",color:"#aeb7c2"},
  {id:"burgundy",name:"Бордовый",color:"#8d2f49"},{id:"turquoise",name:"Бирюза",color:"#1bb7aa"}
 ];
 const COUNTRY_SKINS=[
  {id:"country_russia",skinId:"country_russia",productId:"skin_country_russia",name:"Россия",emoji:"🇷🇺",flag:"RU",color:"#f7f7f7",preview:"linear-gradient(#fff 0 33%,#2456c7 33% 66%,#d52b1e 66%)"},
  {id:"country_brazil",skinId:"country_brazil",productId:"skin_country_brazil",name:"Бразилия",emoji:"🇧🇷",flag:"BR",color:"#159447",preview:"radial-gradient(circle,#2448a5 0 24%,transparent 25%),linear-gradient(35deg,transparent 34%,#f7d117 35% 65%,transparent 66%),#159447"},
  {id:"country_argentina",skinId:"country_argentina",productId:"skin_country_argentina",name:"Аргентина",emoji:"🇦🇷",flag:"AR",color:"#75bfe8",preview:"linear-gradient(#75bfe8 0 33%,#fff 33% 66%,#75bfe8 66%)"},
  {id:"country_france",skinId:"country_france",productId:"skin_country_france",name:"Франция",emoji:"🇫🇷",flag:"FR",color:"#173f8e",preview:"linear-gradient(90deg,#173f8e 0 33%,#fff 33% 66%,#e52b3a 66%)"},
  {id:"country_germany",skinId:"country_germany",productId:"skin_country_germany",name:"Германия",emoji:"🇩🇪",flag:"DE",color:"#171717",preview:"linear-gradient(#171717 0 33%,#d82431 33% 66%,#f0c223 66%)"},
  {id:"country_spain",skinId:"country_spain",productId:"skin_country_spain",name:"Испания",emoji:"🇪🇸",flag:"ES",color:"#b91929",preview:"linear-gradient(#b91929 0 25%,#f2c72b 25% 75%,#b91929 75%)"},
  {id:"country_italy",skinId:"country_italy",productId:"skin_country_italy",name:"Италия",emoji:"🇮🇹",flag:"IT",color:"#168752",preview:"linear-gradient(90deg,#168752 0 33%,#fff 33% 66%,#d72b36 66%)"},
  {id:"country_japan",skinId:"country_japan",productId:"skin_country_japan",name:"Япония",emoji:"🇯🇵",flag:"JP",color:"#f7f7f4",preview:"radial-gradient(circle,#c91f37 0 28%,transparent 29%),#f7f7f4"},
  {id:"country_korea",skinId:"country_korea",productId:"skin_country_korea",name:"Южная Корея",emoji:"🇰🇷",flag:"KR",color:"#f7f7f4",preview:"linear-gradient(145deg,transparent 42%,#2056a5 43% 56%,transparent 57%),radial-gradient(circle at 48% 43%,#d52c3a 0 22%,transparent 23%),#f7f7f4"},
  {id:"country_usa",skinId:"country_usa",productId:"skin_country_usa",name:"США",emoji:"🇺🇸",flag:"US",color:"#f8f7ef",preview:"linear-gradient(90deg,#23458e 0 42%,transparent 42%) 0 0/100% 52% no-repeat,repeating-linear-gradient(#c72c3b 0 9%,#fff 9% 18%)"},
  {id:"country_kazakhstan",skinId:"country_kazakhstan",productId:"skin_country_kazakhstan",name:"Казахстан",emoji:"🇰🇿",flag:"KZ",color:"#27a9c5",preview:"radial-gradient(circle,#f1c52e 0 20%,transparent 21%),#27a9c5"},
  {id:"country_china",skinId:"country_china",productId:"skin_country_china",name:"Китай",emoji:"🇨🇳",flag:"CN",color:"#d92832",preview:"radial-gradient(circle at 35% 35%,#f4cd32 0 15%,transparent 16%),#d92832"}
 ];
 const CLUB_PRODUCTS=[
  {productId:"skin_barcelona",skinId:"club_barcelona",name:"Барселона"},{productId:"skin_real_madrid",skinId:"club_real_madrid",name:"Реал Мадрид"},
  {productId:"skin_bayern",skinId:"club_bayern",name:"Бавария"},{productId:"skin_manchester_city",skinId:"club_manchester_city",name:"Манчестер Сити"},
  {productId:"skin_liverpool",skinId:"club_liverpool",name:"Ливерпуль"}
 ];
 const CLUB_VISUALS={
  club_barcelona:{color:"#3346a8",stripe:"#a91d45"},club_real_madrid:{color:"#f7f7f4",stripe:"#d8bf63"},
  club_bayern:{color:"#d92736",stripe:"#1359a6"},club_manchester_city:{color:"#79bce6",stripe:"#ffffff"},club_liverpool:{color:"#bb1f2f",stripe:"#ffffff"}
 };
 const AVATARS=[
  {id:"animal:tiger",name:"Тигр",emoji:"🐯"},{id:"animal:lion",name:"Лев",emoji:"🦁"},
  {id:"animal:bear",name:"Медведь",emoji:"🐻"},{id:"animal:wolf",name:"Волк",emoji:"🐺"},
  {id:"animal:eagle",name:"Орёл",emoji:"🦅"},{id:"animal:fox",name:"Лиса",emoji:"🦊"}
 ];
 const TABLES=[
  {id:"table_classic",name:"Классический",price:0,preview:"linear-gradient(135deg,#d49a58,#6e3c20)"},
  {id:"table_ice",name:"Ледяной",price:500,preview:"linear-gradient(135deg,#dff7ff,#4b8198)"},
  {id:"table_stone",name:"Каменный",price:500,preview:"linear-gradient(135deg,#b7b7b2,#4e504e)"},
  {id:"table_neon",name:"Неоновый",price:600,preview:"linear-gradient(135deg,#251438,#087c87)"},
  {id:"table_north",name:"Северное сияние",price:600,preview:"linear-gradient(135deg,#183a4b,#2aa58d,#744da2)"}
 ];
 const DICE=[
  {id:"dice_ivory",name:"Слоновая кость",price:0,preview:"linear-gradient(145deg,#fff9e9,#d8c59d)"},
  {id:"dice_gold",name:"Золотые",price:300,preview:"linear-gradient(145deg,#ffe889,#b67a15)"},
  {id:"dice_ice",name:"Ледяные",price:300,preview:"linear-gradient(145deg,#e7fbff,#63b9d7)"},
  {id:"dice_obsidian",name:"Обсидиан",price:300,preview:"linear-gradient(145deg,#5c5c66,#111217)"},
  {id:"dice_ruby",name:"Рубиновые",price:300,preview:"linear-gradient(145deg,#ff7a86,#851321)"}
 ];
 const ACHIEVEMENTS=[
  {id:"first_kush",icon:"🎲",name:"Первый куш",text:"Впервые выбросить дубль",reward:10},
  {id:"first_home",icon:"🏠",name:"Домой!",text:"Завести первую фишку в Домик",reward:15},
  {id:"home3",icon:"🏘️",name:"Почти дома",text:"Завести 3 фишки в Домик за партию",reward:25},
  {id:"first_capture",icon:"⛓️",name:"Первый плен",text:"Взять первую фишку соперника",reward:20},
  {id:"hunter3",icon:"🎯",name:"Охотник",text:"Взять 3 фишки за одну партию",reward:35},
  {id:"jailer5",icon:"🔒",name:"Тюремщик",text:"Взять 5 фишек за одну партию",reward:60},
  {id:"trap_visit",icon:"🕳️",name:"Вот это влип",text:"Впервые попасть в ловушку",reward:10},
  {id:"trap_escape",icon:"🧭",name:"Выход найден",text:"Выбраться из ловушки",reward:20},
  {id:"trap_regular",icon:"💩",name:"Завсегдатай",text:"Попасть в ловушку 3 раза за партию",reward:25},
  {id:"triple_kush",icon:"🔥",name:"Три куша",text:"Выбросить 3 куша подряд",reward:50},
  {id:"kush_master",icon:"👑",name:"Король кушей",text:"Выбросить 5 кушей за одну партию",reward:40},
  {id:"kush_legend",icon:"⚡",name:"Легенда кушей",text:"Выбросить 8 кушей за одну партию",reward:70},
  {id:"marathon20",icon:"🥾",name:"Марафонец",text:"Сделать 20 ходов за одну партию",reward:20},
  {id:"marathon30",icon:"🏃",name:"Неутомимый",text:"Сделать 30 ходов за одну партию",reward:35},
  {id:"first_win",icon:"🏆",name:"Первая победа",text:"Выиграть первую партию",reward:50},
  {id:"full_house",icon:"👑",name:"Полный дом",text:"Завести все 5 фишек в Домик",reward:75},
  {id:"clean_win",icon:"✨",name:"Чистая победа",text:"Победить, ни разу не попав в ловушку",reward:100},
  {id:"aggressive_win",icon:"⚔️",name:"Штурм",text:"Победить и взять минимум 3 фишки",reward:80},
  {id:"calm_win",icon:"🕊️",name:"Миротворец",text:"Победить, не взяв ни одной фишки",reward:80},
  {id:"games5",icon:"🎮",name:"Втянулся",text:"Сыграть 5 партий",reward:25},
  {id:"games25",icon:"🧱",name:"Ветеран",text:"Сыграть 25 партий",reward:100},
  {id:"wins3",icon:"🥉",name:"Серия побед",text:"Одержать 3 победы",reward:60},
  {id:"wins10",icon:"🥇",name:"Чемпион",text:"Одержать 10 побед",reward:150},
  {id:"rating500",icon:"⭐",name:"Пятьсот",text:"Достичь рейтинга 500",reward:50},
  {id:"rating1000",icon:"🌟",name:"Тысячник",text:"Достичь рейтинга 1000",reward:100}
 ];
 const TABLE_VISUALS={
  table_classic:{grain:"#e7c38d",grainLine:"#a86f3b",cellTop:"#f8e2ba",cellMid:"#edcd9a",cellBottom:"#d4a96f",baseTop:"#fff2cf",baseBottom:"#d9ad73",woodTop:"#d49a58",woodMid:"#9d6031",woodBottom:"#6e3c20",center:"#efd7ad",frame:"#3c2112",inner:"#efbd78"},
  table_ice:{grain:"#d9eef5",grainLine:"#87b6c5",cellTop:"#fbfeff",cellMid:"#dcecf2",cellBottom:"#b9d2dc",baseTop:"#ffffff",baseBottom:"#c5e1eb",woodTop:"#9bc2d0",woodMid:"#5f8b9c",woodBottom:"#31515f",center:"#dceef3",frame:"#274653",inner:"#b8e9f4"},
  table_stone:{grain:"#b7b6b0",grainLine:"#666762",cellTop:"#e6e4dd",cellMid:"#cac8c0",cellBottom:"#aaa89f",baseTop:"#efeee8",baseBottom:"#bbb8ae",woodTop:"#878982",woodMid:"#60625f",woodBottom:"#393b3a",center:"#c8c7c0",frame:"#292a29",inner:"#b5b6b0"},
  table_neon:{grain:"#302442",grainLine:"#1ed7c7",cellTop:"#ece7f5",cellMid:"#c9bddb",cellBottom:"#9b88b5",baseTop:"#f6f1ff",baseBottom:"#bca9d8",woodTop:"#5b3678",woodMid:"#34204b",woodBottom:"#171221",center:"#c7bdd4",frame:"#0de0ce",inner:"#d94df0"},
  table_north:{grain:"#294d58",grainLine:"#50c9a5",cellTop:"#e9f5ee",cellMid:"#c7dfd5",cellBottom:"#94beb1",baseTop:"#f7fff9",baseBottom:"#aed7c7",woodTop:"#3d7680",woodMid:"#2c5960",woodBottom:"#19353c",center:"#c7ddd8",frame:"#193941",inner:"#73d5b7"}
 };
 const S={id:null,name:"Игрок",rating:0,balance:0,wins:0,games:0,owned:["default"],equipped:"default",avatar:"animal:tiger",ownedTables:["table_classic"],equippedTable:"table_classic",ownedDice:["dice_ivory"],equippedDice:"dice_ivory",achievements:[],authorized:false,player:null,payments:null,catalog:new Map()};
 let leaderboardDebounce=null;
 const achievementPending=new Set();

 function serverBase(){const ws=String(window.MONDAVOSHKA_WS_URL||"").trim();if(ws)return ws.replace(/^wss:/,"https:").replace(/^ws:/,"http:").replace(/\/ws\/?$/,"");return location.origin}
 function cleanId(v){return String(v||"").replace(/[^a-zA-Z0-9_.:-]/g,"").slice(0,120)}
 function fallbackId(){try{let id=localStorage.getItem("partis-profile-id")||localStorage.getItem("mondavoshka-profile-id");if(!id){id="anon-"+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem("partis-profile-id",id)}return id}catch{return "anon-"+Math.random().toString(36).slice(2)}}
 function snapshot(){return {id:S.id,name:S.name,rating:S.rating,balance:S.balance,wins:S.wins,games:S.games,owned:S.owned,equipped:S.equipped,avatar:S.avatar,ownedTables:S.ownedTables,equippedTable:S.equippedTable,ownedDice:S.ownedDice,equippedDice:S.equippedDice,achievements:S.achievements}}
 function saveFallback(){try{localStorage.setItem("partis-profile",JSON.stringify(snapshot()))}catch{}}
 function loadFallback(){try{const x=JSON.parse(localStorage.getItem("partis-profile")||localStorage.getItem("mondavoshka-profile")||"null");if(!x)return;S.rating=+x.rating||0;S.balance=+x.balance||0;S.wins=+x.wins||0;S.games=+x.games||0;S.owned=Array.isArray(x.owned)?x.owned:["default"];S.equipped=x.equipped||"default";S.name=x.name||S.name;S.avatar=x.avatar||S.avatar;S.ownedTables=Array.isArray(x.ownedTables)?x.ownedTables:["table_classic"];S.equippedTable=x.equippedTable||"table_classic";S.ownedDice=Array.isArray(x.ownedDice)?x.ownedDice:["dice_ivory"];S.equippedDice=x.equippedDice||"dice_ivory";S.achievements=Array.isArray(x.achievements)?x.achievements:[]}catch{}}
 async function waitSdk(ms=3500){const start=Date.now();while(Date.now()-start<ms){if(window.ysdk)return window.ysdk;await new Promise(r=>setTimeout(r,100))}return null}
 async function api(path,opts={}){const res=await fetch(serverBase()+path,{...opts,headers:{"content-type":"application/json",...(opts.headers||{})}});if(!res.ok){let msg=await res.text();try{msg=JSON.parse(msg).error||msg}catch{}throw new Error(msg||`HTTP ${res.status}`)}return res.json()}
 async function syncServer(){try{const p=await api("/api/sync-profile",{method:"POST",body:JSON.stringify(snapshot())});applyServerProfile(p.profile||p,false)}catch(e){console.warn("Profile sync failed",e)}}
 function applyServerProfile(p,persist=true){if(!p)return;S.rating=Math.max(0,+p.rating||0);S.balance=Math.max(0,+p.balance||0);S.wins=Math.max(0,+p.wins||0);S.games=Math.max(0,+p.games||0);if(Array.isArray(p.owned))S.owned=[...new Set(["default",...p.owned])];if(p.equipped)S.equipped=p.equipped;if(p.name)S.name=String(p.name).slice(0,24);if(p.avatar)S.avatar=p.avatar;if(Array.isArray(p.ownedTables))S.ownedTables=[...new Set(["table_classic",...p.ownedTables])];if(p.equippedTable)S.equippedTable=p.equippedTable;if(Array.isArray(p.ownedDice))S.ownedDice=[...new Set(["dice_ivory",...p.ownedDice])];if(p.equippedDice)S.equippedDice=p.equippedDice;if(Array.isArray(p.achievements))S.achievements=[...new Set(p.achievements)];saveFallback();renderProfile();renderShop();renderProfileModal();applyCosmetics();if(persist)persistYandex();setTimeout(checkProfileAchievements,0)}
 async function persistYandex(){if(!S.player)return;try{await S.player.setStats({rating:S.rating,pointsBalance:S.balance,wins:S.wins,games:S.games})}catch{}try{await S.player.setData({ownedSkins:S.owned,equippedSkin:S.equipped,partisAvatar:S.avatar,partisOwnedTables:S.ownedTables,partisTable:S.equippedTable,partisOwnedDice:S.ownedDice,partisDice:S.equippedDice,partisAchievements:S.achievements},true)}catch{}if(S.authorized&&window.ysdk?.leaderboards){clearTimeout(leaderboardDebounce);leaderboardDebounce=setTimeout(async()=>{try{const ok=await window.ysdk.isAvailableMethod?.("leaderboards.setScore");if(ok!==false)await window.ysdk.leaderboards.setScore("rating",S.rating)}catch{}},1200)}}
 async function initPlayer(){loadFallback();S.id=fallbackId();const ysdk=await waitSdk();if(ysdk){try{const p=await ysdk.getPlayer();S.player=p;S.id=cleanId(p.getUniqueID?.()||S.id)||S.id;S.authorized=!!p.isAuthorized?.();const nm=String(p.getName?.()||"").trim();if(S.authorized&&nm&&nm!=="unauthorized")S.name=nm.slice(0,24);try{const stats=await p.getStats(["rating","pointsBalance","wins","games"]);S.rating=Math.max(S.rating,+stats.rating||0);S.balance=Math.max(S.balance,+stats.pointsBalance||0);S.wins=Math.max(S.wins,+stats.wins||0);S.games=Math.max(S.games,+stats.games||0)}catch{}try{const data=await p.getData(["ownedSkins","equippedSkin","partisAvatar","partisOwnedTables","partisTable","partisOwnedDice","partisDice","partisAchievements"]);if(Array.isArray(data.ownedSkins))S.owned=[...new Set(["default",...data.ownedSkins])];if(data.equippedSkin)S.equipped=data.equippedSkin;if(data.partisAvatar)S.avatar=data.partisAvatar;if(Array.isArray(data.partisOwnedTables))S.ownedTables=[...new Set(["table_classic",...data.partisOwnedTables])];if(data.partisTable)S.equippedTable=data.partisTable;if(Array.isArray(data.partisOwnedDice))S.ownedDice=[...new Set(["dice_ivory",...data.partisOwnedDice])];if(data.partisDice)S.equippedDice=data.partisDice;if(Array.isArray(data.partisAchievements))S.achievements=[...new Set(data.partisAchievements)]}catch{}}catch(e){console.warn("Yandex player unavailable",e)}}await syncServer();await claimStoredAchievementRewards();renderProfile();renderShop();renderProfileModal();loadLeaderboard();initPayments();prefillNames();applyCosmetics();checkProfileAchievements()}
 function publicProfile(){return {id:S.id,name:S.name,skinId:S.equipped,rating:S.rating,avatar:S.avatar}}
 function getSkin(id){return SKINS.find(s=>s.id===id)||COUNTRY_SKINS.find(s=>s.id===id)||CLUB_PRODUCTS.find(x=>x.skinId===id)||SKINS[0]}
 function skinVisual(id){const s=SKINS.find(x=>x.id===id);if(s)return {color:s.color,name:s.name};const country=COUNTRY_SKINS.find(x=>x.id===id);if(country)return {color:country.color,name:country.name,flag:country.flag,emoji:country.emoji};const c=CLUB_PRODUCTS.find(x=>x.skinId===id);if(c)return {name:c.name,...(CLUB_VISUALS[id]||{color:"#bbb",stripe:"#777"})};return {color:null,name:"Классика"}}
 function tableVisual(id=S.equippedTable){return TABLE_VISUALS[id]||TABLE_VISUALS.table_classic}
 function diceVisual(id=S.equippedDice){return DICE.find(x=>x.id===id)||DICE[0]}
 function avatarInfo(value=S.avatar){const a=AVATARS.find(x=>x.id===value);if(a)return {type:"emoji",value:a.emoji,name:a.name};if(/^data:image\/(jpeg|png|webp);base64,/i.test(String(value||"")))return {type:"image",value:String(value),name:"Фото"};return {type:"emoji",value:"🐯",name:"Тигр"}}
 function paintAvatar(el,value=S.avatar,fallback="🐯"){if(!el)return;el.replaceChildren();el.style.backgroundImage="";const a=avatarInfo(value);if(a.type==="image"){el.style.backgroundImage=`url(${a.value})`;el.classList.add("hasPhoto")}else{el.classList.remove("hasPhoto");const s=document.createElement("span");s.textContent=a.value||fallback;el.appendChild(s)}}
 function renderProfile(){const n=document.querySelector("#profileName"),r=document.querySelector("#profileRating"),b=document.querySelector("#profileBalance"),w=document.querySelector("#profileWins"),gm=document.querySelector("#profileGames"),login=document.querySelector("#profileLogin");if(n)n.textContent=S.name;if(r)r.textContent=String(S.rating);if(b)b.textContent=String(S.balance);if(w)w.textContent=String(S.wins);if(gm)gm.textContent=String(S.games);paintAvatar(document.querySelector("#profileAvatarButton"),S.avatar);if(login){login.hidden=S.authorized;login.textContent="Войти в Яндекс"}}
 function prefillNames(){["#randomPlayerName","#createPlayerName","#joinPlayerName"].forEach(sel=>{const el=document.querySelector(sel);if(el&&!el.value)el.value=S.name==="Игрок"?"":S.name})}
 async function login(){if(!window.ysdk)return;try{await window.ysdk.auth.openAuthDialog();await initPlayer()}catch{}}
 async function loadLeaderboard(){const box=document.querySelector("#ratingList");if(box)box.innerHTML='<div class="ratingLoading">Загрузка рейтинга…</div>';try{const d=await api("/api/leaderboard?limit=30");const rows=d.entries||[];if(box){box.innerHTML="";rows.forEach((x,i)=>{const row=document.createElement("div");row.className="ratingRow"+(x.id===S.id?" me":"");const av=document.createElement("div");av.className="ratingAvatar";paintAvatar(av,x.avatar);const place=document.createElement("span");place.className="ratingPlace";place.textContent=i+1;const name=document.createElement("span");name.className="ratingName";name.textContent=x.name||"Игрок";const score=document.createElement("b");score.textContent=x.rating||0;row.append(place,av,name,score);box.appendChild(row)});if(!rows.length)box.innerHTML='<div class="ratingLoading">Рейтинг пока пуст. Заведите первую фишку в Домик!</div>'}}catch(e){if(box)box.innerHTML='<div class="ratingLoading">Не удалось загрузить рейтинг.</div>'}}
 function skinCard(s){const owned=S.owned.includes(s.id),equipped=S.equipped===s.id;const d=document.createElement("div");d.className="skinCard"+(equipped?" equipped":"");const piece=document.createElement("div");piece.className="skinPiece";piece.style.background=s.color||"linear-gradient(145deg,#ff6873,#c7152b)";d.appendChild(piece);const name=document.createElement("b");name.textContent=s.name;d.appendChild(name);const cost=document.createElement("small");cost.textContent=s.free?"Базовая":"200 очков";d.appendChild(cost);const btn=document.createElement("button");btn.type="button";if(equipped){btn.textContent="Выбрано";btn.disabled=true}else if(owned){btn.textContent="Выбрать";btn.onclick=()=>equipSkin(s.id)}else{btn.textContent="Купить за 200";btn.disabled=S.balance<200;btn.onclick=()=>buySkin(s.id)}d.appendChild(btn);return d}
 function countrySkinCard(s){const owned=S.owned.includes(s.skinId),equipped=S.equipped===s.skinId;const d=document.createElement("div");d.className="skinCard countrySkinCard premium"+(equipped?" equipped":"");const piece=document.createElement("div");piece.className="skinPiece countryPiece";piece.style.background=s.preview;const badge=document.createElement("span");badge.className="countryEmoji";badge.textContent=s.emoji;piece.appendChild(badge);d.appendChild(piece);const name=document.createElement("b");name.textContent=s.name;d.appendChild(name);const prod=S.catalog.get(s.productId);const cost=document.createElement("small");cost.textContent=prod?.price||"Премиум";d.appendChild(cost);const btn=document.createElement("button");btn.type="button";if(equipped){btn.textContent="Выбрано";btn.disabled=true}else if(owned){btn.textContent="Выбрать";btn.onclick=()=>equipSkin(s.skinId)}else if(!prod){btn.textContent="Скоро";btn.disabled=true}else{btn.textContent="Купить";btn.onclick=()=>buyPremium(s)}d.appendChild(btn);return d}
 function cosmeticCard(item,kind){const owned=(kind==="table"?S.ownedTables:S.ownedDice).includes(item.id);const equipped=(kind==="table"?S.equippedTable:S.equippedDice)===item.id;const d=document.createElement("div");d.className="skinCard cosmeticCard"+(equipped?" equipped":"");const preview=document.createElement("div");preview.className=kind==="table"?"tablePreview":"dicePreview";preview.style.background=item.preview;if(kind==="dice")preview.textContent="⚄";d.appendChild(preview);const b=document.createElement("b");b.textContent=item.name;d.appendChild(b);const sm=document.createElement("small");sm.textContent=item.price?`${item.price} очков`:"Базовый";d.appendChild(sm);const btn=document.createElement("button");btn.type="button";if(equipped){btn.textContent="Выбрано";btn.disabled=true}else if(owned){btn.textContent="Выбрать";btn.onclick=()=>equipCosmetic(kind,item.id)}else{btn.textContent=`Купить за ${item.price}`;btn.disabled=S.balance<item.price;btn.onclick=()=>buyCosmetic(kind,item.id)}d.appendChild(btn);return d}
 function renderShop(){const grid=document.querySelector("#skinGrid");if(grid){grid.innerHTML="";SKINS.forEach(s=>grid.appendChild(skinCard(s)))}const cg=document.querySelector("#countryGrid");if(cg){cg.innerHTML="";COUNTRY_SKINS.forEach(s=>cg.appendChild(countrySkinCard(s)))}const tg=document.querySelector("#tableGrid");if(tg){tg.innerHTML="";TABLES.forEach(s=>tg.appendChild(cosmeticCard(s,"table")))}const dg=document.querySelector("#diceGrid");if(dg){dg.innerHTML="";DICE.forEach(s=>dg.appendChild(cosmeticCard(s,"dice")))}const prem=document.querySelector("#premiumGrid");if(prem){prem.innerHTML="";CLUB_PRODUCTS.forEach(c=>{const owned=S.owned.includes(c.skinId),equipped=S.equipped===c.skinId,v=CLUB_VISUALS[c.skinId];const d=document.createElement("div");d.className="skinCard premium"+(equipped?" equipped":"");const piece=document.createElement("div");piece.className="skinPiece clubPiece";piece.style.background=`linear-gradient(90deg,${v.color} 0 48%,${v.stripe} 48% 58%,${v.color} 58%)`;d.appendChild(piece);const name=document.createElement("b");name.textContent=c.name;d.appendChild(name);const price=document.createElement("small");const prod=S.catalog.get(c.productId);price.textContent=prod?.price||"Премиум";d.appendChild(price);const btn=document.createElement("button");btn.type="button";if(equipped){btn.textContent="Выбрано";btn.disabled=true}else if(owned){btn.textContent="Выбрать";btn.onclick=()=>equipSkin(c.skinId)}else if(!window.MONDAVOSHKA_CLUB_LICENSED||!prod){btn.textContent="Скоро";btn.disabled=true}else{btn.textContent="Купить";btn.onclick=()=>buyPremium(c)}d.appendChild(btn);prem.appendChild(d)})}}
 async function buySkin(id){try{const d=await api("/api/buy-skin",{method:"POST",body:JSON.stringify({id:S.id,skinId:id})});applyServerProfile(d.profile);loadLeaderboard()}catch(e){alert(e.message||"Не удалось купить фишку")}}
 async function equipSkin(id){try{const d=await api("/api/equip-skin",{method:"POST",body:JSON.stringify({id:S.id,skinId:id})});applyServerProfile(d.profile)}catch(e){alert(e.message||"Не удалось выбрать фишку")}}
 async function buyCosmetic(kind,itemId){try{const d=await api("/api/buy-cosmetic",{method:"POST",body:JSON.stringify({id:S.id,kind,itemId})});applyServerProfile(d.profile)}catch(e){alert(e.message||"Не удалось купить оформление")}}
 async function equipCosmetic(kind,itemId){try{const d=await api("/api/equip-cosmetic",{method:"POST",body:JSON.stringify({id:S.id,kind,itemId})});applyServerProfile(d.profile)}catch(e){alert(e.message||"Не удалось выбрать оформление")}}
 async function initPayments(){if(!window.ysdk)return;try{S.payments=await window.ysdk.getPayments({signed:true});const catalog=await S.payments.getCatalog();if(Array.isArray(catalog))catalog.forEach(p=>S.catalog.set(p.id,p));renderShop();try{const purchases=await S.payments.getPurchases();if(purchases?.signature){const res=await fetch(serverBase()+"/api/purchases-sync",{method:"POST",headers:{"content-type":"text/plain"},body:purchases.signature});if(res.ok){const d=await res.json();applyServerProfile(d.profile)}}}catch{}}catch(e){console.warn("Payments unavailable",e)}}
 async function buyPremium(c){if(!S.payments)return;try{const r=await S.payments.purchase({id:c.productId,developerPayload:JSON.stringify({profileId:S.id,skinId:c.skinId})});if(!r?.signature)throw new Error("Платформа не вернула подпись покупки");const res=await fetch(serverBase()+"/api/validate-purchase",{method:"POST",headers:{"content-type":"text/plain"},body:r.signature});if(!res.ok)throw new Error(await res.text());const d=await res.json();applyServerProfile(d.profile)}catch(e){if(String(e?.message||"").length)console.warn("Purchase failed",e)}}
 function applyCosmetics(){document.body.dataset.diceSkin=S.equippedDice||"dice_ivory";window.refreshPartisBoard?.()}
 function avatarChoiceButton(a){const b=document.createElement("button");b.type="button";b.className="avatarChoice"+(S.avatar===a.id?" selected":"");b.title=a.name;b.innerHTML=`<span>${a.emoji}</span><small>${a.name}</small>`;b.onclick=()=>setAvatar(a.id);return b}
 async function setAvatar(value){S.avatar=value;saveFallback();renderProfile();renderProfileModal();await syncServer();persistYandex()}
 async function photoToAvatar(file){return new Promise((resolve,reject)=>{if(!file||!file.type?.startsWith("image/"))return reject(new Error("Выберите изображение"));if(file.size>8*1024*1024)return reject(new Error("Фото слишком большое"));const fr=new FileReader();fr.onerror=()=>reject(new Error("Не удалось прочитать фото"));fr.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error("Не удалось открыть фото"));img.onload=()=>{const size=64,c=document.createElement("canvas");c.width=c.height=size;const ctx=c.getContext("2d");const scale=Math.max(size/img.width,size/img.height),w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);let data=c.toDataURL("image/jpeg",.58);if(data.length>14000)data=c.toDataURL("image/jpeg",.42);resolve(data.length<=18000?data:"animal:tiger")};img.src=String(fr.result)};fr.readAsDataURL(file)})}
 async function handleAvatarUpload(file){try{const data=await photoToAvatar(file);await setAvatar(data)}catch(e){alert(e.message||"Не удалось обработать фото")}}
 function renderProfileModal(){paintAvatar(document.querySelector("#profileModalAvatar"),S.avatar);const n=document.querySelector("#profileModalName"),r=document.querySelector("#profileModalRating"),w=document.querySelector("#profileModalWins"),g=document.querySelector("#profileModalGames");if(n)n.textContent=S.name;if(r)r.textContent=S.rating;if(w)w.textContent=S.wins;if(g)g.textContent=S.games;const cc=document.querySelector("#profileCurrentCosmetics");if(cc){const t=TABLES.find(x=>x.id===S.equippedTable)?.name||"Классический";const d=DICE.find(x=>x.id===S.equippedDice)?.name||"Слоновая кость";cc.textContent=`Стол: ${t} · Кубики: ${d}`}const choices=document.querySelector("#avatarChoices");if(choices){choices.innerHTML="";AVATARS.forEach(a=>choices.appendChild(avatarChoiceButton(a)))}const ag=document.querySelector("#achievementGrid");if(ag){ag.innerHTML="";ACHIEVEMENTS.forEach(a=>{const unlocked=S.achievements.includes(a.id);const d=document.createElement("div");d.className="achievementCard"+(unlocked?" unlocked":" locked");d.innerHTML=`<span>${unlocked?a.icon:"🔒"}</span><div><b></b><small></small></div>`;d.querySelector("b").textContent=a.name;d.querySelector("small").textContent=a.text;const rw=document.createElement("em");rw.className="achievementReward";rw.textContent=`+${a.reward||0} 💰`;d.querySelector("div").appendChild(rw);ag.appendChild(d)})}}
 async function claimStoredAchievementRewards(){
  if(!S.id)return;
  try{
   const d=await api("/api/claim-achievement-rewards",{method:"POST",body:JSON.stringify({id:S.id})});
   if(d?.profile)applyServerProfile(d.profile,false);
   if((Number(d?.reward)||0)>0){const toast=document.querySelector("#ratingToast");if(toast){toast.textContent=`🏅 +${d.reward} очков за ранее полученные достижения`;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),3000)}}
  }catch(e){console.warn("Achievement rewards claim failed",e)}
 }
 function checkProfileAchievements(){
  if(!S.id)return;
  if(S.games>=5)unlockAchievement("games5");
  if(S.games>=25)unlockAchievement("games25");
  if(S.wins>=3)unlockAchievement("wins3");
  if(S.wins>=10)unlockAchievement("wins10");
  if(S.rating>=500)unlockAchievement("rating500");
  if(S.rating>=1000)unlockAchievement("rating1000");
 }
 async function unlockAchievement(id){
  const a=ACHIEVEMENTS.find(x=>x.id===id);
  if(!a||S.achievements.includes(id)||achievementPending.has(id))return false;
  achievementPending.add(id);
  try{
   const d=await api("/api/unlock-achievement",{method:"POST",body:JSON.stringify({id:S.id,achievementId:id})});
   if(d?.profile)applyServerProfile(d.profile,false);
   else if(!S.achievements.includes(id))S.achievements.push(id);
   saveFallback();renderProfile();renderProfileModal();persistYandex();
   const reward=Number(d?.reward)||0;
   const toast=document.querySelector("#ratingToast");
   if(toast){toast.textContent=`🏅 ${a.name}${reward?` · +${reward} очков`:""}`;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2800)}
   return true;
  }catch(e){
   console.warn("Achievement unlock failed",e);
   return false;
  }finally{achievementPending.delete(id)}
 }
 function openModal(id){document.querySelectorAll(".modal").forEach(x=>x.classList.remove("show"));document.querySelector(id)?.classList.add("show")}
 function closeToMenu(){document.querySelectorAll(".modal").forEach(x=>x.classList.remove("show"));document.querySelector("#mainMenu")?.classList.add("show");loadLeaderboard()}
 function awardFromServer(profile,delta,matchPoints,reason=""){applyServerProfile(profile);const el=document.querySelector("#matchPoints");if(el)el.textContent=String(matchPoints||0);const toast=document.querySelector("#ratingToast");if(toast&&delta){toast.textContent=reason||`+${delta} очков за фишку в Домике`;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2200)}loadLeaderboard()}
 document.querySelector("#openRating")?.addEventListener("click",()=>{openModal("#ratingModal");loadLeaderboard()});document.querySelector("#openShop")?.addEventListener("click",()=>{openModal("#shopModal");renderShop()});document.querySelector("#openProfile")?.addEventListener("click",()=>{openModal("#profileModal");renderProfileModal()});document.querySelector("#profileAvatarButton")?.addEventListener("click",()=>{openModal("#profileModal");renderProfileModal()});document.querySelector("#profileLogin")?.addEventListener("click",login);document.querySelector("#avatarUploadBtn")?.addEventListener("click",()=>document.querySelector("#avatarUpload")?.click());document.querySelector("#avatarUpload")?.addEventListener("change",e=>{const f=e.target.files?.[0];if(f)handleAvatarUpload(f);e.target.value=""});document.querySelectorAll(".hubBack").forEach(b=>b.addEventListener("click",closeToMenu));
 window.MondavoshkaProfile={state:S,skins:SKINS,countrySkins:COUNTRY_SKINS,clubProducts:CLUB_PRODUCTS,tables:TABLES,dice:DICE,achievements:ACHIEVEMENTS,publicProfile,skinVisual,tableVisual,diceVisual,avatarInfo,paintAvatar,applyServerProfile,awardFromServer,loadLeaderboard,unlockAchievement,renderProfileModal,get equippedSkin(){return S.equipped},get equippedTable(){return S.equippedTable},get equippedDice(){return S.equippedDice},get avatar(){return S.avatar},get id(){return S.id},get name(){return S.name}};
 initPlayer();
})();

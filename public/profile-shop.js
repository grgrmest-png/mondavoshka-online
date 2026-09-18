"use strict";
(()=>{
 const SKINS=[
  {id:"default",name:"Классика",color:null,free:true},
  {id:"emerald",name:"Изумруд",color:"#16a66a"},
  {id:"violet",name:"Фиолетовый",color:"#7b4bc9"},
  {id:"gold",name:"Золотой",color:"#d6a51e"},
  {id:"orange",name:"Апельсин",color:"#ed7b24"},
  {id:"pink",name:"Розовый",color:"#e45a9b"},
  {id:"lime",name:"Лайм",color:"#86c73f"},
  {id:"ice",name:"Ледяной",color:"#73cfe8"},
  {id:"silver",name:"Серебро",color:"#aeb7c2"},
  {id:"burgundy",name:"Бордовый",color:"#8d2f49"},
  {id:"turquoise",name:"Бирюза",color:"#1bb7aa"}
 ];
 const CLUB_PRODUCTS=[
  {productId:"skin_barcelona",skinId:"club_barcelona",name:"Барселона"},
  {productId:"skin_real_madrid",skinId:"club_real_madrid",name:"Реал Мадрид"},
  {productId:"skin_bayern",skinId:"club_bayern",name:"Бавария"},
  {productId:"skin_manchester_city",skinId:"club_manchester_city",name:"Манчестер Сити"},
  {productId:"skin_liverpool",skinId:"club_liverpool",name:"Ливерпуль"}
 ];
 const CLUB_VISUALS={
  club_barcelona:{color:"#3346a8",stripe:"#a91d45"},
  club_real_madrid:{color:"#f7f7f4",stripe:"#d8bf63"},
  club_bayern:{color:"#d92736",stripe:"#1359a6"},
  club_manchester_city:{color:"#79bce6",stripe:"#ffffff"},
  club_liverpool:{color:"#bb1f2f",stripe:"#ffffff"}
 };
 const S={
  id:null,name:"Игрок",rating:0,balance:0,wins:0,games:0,
  owned:["default"],equipped:"default",authorized:false,player:null,payments:null,catalog:new Map()
 };
 let leaderboardDebounce=null;

 function serverBase(){
   const ws=String(window.MONDAVOSHKA_WS_URL||"").trim();
   if(ws)return ws.replace(/^wss:/,"https:").replace(/^ws:/,"http:").replace(/\/ws\/?$/,"");
   return location.origin;
 }
 function cleanId(v){return String(v||"").replace(/[^a-zA-Z0-9_.:-]/g,"").slice(0,120)}
 function fallbackId(){
   try{
     let id=localStorage.getItem("mondavoshka-profile-id");
     if(!id){id="anon-"+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem("mondavoshka-profile-id",id)}
     return id;
   }catch{return "anon-"+Math.random().toString(36).slice(2)}
 }
 function saveFallback(){
   try{localStorage.setItem("mondavoshka-profile",JSON.stringify({
     id:S.id,name:S.name,rating:S.rating,balance:S.balance,wins:S.wins,games:S.games,owned:S.owned,equipped:S.equipped
   }))}catch{}
 }
 function loadFallback(){
   try{
     const x=JSON.parse(localStorage.getItem("mondavoshka-profile")||"null");
     if(x){S.rating=+x.rating||0;S.balance=+x.balance||0;S.wins=+x.wins||0;S.games=+x.games||0;
       S.owned=Array.isArray(x.owned)?x.owned:["default"];S.equipped=x.equipped||"default";S.name=x.name||S.name}
   }catch{}
 }
 async function waitSdk(ms=3500){
   const start=Date.now();
   while(Date.now()-start<ms){
     if(window.ysdk)return window.ysdk;
     await new Promise(r=>setTimeout(r,100));
   }
   return null;
 }
 async function initPlayer(){
   loadFallback();
   S.id=fallbackId();
   const ysdk=await waitSdk();
   if(ysdk){
     try{
       const p=await ysdk.getPlayer();
       S.player=p;
       S.id=cleanId(p.getUniqueID?.()||S.id)||S.id;
       S.authorized=!!p.isAuthorized?.();
       const nm=String(p.getName?.()||"").trim();
       if(S.authorized&&nm&&nm!=="unauthorized")S.name=nm.slice(0,24);
       try{
         const stats=await p.getStats(["rating","pointsBalance","wins","games"]);
         S.rating=Math.max(S.rating,+stats.rating||0);
         S.balance=Math.max(S.balance,+stats.pointsBalance||0);
         S.wins=Math.max(S.wins,+stats.wins||0);
         S.games=Math.max(S.games,+stats.games||0);
       }catch{}
       try{
         const data=await p.getData(["ownedSkins","equippedSkin"]);
         if(Array.isArray(data.ownedSkins))S.owned=[...new Set(["default",...data.ownedSkins])];
         if(data.equippedSkin)S.equipped=data.equippedSkin;
       }catch{}
     }catch(e){console.warn("Yandex player unavailable",e)}
   }
   await syncServer();
   renderProfile();
   renderShop();
   loadLeaderboard();
   initPayments();
   prefillNames();
 }
 async function api(path,opts={}){
   const res=await fetch(serverBase()+path,{...opts,headers:{"content-type":"application/json",...(opts.headers||{})}});
   if(!res.ok)throw new Error((await res.text())||`HTTP ${res.status}`);
   return res.json();
 }
 async function syncServer(){
   try{
     const p=await api("/api/sync-profile",{method:"POST",body:JSON.stringify({
       id:S.id,name:S.name,rating:S.rating,balance:S.balance,wins:S.wins,games:S.games,owned:S.owned,equipped:S.equipped
     })});
     applyServerProfile(p.profile||p,false);
   }catch(e){console.warn("Profile sync failed",e)}
 }
 function applyServerProfile(p,persist=true){
   if(!p)return;
   S.rating=Math.max(0,+p.rating||0);
   S.balance=Math.max(0,+p.balance||0);
   S.wins=Math.max(0,+p.wins||0);
   S.games=Math.max(0,+p.games||0);
   if(Array.isArray(p.owned))S.owned=[...new Set(["default",...p.owned])];
   if(p.equipped)S.equipped=p.equipped;
   if(p.name)S.name=String(p.name).slice(0,24);
   saveFallback();renderProfile();renderShop();
   if(persist)persistYandex();
 }
 async function persistYandex(){
   if(!S.player)return;
   try{await S.player.setStats({rating:S.rating,pointsBalance:S.balance,wins:S.wins,games:S.games})}catch{}
   try{await S.player.setData({ownedSkins:S.owned,equippedSkin:S.equipped},true)}catch{}
   if(S.authorized&&window.ysdk?.leaderboards){
     clearTimeout(leaderboardDebounce);
     leaderboardDebounce=setTimeout(async()=>{
       try{
         const ok=await window.ysdk.isAvailableMethod?.("leaderboards.setScore");
         if(ok!==false)await window.ysdk.leaderboards.setScore("rating",S.rating);
       }catch{}
     },1200);
   }
 }
 function publicProfile(){return {id:S.id,name:S.name,skinId:S.equipped,rating:S.rating}}
 function getSkin(id){return SKINS.find(s=>s.id===id)||CLUB_PRODUCTS.find(x=>x.skinId===id)||SKINS[0]}
 function skinVisual(id){
   const s=SKINS.find(x=>x.id===id);
   if(s)return {color:s.color,name:s.name};
   const c=CLUB_PRODUCTS.find(x=>x.skinId===id);
   if(c)return {name:c.name,...(CLUB_VISUALS[id]||{color:"#bbb",stripe:"#777"})};
   return {color:null,name:"Классика"};
 }
 function renderProfile(){
   const n=document.querySelector("#profileName"),r=document.querySelector("#profileRating"),b=document.querySelector("#profileBalance");
   const w=document.querySelector("#profileWins"),login=document.querySelector("#profileLogin");
   if(n)n.textContent=S.name;
   if(r)r.textContent=String(S.rating);
   if(b)b.textContent=String(S.balance);
   if(w)w.textContent=String(S.wins);
   if(login){login.hidden=S.authorized;login.textContent="Войти в Яндекс";}
 }
 function prefillNames(){
   ["#randomPlayerName","#createPlayerName","#joinPlayerName"].forEach(sel=>{
     const el=document.querySelector(sel);if(el&&!el.value)el.value=S.name==="Игрок"?"":S.name;
   });
 }
 async function login(){
   if(!window.ysdk)return;
   try{
     await window.ysdk.auth.openAuthDialog();
     await initPlayer();
   }catch{}
 }
 async function loadLeaderboard(){
   const box=document.querySelector("#ratingList");
   if(box)box.innerHTML='<div class="ratingLoading">Загрузка рейтинга…</div>';
   try{
     const d=await api("/api/leaderboard?limit=30");
     const rows=d.entries||[];
     if(box){
       box.innerHTML="";
       rows.forEach((x,i)=>{
         const row=document.createElement("div");row.className="ratingRow"+(x.id===S.id?" me":"");
         row.innerHTML=`<span class="ratingPlace">${i+1}</span><span class="ratingName"></span><b>${x.rating}</b>`;
         row.querySelector(".ratingName").textContent=x.name||"Игрок";box.appendChild(row);
       });
       if(!rows.length)box.innerHTML='<div class="ratingLoading">Рейтинг пока пуст. Заведите первую фишку в Домик!</div>';
     }
   }catch(e){if(box)box.innerHTML='<div class="ratingLoading">Не удалось загрузить рейтинг.</div>'}
 }
 function skinCard(s){
   const owned=S.owned.includes(s.id),equipped=S.equipped===s.id;
   const d=document.createElement("div");d.className="skinCard"+(equipped?" equipped":"");
   const piece=document.createElement("div");piece.className="skinPiece";
   piece.style.background=s.color||"linear-gradient(145deg,#ff6873,#c7152b)";
   d.appendChild(piece);
   const name=document.createElement("b");name.textContent=s.name;d.appendChild(name);
   const cost=document.createElement("small");cost.textContent=s.free?"Базовая":"200 очков";d.appendChild(cost);
   const btn=document.createElement("button");btn.type="button";
   if(equipped){btn.textContent="Выбрано";btn.disabled=true}
   else if(owned){btn.textContent="Выбрать";btn.onclick=()=>equipSkin(s.id)}
   else{btn.textContent="Купить за 200";btn.disabled=S.balance<200;btn.onclick=()=>buySkin(s.id)}
   d.appendChild(btn);return d;
 }
 function renderShop(){
   const grid=document.querySelector("#skinGrid");
   if(grid){grid.innerHTML="";SKINS.forEach(s=>grid.appendChild(skinCard(s)))}
   const prem=document.querySelector("#premiumGrid");
   if(prem){
     prem.innerHTML="";
     CLUB_PRODUCTS.forEach(c=>{
       const owned=S.owned.includes(c.skinId),equipped=S.equipped===c.skinId,v=CLUB_VISUALS[c.skinId];
       const d=document.createElement("div");d.className="skinCard premium"+(equipped?" equipped":"");
       const piece=document.createElement("div");piece.className="skinPiece clubPiece";piece.style.background=`linear-gradient(90deg,${v.color} 0 48%,${v.stripe} 48% 58%,${v.color} 58%)`;d.appendChild(piece);
       const name=document.createElement("b");name.textContent=c.name;d.appendChild(name);
       const price=document.createElement("small");const prod=S.catalog.get(c.productId);price.textContent=prod?.price||"Премиум";d.appendChild(price);
       const btn=document.createElement("button");btn.type="button";
       if(equipped){btn.textContent="Выбрано";btn.disabled=true}
       else if(owned){btn.textContent="Выбрать";btn.onclick=()=>equipSkin(c.skinId)}
       else if(!window.MONDAVOSHKA_CLUB_LICENSED){btn.textContent="Скоро";btn.disabled=true}
       else if(!prod){btn.textContent="Скоро";btn.disabled=true}
       else{btn.textContent="Купить";btn.onclick=()=>buyPremium(c)}
       d.appendChild(btn);
       prem.appendChild(d);
     });
   }
 }
 async function buySkin(id){
   try{
     const d=await api("/api/buy-skin",{method:"POST",body:JSON.stringify({id:S.id,skinId:id})});
     applyServerProfile(d.profile);loadLeaderboard();
   }catch(e){alert(e.message||"Не удалось купить фишку")}
 }
 async function equipSkin(id){
   try{
     const d=await api("/api/equip-skin",{method:"POST",body:JSON.stringify({id:S.id,skinId:id})});
     applyServerProfile(d.profile);
   }catch(e){alert(e.message||"Не удалось выбрать фишку")}
 }
 async function initPayments(){
   if(!window.ysdk)return;
   try{
     S.payments=await window.ysdk.getPayments({signed:true});
     const catalog=await S.payments.getCatalog();
     if(Array.isArray(catalog))catalog.forEach(p=>S.catalog.set(p.id,p));
     renderShop();
     // Постоянные покупки восстанавливаем при каждом запуске.
     try{
       const purchases=await S.payments.getPurchases();
       if(purchases?.signature){
         const res=await fetch(serverBase()+"/api/purchases-sync",{method:"POST",headers:{"content-type":"text/plain"},body:purchases.signature});
         if(res.ok){const d=await res.json();applyServerProfile(d.profile)}
       }
     }catch{}
   }catch(e){console.warn("Payments unavailable",e)}
 }
 async function buyPremium(c){
   if(!S.payments)return;
   try{
     const r=await S.payments.purchase({id:c.productId,developerPayload:JSON.stringify({profileId:S.id,skinId:c.skinId})});
     if(!r?.signature)throw new Error("Яндекс не вернул подпись покупки");
     const res=await fetch(serverBase()+"/api/validate-purchase",{method:"POST",headers:{"content-type":"text/plain"},body:r.signature});
     if(!res.ok)throw new Error(await res.text());
     const d=await res.json();applyServerProfile(d.profile);
   }catch(e){if(String(e?.message||"").length)console.warn("Purchase failed",e)}
 }
 function openModal(id){document.querySelectorAll(".modal").forEach(x=>x.classList.remove("show"));document.querySelector(id)?.classList.add("show")}
 function closeToMenu(){document.querySelectorAll(".modal").forEach(x=>x.classList.remove("show"));document.querySelector("#mainMenu")?.classList.add("show");loadLeaderboard()}
 function awardFromServer(profile,delta,matchPoints){
   applyServerProfile(profile);
   const el=document.querySelector("#matchPoints");if(el)el.textContent=String(matchPoints||0);
   const toast=document.querySelector("#ratingToast");
   if(toast&&delta){toast.textContent=`+${delta} очков за фишку в Домике`;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),1800)}
   loadLeaderboard();
 }

 document.querySelector("#openRating")?.addEventListener("click",()=>{openModal("#ratingModal");loadLeaderboard()});
 document.querySelector("#openShop")?.addEventListener("click",()=>{openModal("#shopModal");renderShop()});
 document.querySelector("#profileLogin")?.addEventListener("click",login);
 document.querySelectorAll(".hubBack").forEach(b=>b.addEventListener("click",closeToMenu));

 window.MondavoshkaProfile={
   state:S,skins:SKINS,clubProducts:CLUB_PRODUCTS,publicProfile,skinVisual,applyServerProfile,awardFromServer,loadLeaderboard,
   get equippedSkin(){return S.equipped},get id(){return S.id},get name(){return S.name}
 };
 initPlayer();
})();

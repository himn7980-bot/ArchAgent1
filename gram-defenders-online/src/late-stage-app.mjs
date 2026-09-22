import { BASE_ENEMIES, buildTower, canBuildTower, canUpgradeTower, createGame, distance, getBossState, getElite, getStageConfig, getTowerStats, getUpgradeCost, moveHero, removeTower, startWave, updateGame, upgradeTower, useHeroSkill } from "./late-stage-game.mjs";
import { makePath } from "./late-stage-config.mjs";
import { LAND_RULES, completeStage, getLandStars, isNextLandUnlocked, isStageUnlocked } from "./progression.mjs";
import { STAGE_RATING, formatStars, getStageStars } from "./stage-rating.mjs";
import { grantStageReward } from "./meta-progression.mjs";
import { formatStageReward } from "./reward-ui.mjs";

const stageId=Number(document.body.dataset.stage);
if(!isStageUnlocked(stageId)) window.location.replace("/levels.html");
const cfg=getStageConfig(stageId),MAP=cfg.map,PATH=makePath(MAP);

const canvas=document.querySelector("#game"),ctx=canvas.getContext("2d");
const eyebrow=document.querySelector("#stage-eyebrow"),title=document.querySelector("#stage-title"),waveLabel=document.querySelector("#wave"),energyLabel=document.querySelector("#energy"),coreLabel=document.querySelector("#core"),heroLabel=document.querySelector("#hero-hp"),message=document.querySelector("#message");
const bossHud=document.querySelector("#boss-hud"),bossName=document.querySelector("#boss-name"),bossFill=document.querySelector("#boss-fill"),bossState=document.querySelector("#boss-state");
const startButton=document.querySelector("#start"),skillButton=document.querySelector("#hero-skill"),speedButton=document.querySelector("#game-speed"),upgradeButton=document.querySelector("#upgrade-tower");
const towerCard=document.querySelector("#tower-card"),removeButton=document.querySelector("#remove-tower"),buildStatus=document.querySelector("#build-status"),mapLink=document.querySelector(".stage-link");
let game=createGame(stageId),last=performance.now(),towerMode="build",selectedSlotId=null,pulseFxUntil=0,lastShownEnergy=game.energy,energyFlashUntil=0,victoryRecorded=false,lastStageReward=null;
const SPEED_STEPS=[1,2,3];let speedIndex=0,gameSpeed=1;
eyebrow.textContent=cfg.eyebrow;title.textContent="GRAM DEFENDERS";message.textContent=cfg.intro;
towerCard.querySelector("strong").textContent=`Pulse Tower · ${cfg.buildCost}⚡`;
towerCard.querySelector("small").textContent=`L1 → L2 ${cfg.upgradeCosts[2]}⚡ → L3 ${cfg.upgradeCosts[3]}⚡`;

const iso=({x,z})=>({x:canvas.width/2+(x-z)*27,y:334+(x+z)*13.5});
const unIso=(px,py)=>{const u=(px-canvas.width/2)/27,v=(py-334)/13.5;return{x:(u+v)/2,z:(v-u)/2};};
function pathStroke(points,color,width,smooth=false){const p=points.map(iso);ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);if(smooth){for(let i=1;i<p.length-1;i++){const m={x:(p[i].x+p[i+1].x)/2,y:(p[i].y+p[i+1].y)/2};ctx.quadraticCurveTo(p[i].x,p[i].y,m.x,m.y);}ctx.lineTo(p.at(-1).x,p.at(-1).y);}else p.slice(1).forEach(q=>ctx.lineTo(q.x,q.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap="round";ctx.lineJoin="round";ctx.stroke();}
function polygon(points,fill,stroke,width=2){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
function terrain(){const c=[{x:-15,z:-9},{x:15,z:-9},{x:15,z:9},{x:-15,z:9}].map(iso);polygon(c.map(p=>({x:p.x,y:p.y+24})),"#06111d","#102c42");polygon(c,"#102638","#35627f",3);}
function marker(point,label,color,r=15){const p=iso(point);ctx.save();ctx.shadowColor=color;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle="#dffaff";ctx.lineWidth=2;ctx.stroke();ctx.fillStyle="#04101b";ctx.font="800 12px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(label,p.x,p.y);ctx.restore();}
function drawTowerRange(slot,level){const p=iso(slot),stats=getTowerStats(level,game);ctx.save();ctx.beginPath();ctx.ellipse(p.x,p.y,stats.range*38,stats.range*19,0,0,Math.PI*2);ctx.fillStyle="#ffb23f18";ctx.fill();ctx.strokeStyle="#ffc45caa";ctx.lineWidth=2;ctx.setLineDash([9,7]);ctx.stroke();ctx.restore();}
function drawTower(slot){const p=iso(slot),tower=game.towers.find(t=>t.slotId===slot.id);if(!tower)return marker(slot,slot.id,selectedSlotId===slot.id?"#9a6a25":"#6f5830",14);ctx.save();ctx.shadowColor=tower.level===3?"#fff7ba":tower.level===2?"#fff0a3":"#ffb23f";ctx.shadowBlur=tower.level===3?34:tower.level===2?28:18;polygon([{x:p.x-20,y:p.y+11},{x:p.x,y:p.y+22},{x:p.x+20,y:p.y+11},{x:p.x,y:p.y}],tower.level===3?"#f0b82e":tower.level===2?"#d89618":"#a65d16","#ffd388");ctx.fillStyle=tower.level===3?"#fff0a0":tower.level===2?"#ffe083":"#ffb23f";ctx.fillRect(p.x-9,p.y-27,18,34);ctx.beginPath();ctx.arc(p.x,p.y-29,tower.level===3?18:tower.level===2?16:13,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="#112131";ctx.font="900 11px system-ui";ctx.textAlign="center";ctx.fillText(`${slot.id} L${tower.level}`,p.x,p.y+14);ctx.restore();}
function beam(origin,target,color){const a=iso(origin),b=iso(target);ctx.save();ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=14;ctx.globalAlpha=.78;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(a.x,a.y-18);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();}
function drawGuard(){const a=iso(game.hero.anchor);ctx.save();ctx.beginPath();ctx.ellipse(a.x,a.y,3.6*38,3.6*19,0,0,Math.PI*2);ctx.fillStyle="#47ddff10";ctx.fill();ctx.strokeStyle="#55e7ff88";ctx.lineWidth=2;ctx.setLineDash([10,8]);ctx.stroke();ctx.restore();}
function drawPulse(now){if(now>=pulseFxUntil)return;const p=iso(game.hero.position),k=1-(pulseFxUntil-now)/450,r=28+k*110;ctx.save();ctx.globalAlpha=Math.max(0,.8-k*.8);ctx.strokeStyle="#63efff";ctx.shadowColor="#2ddcff";ctx.shadowBlur=28;ctx.lineWidth=7-k*4;ctx.beginPath();ctx.ellipse(p.x,p.y,r,r*.5,0,0,Math.PI*2);ctx.stroke();ctx.restore();}

function render(now){
  ctx.clearRect(0,0,canvas.width,canvas.height);const gr=ctx.createRadialGradient(600,330,30,600,330,650);gr.addColorStop(0,"#163653");gr.addColorStop(1,"#07131f");ctx.fillStyle=gr;ctx.fillRect(0,0,canvas.width,canvas.height);
  terrain();pathStroke(PATH,"#20384d",116,true);pathStroke(PATH,"#587993",98,true);pathStroke(PATH,"#88a8bd",4,true);marker(MAP.spawn,"SP","#ff5d78",20);marker(MAP.core,"G","#8f6dff",27);
  const selected=MAP.towerSlots.find(s=>s.id===selectedSlotId),selectedTower=game.towers.find(t=>t.slotId===selectedSlotId);if(selected&&selectedTower)drawTowerRange(selected,selectedTower.level);
  MAP.towerSlots.forEach(drawTower);drawGuard();
  for(const e of game.enemies){
    const p=iso(e.position),type=BASE_ENEMIES[e.type],r=type.elite?20:e.type==="brute"?15:12;
    ctx.save();ctx.shadowColor=type.color;ctx.shadowBlur=type.elite?28:e.engaged?20:10;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=type.color;ctx.fill();if(e.engaged||type.elite){ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke();}ctx.restore();
    ctx.fillStyle="#07111e";ctx.fillRect(p.x-22,p.y-30,44,5);ctx.fillStyle="#6dff9a";ctx.fillRect(p.x-22,p.y-30,44*Math.max(0,e.health/e.maxHealth),5);
    if(e.maxShield>0){ctx.fillStyle="#102538";ctx.fillRect(p.x-22,p.y-36,44,4);ctx.fillStyle="#62e7ff";ctx.fillRect(p.x-22,p.y-36,44*Math.max(0,e.shield/e.maxShield),4);}
    ctx.fillStyle="#dceeff";ctx.font=type.elite?"900 10px system-ui":"700 9px system-ui";ctx.textAlign="center";ctx.fillText(type.label,p.x,p.y+r+13);
    if(e.engagement==="ranged"&&e.attackCooldown>(type.attackCooldown??1)*.55)beam(e.position,game.hero.position,type.color);
  }
  for(const t of game.towers){const slot=MAP.towerSlots.find(s=>s.id===t.slotId),stats=getTowerStats(t.level),target=game.enemies.filter(e=>distance(e.position,slot)<=stats.range).sort((a,b)=>b.progress-a.progress)[0];if(target&&t.cooldown>stats.cooldown*.72)beam(slot,target.position,t.level===3?"#fff1a0":t.level===2?"#ffe083":"#ffc45c");}
  const heroTarget=game.enemies.find(e=>e.id===game.hero.targetId)||null,hp=iso(game.hero.position);ctx.save();ctx.shadowColor=game.hero.downTimer>0?"#ff6b7f":"#44e9ff";ctx.shadowBlur=20;ctx.beginPath();ctx.arc(hp.x,hp.y-11,19,0,Math.PI*2);ctx.fillStyle=game.hero.downTimer>0?"#5f2634":"#e8f7ff";ctx.fill();ctx.shadowBlur=0;ctx.fillStyle=game.hero.downTimer>0?"#3d1821":"#135bd6";ctx.fillRect(hp.x-15,hp.y-9,30,34);ctx.fillStyle="#fff";ctx.font="900 11px system-ui";ctx.textAlign="center";ctx.fillText("V",hp.x,hp.y+11);ctx.restore();
  if(heroTarget&&game.hero.state==="fighting"&&game.hero.cooldown>.42)beam(game.hero.position,heroTarget.position,"#dffaff");drawPulse(now);
}

function updateUi(){
  if(game.status==="won"&&!victoryRecorded){
    completeStage(stageId,game.stars);lastStageReward=grantStageReward(stageId,game.stars).reward;victoryRecorded=true;
    mapLink.href=`/levels.html?completed=${stageId}&stars=${game.stars}`;
    if(stageId<8){
      mapLink.textContent=`Continue · Stage ${stageId+1}`;
    }else{
      mapLink.textContent=isNextLandUnlocked()?"Land 02 Unlocked · Coming Next":`Land 01 Map · ${getLandStars()}/${LAND_RULES.nextLandStarRequirement}★`;
    }
  }
  if(game.energy!==lastShownEnergy){energyFlashUntil=performance.now()+450;lastShownEnergy=game.energy;}
  energyLabel.textContent=`Energy ${game.energy} / ${cfg.maxEnergy}`;energyLabel.classList.toggle("energy-flash",performance.now()<energyFlashUntil);
  waveLabel.textContent=`Wave ${game.wave} / ${cfg.waves.length}`;coreLabel.textContent=`Leaks ${game.leaks}/${STAGE_RATING.maxLeaks} · ${formatStars(getStageStars(game.leaks))}`;
  heroLabel.textContent=game.hero.downTimer>0?`VOLYA respawn ${game.hero.downTimer.toFixed(1)}s`:`VOLYA ${Math.ceil(game.hero.health)} / ${game.hero.maxHealth} · ${game.hero.state.toUpperCase()}`;

  const clear=!game.spawnQueue.length&&!game.enemies.length;startButton.disabled=!clear||game.status==="won"||game.status==="lost";startButton.textContent=game.wave>=cfg.waves.length?"All Waves Deployed":`Start Wave ${game.wave+1}`;
  const cd=game.hero.skillCooldown;skillButton.disabled=game.status!=="playing"||Boolean(game.hero.manualDestination)||game.hero.downTimer>0||cd>0;skillButton.textContent=cd>0?`GRAM Pulse · ${cd.toFixed(1)}s`:"GRAM Pulse";

  const tower=game.towers.find(t=>t.slotId===selectedSlotId),cost=selectedSlotId?getUpgradeCost(game,selectedSlotId):null;
  upgradeButton.disabled=!tower||tower.level>=cfg.maxTowerLevel||!canUpgradeTower(game,selectedSlotId);
  upgradeButton.textContent=tower?(tower.level>=cfg.maxTowerLevel?`${selectedSlotId} MAX LEVEL`:`Upgrade ${selectedSlotId} → L${tower.level+1} · ${cost}⚡`):"Upgrade selected tower";

  const elite=getElite(game);bossHud.hidden=!elite;
  if(elite){const type=BASE_ENEMIES[elite.type],ratio=Math.max(0,elite.health/elite.maxHealth);bossName.textContent=type.label;bossFill.style.width=`${ratio*100}%`;bossState.textContent=getBossState(elite);}

  if(game.status==="won")message.textContent=stageId===8?(isNextLandUnlocked()?`LAND 01 CLEARED · ${formatStars(game.stars)} · ${formatStageReward(lastStageReward)} · ${getLandStars()}/${LAND_RULES.maxStars}★ · Land 02 unlocked.`:`LAND 01 CLEARED · ${formatStars(game.stars)} · ${formatStageReward(lastStageReward)} · ${getLandStars()}/${LAND_RULES.maxStars}★ · Need ${LAND_RULES.nextLandStarRequirement}★ for Land 02.`):`STAGE ${stageId} COMPLETE · ${formatStars(game.stars)} · ${formatStageReward(lastStageReward)} · Stage ${stageId+1} unlocked.`;
  else if(game.status==="lost")message.textContent=game.mainBossEscaped?"DEFEAT · MAIN BOSS escaped to the Core.":"DEFEAT · 10 enemies escaped.";
  else if(game.status==="between"&&game.lastWaveBonus>0)message.textContent=`Wave cleared · +${game.lastWaveBonus} Energy bonus.`;
  else if(elite)message.textContent=elite.type==="coretyrant"?"CORE TYRANT active — break armor, then survive its enrage phase.":"Elite active — move VOLYA to pressure it while Towers provide support.";
  else if(game.status==="playing")message.textContent=cfg.intro;
  else message.textContent=cfg.intro;

  buildStatus.textContent=towerMode==="build"?`Build mode · ${game.towers.length}/3 towers · ${game.energy}⚡`:`Remove mode · no refund · ${game.energy}⚡`;
}
function advanceSimulation(realDt){let remaining=Math.min(realDt*gameSpeed,.5);while(remaining>0){const step=Math.min(.05,remaining);updateGame(game,step);remaining-=step;}}
function loop(now){const dt=(now-last)/1000;last=now;advanceSimulation(dt);render(now);updateUi();requestAnimationFrame(loop);}requestAnimationFrame(loop);
function setTowerMode(mode){towerMode=mode;towerCard.classList.toggle("selected",mode==="build");towerCard.setAttribute("aria-pressed",String(mode==="build"));removeButton.setAttribute("aria-pressed",String(mode==="remove"));updateUi();}

canvas.addEventListener("pointerdown",event=>{
  const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)*canvas.width/rect.width,y=(event.clientY-rect.top)*canvas.height/rect.height;let slot=null,best=42;
  for(const s of MAP.towerSlots){const p=iso(s),d=Math.hypot(x-p.x,y-p.y);if(d<best){slot=s;best=d;}}
  if(slot){selectedSlotId=slot.id;
    if(towerMode==="remove"){const removed=removeTower(game,slot.id);if(removed)selectedSlotId=null;}
    else if(!game.towers.some(t=>t.slotId===slot.id))buildTower(game,slot.id);
    return;
  }
  moveHero(game,unIso(x,y));
});
startButton.addEventListener("click",()=>startWave(game));
skillButton.addEventListener("click",()=>{if(useHeroSkill(game))pulseFxUntil=performance.now()+450;});
speedButton.addEventListener("click",()=>{speedIndex=(speedIndex+1)%SPEED_STEPS.length;gameSpeed=SPEED_STEPS[speedIndex];speedButton.textContent=`Speed ${gameSpeed}×`;speedButton.classList.toggle("fast",gameSpeed>1);});
upgradeButton.addEventListener("click",()=>{if(selectedSlotId)upgradeTower(game,selectedSlotId);});
towerCard.addEventListener("click",()=>setTowerMode("build"));removeButton.addEventListener("click",()=>setTowerMode("remove"));
document.querySelector("#restart").addEventListener("click",()=>{game=createGame(stageId);selectedSlotId=null;pulseFxUntil=0;lastShownEnergy=game.energy;victoryRecorded=false;lastStageReward=null;setTowerMode("build");last=performance.now();});

import { MAP, distance, samplePathWithOffset } from "./stage4-map.mjs";
import { STAGE_RATING, getStageStars } from "./stage-rating.mjs";

export const ENEMY_TYPES=Object.freeze({
  scout:Object.freeze({id:"scout",label:"Scout",combat:"melee",health:100,speed:.026,damage:10,attackCooldown:1.05,interceptRange:1.55,energyReward:2}),
  archer:Object.freeze({id:"archer",label:"Archer",combat:"ranged",health:120,speed:.021,damage:12,attackCooldown:1.3,attackRange:5.2,energyReward:3}),
  brute:Object.freeze({id:"brute",label:"Brute",combat:"melee",health:215,speed:.017,damage:22,attackCooldown:1.2,interceptRange:1.75,energyReward:5}),
  corebreaker:Object.freeze({
    id:"corebreaker",label:"COREBREAKER",combat:"melee",elite:true,
    health:850,speed:.012,damage:34,attackCooldown:1.15,interceptRange:1.9,energyReward:25,
    armoredAbove:.5,towerDamageMultiplier:.65
  })
});

const LANE_OFFSETS=Object.freeze([-1.05,-.55,0,.55,1.05]);
const TOWER_LEVELS=Object.freeze({
  1:Object.freeze({damage:15,range:4.6,cooldown:.78}),
  2:Object.freeze({damage:25,range:5.15,cooldown:.66})
});

function group(type,count,interval,gapAfter=0){return {type,count,interval,gapAfter};}

export const WAVES=Object.freeze([
  Object.freeze([group("scout",5,.62,2.4),group("archer",4,.74,2.1),group("brute",4,.82,0)]),
  Object.freeze([group("scout",5,.60,2.2),group("archer",5,.72,1.9),group("brute",6,.80,0)]),
  Object.freeze([group("scout",4,.60,1.9),group("archer",4,.72,1.8),group("brute",4,.80,2.8),group("corebreaker",1,0,0)])
]);

export const CONFIG=Object.freeze({
  maxLeaks:STAGE_RATING.maxLeaks,
  coreHealth:4,
  heroMaxHealth:500,heroDamage:48,heroRange:1.18,heroCooldown:.72,
  heroMoveSpeed:4.2,heroGuardRadius:3.6,heroRespawnDelay:15,
  heroSkillDamage:100,heroSkillRadius:2.6,heroSkillCooldown:10,
  maxTowers:3,maxTowerLevel:2,
  startEnergy:90,maxEnergy:160,towerBuildCost:35,towerUpgradeCost:30,
  waveEnergyBonus:Object.freeze([12,15,20])
});

function addEnergy(game,amount){
  const before=game.energy;
  game.energy=Math.min(CONFIG.maxEnergy,game.energy+Math.max(0,amount));
  game.lastEnergyGain=game.energy-before;
  return game.lastEnergyGain;
}
function spendEnergy(game,amount){if(game.energy<amount)return false;game.energy-=amount;game.lastEnergyGain=0;return true;}
function buildSpawnQueue(groups){
  const queue=[];
  groups.forEach((entry,groupIndex)=>{
    for(let i=0;i<entry.count;i+=1){
      queue.push({type:entry.type,delay:i===0&&groupIndex===0?0:(i===0?groups[groupIndex-1].gapAfter:entry.interval)});
    }
  });
  return queue;
}
function clampPoint(point){
  const margin=.8;
  return {x:Math.max(-MAP.width/2+margin,Math.min(MAP.width/2-margin,point.x)),z:Math.max(-MAP.depth/2+margin,Math.min(MAP.depth/2-margin,point.z))};
}

export function createGame(){
  const start={x:-7.0,z:3.0};
  return {
    status:"ready",leaks: 0, stars: null, wave:0,enemies:[],spawnQueue:[],spawnTimer:0,nextEnemyId:1,
    energy:CONFIG.startEnergy,lastEnergyGain:0,lastWaveBonus:0,
    hero:{position:{...start},anchor:{...start},manualDestination:null,targetId:null,state:"guard",health:CONFIG.heroMaxHealth,cooldown:0,skillCooldown:0,downTimer:0},
    towers:[]
  };
}

export function canBuildTower(game,slotId){
  return game.status!=="won"&&game.status!=="lost"&&MAP.towerSlots.some(s=>s.id===slotId)&&!game.towers.some(t=>t.slotId===slotId)&&game.towers.length<CONFIG.maxTowers&&game.energy>=CONFIG.towerBuildCost;
}
export function buildTower(game,slotId){
  if(!canBuildTower(game,slotId)||!spendEnergy(game,CONFIG.towerBuildCost))return false;
  game.towers.push({slotId,level:1,cooldown:0});return true;
}
export function canUpgradeTower(game,slotId){
  const tower=game.towers.find(t=>t.slotId===slotId);
  return Boolean(tower)&&tower.level<CONFIG.maxTowerLevel&&game.status!=="won"&&game.status!=="lost"&&game.energy>=CONFIG.towerUpgradeCost;
}
export function upgradeTower(game,slotId){
  if(!canUpgradeTower(game,slotId)||!spendEnergy(game,CONFIG.towerUpgradeCost))return false;
  const tower=game.towers.find(t=>t.slotId===slotId);tower.level+=1;tower.cooldown=0;return true;
}
export function removeTower(game,slotId){
  const i=game.towers.findIndex(t=>t.slotId===slotId);
  if(i===-1||game.status==="won"||game.status==="lost")return false;
  game.towers.splice(i,1);return true;
}
export function startWave(game){
  if(game.status==="won"||game.status==="lost"||game.spawnQueue.length||game.enemies.length||game.wave>=WAVES.length)return false;
  game.spawnQueue=buildSpawnQueue(WAVES[game.wave]);game.wave+=1;game.spawnTimer=0;game.lastWaveBonus=0;game.status="playing";return true;
}
export function moveHero(game,point){
  if(game.status==="won"||game.status==="lost"||game.hero.downTimer>0||!point||!Number.isFinite(point.x)||!Number.isFinite(point.z))return false;
  const d=clampPoint(point);game.hero.anchor={...d};game.hero.manualDestination={...d};game.hero.targetId=null;game.hero.state="relocating";return true;
}
export function useHeroSkill(game){
  if(game.status!=="playing"||game.hero.state==="relocating"||game.hero.downTimer>0||game.hero.skillCooldown>0)return false;
  const targets=game.enemies.filter(e=>distance(e.position,game.hero.position)<=CONFIG.heroSkillRadius);
  if(!targets.length)return false;
  for(const t of targets)t.health-=CONFIG.heroSkillDamage;
  game.hero.skillCooldown=CONFIG.heroSkillCooldown;return true;
}
function spawnEnemy(game,typeId){
  const type=ENEMY_TYPES[typeId],id=game.nextEnemyId++,laneOffset=type.elite?0:LANE_OFFSETS[(id-1)%LANE_OFFSETS.length];
  game.enemies.push({id,type:typeId,health:type.health,maxHealth:type.health,progress:0,laneOffset,position:samplePathWithOffset(0,laneOffset),attackCooldown:0,engaged:false,engagement:null});
}
function moveToward(p,t,s,dt){
  const dx=t.x-p.x,dz=t.z-p.z,r=Math.hypot(dx,dz);
  if(r<.03){p.x=t.x;p.z=t.z;return true;}
  const tr=Math.min(r,s*dt);p.x+=dx/r*tr;p.z+=dz/r*tr;return tr>=r-1e-6;
}
function findHeroTarget(game){
  return game.enemies.filter(e=>e.health>0&&distance(e.position,game.hero.anchor)<=CONFIG.heroGuardRadius).sort((a,b)=>{
    const ae=ENEMY_TYPES[a.type].elite?1:0,be=ENEMY_TYPES[b.type].elite?1:0;
    return be-ae||b.progress-a.progress;
  })[0]||null;
}
function updateHeroAI(game,dt){
  const h=game.hero;if(h.downTimer>0)return;
  if(h.manualDestination){
    const arrived=moveToward(h.position,h.manualDestination,CONFIG.heroMoveSpeed,dt);h.state="relocating";h.targetId=null;
    if(arrived){h.manualDestination=null;h.state="guard";}return;
  }
  let t=game.enemies.find(e=>e.id===h.targetId&&e.health>0)||null;
  if(t&&distance(t.position,h.anchor)>CONFIG.heroGuardRadius+.25){t=null;h.targetId=null;}
  if(!t){t=findHeroTarget(game);h.targetId=t?.id??null;}
  if(t){if(distance(h.position,t.position)>CONFIG.heroRange){moveToward(h.position,t.position,CONFIG.heroMoveSpeed,dt);h.state="chasing";}else h.state="fighting";return;}
  if(distance(h.position,h.anchor)>.06){moveToward(h.position,h.anchor,CONFIG.heroMoveSpeed,dt);h.state="returning";}else{h.position={...h.anchor};h.state="guard";}
}
function updateRespawn(game,dt){
  if(game.hero.downTimer<=0)return;
  game.hero.downTimer=Math.max(0,game.hero.downTimer-dt);
  if(game.hero.downTimer===0){game.hero.health=CONFIG.heroMaxHealth;game.hero.position={...game.hero.anchor};game.hero.manualDestination=null;game.hero.targetId=null;game.hero.state="guard";}
}
function moveEnemy(enemy,type,dt){enemy.progress+=type.speed*dt;enemy.position=samplePathWithOffset(enemy.progress,enemy.laneOffset);}
function nearestTarget(enemies,origin,range){return enemies.filter(e=>distance(e.position,origin)<=range).sort((a,b)=>b.progress-a.progress)[0];}
function towerAttack(tower,enemies,origin,dt){
  const stats=TOWER_LEVELS[tower.level];tower.cooldown=Math.max(0,tower.cooldown-dt);if(tower.cooldown>0)return null;
  const target=nearestTarget(enemies,origin,stats.range);if(!target)return null;
  const type=ENEMY_TYPES[target.type];
  const armored=type.elite&&target.health/target.maxHealth>type.armoredAbove;
  target.health-=stats.damage*(armored?type.towerDamageMultiplier:1);
  tower.cooldown=stats.cooldown;return target;
}
export function getTowerStats(level){return TOWER_LEVELS[Math.max(1,Math.min(CONFIG.maxTowerLevel,level))];}
export function getElite(game){return game.enemies.find(e=>ENEMY_TYPES[e.type].elite)||null;}

export function updateGame(game,dt){
  const step=Math.max(0,Math.min(dt,.1));
  if(game.status==="won"||game.status==="lost")return game;
  if(game.status!=="playing"){if(game.hero.downTimer<=0)updateHeroAI(game,step);return game;}

  game.hero.skillCooldown=Math.max(0,game.hero.skillCooldown-step);updateRespawn(game,step);
  game.spawnTimer-=step;
  if(game.spawnQueue.length&&game.spawnTimer<=0){const n=game.spawnQueue.shift();spawnEnemy(game,n.type);game.spawnTimer=game.spawnQueue.length?game.spawnQueue[0].delay:0;}

  const heroActive=game.hero.downTimer<=0&&game.hero.health>0;if(heroActive)updateHeroAI(game,step);

  for(const e of game.enemies){
    const type=ENEMY_TYPES[e.type];e.attackCooldown=Math.max(0,e.attackCooldown-step);e.engaged=false;e.engagement=null;
    if(type.combat==="ranged"){
      const canShoot=heroActive&&distance(e.position,game.hero.position)<=type.attackRange;
      if(canShoot){e.engaged=true;e.engagement="ranged";if(e.attackCooldown<=0){game.hero.health-=type.damage;e.attackCooldown=type.attackCooldown;}}
      else moveEnemy(e,type,step);
      continue;
    }
    const locked=heroActive&&game.hero.targetId===e.id&&game.hero.state!=="relocating";
    const melee=locked&&distance(e.position,game.hero.position)<=type.interceptRange;
    if(melee){e.engaged=true;e.engagement="melee";if(e.attackCooldown<=0){game.hero.health-=type.damage;e.attackCooldown=type.attackCooldown;}}
    else moveEnemy(e,type,step);
  }

  if(heroActive&&game.hero.targetId&&game.hero.state!=="relocating"){
    const t=game.enemies.find(e=>e.id===game.hero.targetId&&e.health>0);
    game.hero.cooldown=Math.max(0,game.hero.cooldown-step);
    if(t&&distance(t.position,game.hero.position)<=CONFIG.heroRange&&game.hero.cooldown<=0){t.health-=CONFIG.heroDamage;game.hero.cooldown=CONFIG.heroCooldown;}
  }else game.hero.cooldown=Math.max(0,game.hero.cooldown-step);

  for(const tower of game.towers){
    const pos=MAP.towerSlots.find(s=>s.id===tower.slotId);
    towerAttack(tower,game.enemies,pos,step);
  }

  const deadTarget=game.hero.targetId&&game.enemies.some(e=>e.id===game.hero.targetId&&e.health<=0);
  for(const e of game.enemies)if(e.health<=0)addEnergy(game,ENEMY_TYPES[e.type].energyReward);
  game.enemies=game.enemies.filter(e=>{if(e.health<=0)return false;if(e.progress>=1){game.leaks += 1;return false;}return true;});

  if(deadTarget||(game.hero.targetId&&!game.enemies.some(e=>e.id===game.hero.targetId))){
    game.hero.targetId=null;if(game.hero.state==="fighting"||game.hero.state==="chasing")game.hero.state="returning";
  }

  if(game.hero.health<=0&&game.hero.downTimer<=0){game.hero.health=0;game.hero.manualDestination=null;game.hero.targetId=null;game.hero.state="down";game.hero.downTimer=CONFIG.heroRespawnDelay;}

  if(game.leaks>=CONFIG.maxLeaks){game.status="lost";game.stars=0;}
  else if(!game.spawnQueue.length&&!game.enemies.length){
    const bonus=CONFIG.waveEnergyBonus[game.wave-1]??0;game.lastWaveBonus=addEnergy(game,bonus);game.status = game.wave === WAVES.length ? "won" : "between";
    if (game.status === "won") game.stars = getStageStars(game.leaks);
  }
  return game;
}

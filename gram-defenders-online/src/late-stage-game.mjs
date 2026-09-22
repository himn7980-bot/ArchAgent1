import { BASE_ENEMIES, distance, getStageConfig, getTowerStats, samplePathWithOffset } from "./late-stage-config.mjs";
import { STAGE_RATING, getStageStars } from "./stage-rating.mjs";

const LANE_OFFSETS=Object.freeze([-1.05,-.55,0,.55,1.05]);

function buildSpawnQueue(groups){
  const queue=[];
  groups.forEach((entry,groupIndex)=>{
    for(let i=0;i<entry.count;i+=1){
      queue.push({type:entry.type,delay:i===0&&groupIndex===0?0:(i===0?groups[groupIndex-1].gapAfter:entry.interval)});
    }
  });
  return queue;
}
function clampPoint(map,point){
  const margin=.8;
  return {x:Math.max(-map.width/2+margin,Math.min(map.width/2-margin,point.x)),z:Math.max(-map.depth/2+margin,Math.min(map.depth/2-margin,point.z))};
}
function addEnergy(game,amount){
  const cfg=getStageConfig(game.stageId),before=game.energy;
  game.energy=Math.min(cfg.maxEnergy,game.energy+Math.max(0,amount));
  game.lastEnergyGain=game.energy-before;return game.lastEnergyGain;
}
function spendEnergy(game,amount){if(game.energy<amount)return false;game.energy-=amount;game.lastEnergyGain=0;return true;}
function upgradeCost(cfg,nextLevel){return cfg.upgradeCosts[nextLevel]??Infinity;}

export function createGame(stageId){
  const cfg=getStageConfig(stageId),start={x:-7,z:3};
  return {stageId:cfg.id,status:"ready",leaks:0,stars:null,mainBossEscaped:false,wave:0,enemies:[],spawnQueue:[],spawnTimer:0,nextEnemyId:1,
    energy:cfg.startEnergy,lastEnergyGain:0,lastWaveBonus:0,
    hero:{position:{...start},anchor:{...start},manualDestination:null,targetId:null,state:"guard",health:500,cooldown:0,skillCooldown:0,downTimer:0},
    towers:[]};
}
export function canBuildTower(game,slotId){
  const cfg=getStageConfig(game.stageId);
  return game.status!=="won"&&game.status!=="lost"&&cfg.map.towerSlots.some(s=>s.id===slotId)&&!game.towers.some(t=>t.slotId===slotId)&&game.towers.length<3&&game.energy>=cfg.buildCost;
}
export function buildTower(game,slotId){
  const cfg=getStageConfig(game.stageId);
  if(!canBuildTower(game,slotId)||!spendEnergy(game,cfg.buildCost))return false;
  game.towers.push({slotId,level:1,cooldown:0});return true;
}
export function canUpgradeTower(game,slotId){
  const cfg=getStageConfig(game.stageId),tower=game.towers.find(t=>t.slotId===slotId);
  if(!tower||tower.level>=cfg.maxTowerLevel||game.status==="won"||game.status==="lost")return false;
  return game.energy>=upgradeCost(cfg,tower.level+1);
}
export function upgradeTower(game,slotId){
  const cfg=getStageConfig(game.stageId),tower=game.towers.find(t=>t.slotId===slotId);
  if(!tower||!canUpgradeTower(game,slotId))return false;
  const cost=upgradeCost(cfg,tower.level+1);
  if(!spendEnergy(game,cost))return false;
  tower.level+=1;tower.cooldown=0;return true;
}
export function getUpgradeCost(game,slotId){
  const cfg=getStageConfig(game.stageId),tower=game.towers.find(t=>t.slotId===slotId);
  return tower&&tower.level<cfg.maxTowerLevel?upgradeCost(cfg,tower.level+1):null;
}
export function removeTower(game,slotId){
  const i=game.towers.findIndex(t=>t.slotId===slotId);
  if(i===-1||game.status==="won"||game.status==="lost")return false;
  game.towers.splice(i,1);return true;
}
export function startWave(game){
  const cfg=getStageConfig(game.stageId);
  if(game.status==="won"||game.status==="lost"||game.spawnQueue.length||game.enemies.length||game.wave>=cfg.waves.length)return false;
  game.spawnQueue=buildSpawnQueue(cfg.waves[game.wave]);game.wave+=1;game.spawnTimer=0;game.lastWaveBonus=0;game.status="playing";return true;
}
export function moveHero(game,point){
  const cfg=getStageConfig(game.stageId);
  if(game.status==="won"||game.status==="lost"||game.hero.downTimer>0||!point||!Number.isFinite(point.x)||!Number.isFinite(point.z))return false;
  const d=clampPoint(cfg.map,point);game.hero.anchor={...d};game.hero.manualDestination={...d};game.hero.targetId=null;game.hero.state="relocating";return true;
}
function applyDamage(enemy,amount,source="hero"){
  const type=BASE_ENEMIES[enemy.type];
  let damage=amount;
  if(source==="tower"&&type.elite&&type.armoredAbove!=null&&enemy.health/enemy.maxHealth>type.armoredAbove){
    damage*=type.towerDamageMultiplier??1;
  }
  if(enemy.shield>0){
    const absorbed=Math.min(enemy.shield,damage);
    enemy.shield-=absorbed;damage-=absorbed;
  }
  if(damage>0)enemy.health-=damage;
}
export function useHeroSkill(game){
  if(game.status!=="playing"||game.hero.state==="relocating"||game.hero.downTimer>0||game.hero.skillCooldown>0)return false;
  const targets=game.enemies.filter(e=>distance(e.position,game.hero.position)<=2.6);
  if(!targets.length)return false;
  for(const t of targets)applyDamage(t,100,"hero");
  game.hero.skillCooldown=10;return true;
}
function spawnEnemy(game,typeId){
  const cfg=getStageConfig(game.stageId),type=BASE_ENEMIES[typeId],id=game.nextEnemyId++,laneOffset=type.elite?0:LANE_OFFSETS[(id-1)%LANE_OFFSETS.length];
  game.enemies.push({id,type:typeId,health:type.health,maxHealth:type.health,shield:type.shield??0,maxShield:type.shield??0,progress:0,laneOffset,position:samplePathWithOffset(cfg.map,0,laneOffset),attackCooldown:0,engaged:false,engagement:null});
}
function moveToward(p,t,s,dt){
  const dx=t.x-p.x,dz=t.z-p.z,r=Math.hypot(dx,dz);
  if(r<.03){p.x=t.x;p.z=t.z;return true;}
  const tr=Math.min(r,s*dt);p.x+=dx/r*tr;p.z+=dz/r*tr;return tr>=r-1e-6;
}
function findHeroTarget(game){
  return game.enemies.filter(e=>e.health>0&&distance(e.position,game.hero.anchor)<=3.6).sort((a,b)=>{
    const ae=BASE_ENEMIES[a.type].elite?1:0,be=BASE_ENEMIES[b.type].elite?1:0;
    return be-ae||b.progress-a.progress;
  })[0]||null;
}
function updateHeroAI(game,dt){
  const h=game.hero;if(h.downTimer>0)return;
  if(h.manualDestination){
    const arrived=moveToward(h.position,h.manualDestination,4.2,dt);h.state="relocating";h.targetId=null;
    if(arrived){h.manualDestination=null;h.state="guard";}return;
  }
  let t=game.enemies.find(e=>e.id===h.targetId&&e.health>0)||null;
  if(t&&distance(t.position,h.anchor)>3.85){t=null;h.targetId=null;}
  if(!t){t=findHeroTarget(game);h.targetId=t?.id??null;}
  if(t){if(distance(h.position,t.position)>1.18){moveToward(h.position,t.position,4.2,dt);h.state="chasing";}else h.state="fighting";return;}
  if(distance(h.position,h.anchor)>.06){moveToward(h.position,h.anchor,4.2,dt);h.state="returning";}else{h.position={...h.anchor};h.state="guard";}
}
function updateRespawn(game,dt){
  if(game.hero.downTimer<=0)return;
  game.hero.downTimer=Math.max(0,game.hero.downTimer-dt);
  if(game.hero.downTimer===0){game.hero.health=500;game.hero.position={...game.hero.anchor};game.hero.manualDestination=null;game.hero.targetId=null;game.hero.state="guard";}
}
function moveEnemy(game,enemy,type,dt){
  const cfg=getStageConfig(game.stageId),ratio=enemy.health/enemy.maxHealth;
  const mult=type.enrageBelow!=null&&ratio<=type.enrageBelow?(type.enrageSpeedMultiplier??1):1;
  enemy.progress+=type.speed*mult*dt;enemy.position=samplePathWithOffset(cfg.map,enemy.progress,enemy.laneOffset);
}
function nearestTarget(enemies,origin,range){return enemies.filter(e=>distance(e.position,origin)<=range).sort((a,b)=>b.progress-a.progress)[0];}
function towerAttack(game,tower,enemies,origin,dt){
  const stats=getTowerStats(tower.level);tower.cooldown=Math.max(0,tower.cooldown-dt);if(tower.cooldown>0)return null;
  const target=nearestTarget(enemies,origin,stats.range);if(!target)return null;
  applyDamage(target,stats.damage,"tower");tower.cooldown=stats.cooldown;return target;
}
export function getElite(game){return game.enemies.find(e=>BASE_ENEMIES[e.type].elite)||null;}
export function getBossState(enemy){
  if(!enemy)return null;
  const type=BASE_ENEMIES[enemy.type],ratio=enemy.health/enemy.maxHealth;
  if(type.enrageBelow!=null&&ratio<=type.enrageBelow)return "ENRAGED";
  if(type.armoredAbove!=null&&ratio>type.armoredAbove)return "ARMORED";
  return "VULNERABLE";
}

export function updateGame(game,dt){
  const cfg=getStageConfig(game.stageId),step=Math.max(0,Math.min(dt,.1));
  if(game.status==="won"||game.status==="lost")return game;
  if(game.status!=="playing"){if(game.hero.downTimer<=0)updateHeroAI(game,step);return game;}

  game.hero.skillCooldown=Math.max(0,game.hero.skillCooldown-step);updateRespawn(game,step);
  game.spawnTimer-=step;
  if(game.spawnQueue.length&&game.spawnTimer<=0){const n=game.spawnQueue.shift();spawnEnemy(game,n.type);game.spawnTimer=game.spawnQueue.length?game.spawnQueue[0].delay:0;}

  const heroActive=game.hero.downTimer<=0&&game.hero.health>0;if(heroActive)updateHeroAI(game,step);

  for(const e of game.enemies){
    const type=BASE_ENEMIES[e.type];e.attackCooldown=Math.max(0,e.attackCooldown-step);e.engaged=false;e.engagement=null;
    if(type.combat==="ranged"){
      const canShoot=heroActive&&distance(e.position,game.hero.position)<=type.attackRange;
      if(canShoot){
        e.engaged=true;e.engagement="ranged";
        if(e.attackCooldown<=0){
          game.hero.health-=type.damage;
          const ratio=e.health/e.maxHealth;
          e.attackCooldown=type.enrageBelow!=null&&ratio<=type.enrageBelow?(type.enrageAttackCooldown??type.attackCooldown):type.attackCooldown;
        }
      }else moveEnemy(game,e,type,step);
      continue;
    }
    const locked=heroActive&&game.hero.targetId===e.id&&game.hero.state!=="relocating";
    const melee=locked&&distance(e.position,game.hero.position)<=type.interceptRange;
    if(melee){
      e.engaged=true;e.engagement="melee";
      if(e.attackCooldown<=0){
        game.hero.health-=type.damage;
        const ratio=e.health/e.maxHealth;
        e.attackCooldown=type.enrageBelow!=null&&ratio<=type.enrageBelow?(type.enrageAttackCooldown??type.attackCooldown):type.attackCooldown;
      }
    }else moveEnemy(game,e,type,step);
  }

  if(heroActive&&game.hero.targetId&&game.hero.state!=="relocating"){
    const t=game.enemies.find(e=>e.id===game.hero.targetId&&e.health>0);
    game.hero.cooldown=Math.max(0,game.hero.cooldown-step);
    if(t&&distance(t.position,game.hero.position)<=1.18&&game.hero.cooldown<=0){applyDamage(t,48,"hero");game.hero.cooldown=.72;}
  }else game.hero.cooldown=Math.max(0,game.hero.cooldown-step);

  for(const tower of game.towers){
    const pos=cfg.map.towerSlots.find(s=>s.id===tower.slotId);towerAttack(game,tower,game.enemies,pos,step);
  }

  const deadTarget=game.hero.targetId&&game.enemies.some(e=>e.id===game.hero.targetId&&e.health<=0);
  for(const e of game.enemies)if(e.health<=0)addEnergy(game,BASE_ENEMIES[e.type].energyReward);
  game.enemies=game.enemies.filter(e=>{
    if(e.health<=0)return false;
    if(e.progress>=1){
      game.leaks+=1;
      if(cfg.mainBossType&&e.type===cfg.mainBossType){
        game.mainBossEscaped=true;
        game.status="lost";
        game.stars=0;
      }
      return false;
    }
    return true;
  });
  if(deadTarget||(game.hero.targetId&&!game.enemies.some(e=>e.id===game.hero.targetId))){
    game.hero.targetId=null;if(game.hero.state==="fighting"||game.hero.state==="chasing")game.hero.state="returning";
  }
  if(game.hero.health<=0&&game.hero.downTimer<=0){game.hero.health=0;game.hero.manualDestination=null;game.hero.targetId=null;game.hero.state="down";game.hero.downTimer=15;}

  if(game.mainBossEscaped){game.status="lost";game.stars=0;}
  else if(game.leaks>=STAGE_RATING.maxLeaks){game.status="lost";game.stars=0;}
  else if(!game.spawnQueue.length&&!game.enemies.length){
    game.lastWaveBonus=addEnergy(game,cfg.waveBonus[game.wave-1]??0);
    game.status=game.wave===cfg.waves.length?"won":"between";
    if(game.status==="won")game.stars=getStageStars(game.leaks);
  }
  return game;
}

export { BASE_ENEMIES, distance, getStageConfig, getTowerStats };

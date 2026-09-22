export const BASE_ENEMIES = Object.freeze({
  scout:Object.freeze({id:"scout",label:"Scout",combat:"melee",health:100,speed:.026,damage:10,attackCooldown:1.05,interceptRange:1.55,energyReward:2,color:"#ffcf5a"}),
  archer:Object.freeze({id:"archer",label:"Archer",combat:"ranged",health:120,speed:.021,damage:12,attackCooldown:1.30,attackRange:5.2,energyReward:3,color:"#74d7ff"}),
  brute:Object.freeze({id:"brute",label:"Brute",combat:"melee",health:215,speed:.017,damage:22,attackCooldown:1.20,interceptRange:1.75,energyReward:5,color:"#b88cff"}),
  shieldguard:Object.freeze({id:"shieldguard",label:"Shieldguard",combat:"melee",health:175,shield:120,speed:.016,damage:18,attackCooldown:1.18,interceptRange:1.72,energyReward:7,color:"#72e0b2"}),
  warden:Object.freeze({id:"warden",label:"WARDEN",combat:"ranged",elite:true,health:980,speed:.013,damage:26,attackCooldown:1.10,attackRange:6.3,energyReward:30,color:"#f08cff",armoredAbove:.55,towerDamageMultiplier:.70}),
  coretyrant:Object.freeze({id:"coretyrant",label:"CORE TYRANT",combat:"melee",elite:true,health:1800,speed:.0105,damage:40,attackCooldown:1.0,interceptRange:2.0,energyReward:50,color:"#ff5e8a",armoredAbove:.70,towerDamageMultiplier:.60,enrageBelow:.50,enrageSpeedMultiplier:1.55,enrageAttackCooldown:.62})
});

const TOWER_LEVELS = Object.freeze({
  1:Object.freeze({damage:15,range:4.6,cooldown:.78}),
  2:Object.freeze({damage:25,range:5.15,cooldown:.66}),
  3:Object.freeze({damage:39,range:5.65,cooldown:.56})
});

function g(type,count,interval,gapAfter=0){return Object.freeze({type,count,interval,gapAfter});}
function map(id,waypoints,towerSlots,laneWidth=3.4){
  return Object.freeze({
    id:`stage-${String(id).padStart(2,"0")}`,width:30,depth:18,laneWidth,
    spawn:Object.freeze({x:-13,z:6.3}),
    waypoints:Object.freeze(waypoints.map(p=>Object.freeze(p))),
    core:Object.freeze({x:13,z:-6.4}),
    towerSlots:Object.freeze(towerSlots.map(p=>Object.freeze(p)))
  });
}

export const STAGE_CONFIGS = Object.freeze({
  5:Object.freeze({
    id:5,title:"Shielded Threat",eyebrow:"LAND 01 · STAGE 05 · NEW THREAT",
    intro:"Shieldguards carry a separate shield bar. Break the shield before damaging their HP.",
    maxTowerLevel:3,startEnergy:100,maxEnergy:190,buildCost:35,upgradeCosts:Object.freeze({2:30,3:45}),waveBonus:Object.freeze([14,18,22]),
    map:map(5,
      [{x:-10.4,z:3.7},{x:-7.4,z:4.8},{x:-4.4,z:1.9},{x:-1.0,z:2.5},{x:2.2,z:-.4},{x:5.5,z:-2.6},{x:8.9,z:-1.7},{x:10.8,z:-4.7}],
      [{id:"T1",x:-11.2,z:1.0},{id:"T2",x:-6.1,z:2.1},{id:"T3",x:-.4,z:-.9},{id:"T4",x:5.2,z:.6},{id:"T5",x:10.3,z:-2.4}]
    ),
    waves:Object.freeze([
      Object.freeze([g("scout",4,.62,2.2),g("archer",3,.74,2.0),g("shieldguard",3,.86,0)]),
      Object.freeze([g("scout",4,.60,1.9),g("archer",4,.72,1.8),g("brute",4,.80,1.9),g("shieldguard",3,.84,0)]),
      Object.freeze([g("scout",5,.58,1.8),g("archer",4,.70,1.7),g("brute",4,.78,1.8),g("shieldguard",5,.82,0)])
    ])
  }),
  6:Object.freeze({
    id:6,title:"Combined Pressure",eyebrow:"LAND 01 · STAGE 06 · COMBINED PRESSURE",
    intro:"Mixed melee, ranged and shielded groups overlap. Energy and Tower Level 3 timing matter.",
    maxTowerLevel:3,startEnergy:105,maxEnergy:200,buildCost:35,upgradeCosts:Object.freeze({2:30,3:45}),waveBonus:Object.freeze([15,20,24]),
    map:map(6,
      [{x:-10.8,z:4.6},{x:-7.2,z:2.0},{x:-3.9,z:3.8},{x:-.5,z:.2},{x:2.8,z:2.3},{x:5.8,z:-1.9},{x:9.1,z:-.4},{x:10.9,z:-4.5}],
      [{id:"T1",x:-11.8,z:1.7},{id:"T2",x:-6.2,z:5.0},{id:"T3",x:-.2,z:-1.7},{id:"T4",x:5.7,z:1.1},{id:"T5",x:10.4,z:-2.0}]
    ),
    waves:Object.freeze([
      Object.freeze([g("scout",5,.58,1.7),g("archer",4,.68,1.6),g("shieldguard",4,.78,1.7),g("brute",3,.78,0)]),
      Object.freeze([g("scout",6,.55,1.5),g("archer",5,.66,1.5),g("shieldguard",5,.76,1.6),g("brute",4,.76,0)]),
      Object.freeze([g("scout",7,.52,1.4),g("archer",6,.64,1.4),g("shieldguard",6,.74,1.5),g("brute",5,.74,0)])
    ])
  }),
  7:Object.freeze({
    id:7,title:"Pre-Boss",eyebrow:"LAND 01 · STAGE 07 · PRE-BOSS",
    intro:"The WARDEN is a ranged Elite. It can attack VOLYA from far outside the Guard Radius.",
    maxTowerLevel:3,startEnergy:110,maxEnergy:210,buildCost:35,upgradeCosts:Object.freeze({2:30,3:45}),waveBonus:Object.freeze([16,21,28]),
    map:map(7,
      [{x:-10.5,z:3.3},{x:-7.0,z:5.0},{x:-3.8,z:1.3},{x:-.4,z:1.8},{x:2.4,z:-1.1},{x:5.6,z:1.0},{x:8.8,z:-2.3},{x:10.7,z:-4.8}],
      [{id:"T1",x:-11.3,z:.8},{id:"T2",x:-6.0,z:2.3},{id:"T3",x:-.2,z:-1.2},{id:"T4",x:5.6,z:-1.7},{id:"T5",x:10.2,z:-2.6}]
    ),
    waves:Object.freeze([
      Object.freeze([g("scout",5,.56,1.7),g("archer",5,.66,1.6),g("shieldguard",4,.76,1.7),g("brute",4,.76,0)]),
      Object.freeze([g("archer",6,.62,1.5),g("shieldguard",5,.73,1.5),g("brute",5,.73,0)]),
      Object.freeze([g("scout",4,.55,1.4),g("archer",5,.64,1.4),g("shieldguard",4,.74,1.8),g("warden",1,0,0)])
    ])
  }),
  8:Object.freeze({
    id:8,title:"Main Boss",eyebrow:"LAND 01 · STAGE 08 · MAIN BOSS",mainBossType:"coretyrant",
    intro:"CORE TYRANT has armor early, then enrages below 50% HP. If it reaches the Core, the stage is lost.",
    maxTowerLevel:3,startEnergy:120,maxEnergy:220,buildCost:35,upgradeCosts:Object.freeze({2:30,3:45}),waveBonus:Object.freeze([18,24,35]),
    map:map(8,
      [{x:-10.6,z:4.5},{x:-7.1,z:2.4},{x:-3.7,z:4.2},{x:-.2,z:.4},{x:3.0,z:2.0},{x:5.8,z:-2.3},{x:9.0,z:-.7},{x:10.8,z:-4.9}],
      [{id:"T1",x:-11.5,z:1.3},{id:"T2",x:-6.2,z:4.9},{id:"T3",x:-.1,z:-1.5},{id:"T4",x:5.9,z:.7},{id:"T5",x:10.5,z:-2.3}]
    ),
    waves:Object.freeze([
      Object.freeze([g("scout",6,.54,1.5),g("archer",5,.64,1.5),g("shieldguard",5,.74,1.6),g("brute",4,.74,0)]),
      Object.freeze([g("archer",6,.60,1.4),g("shieldguard",6,.70,1.4),g("brute",6,.70,0)]),
      Object.freeze([g("scout",4,.52,1.3),g("archer",4,.60,1.3),g("shieldguard",4,.70,1.3),g("brute",4,.70,2.6),g("coretyrant",1,0,0)])
    ])
  })
});

export function getStageConfig(stageId){
  const config=STAGE_CONFIGS[Number(stageId)];
  if(!config) throw new Error(`Unknown stage ${stageId}`);
  return config;
}
export function getTowerStats(level){return TOWER_LEVELS[Math.max(1,Math.min(3,Number(level)||1))];}
export function distance(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
export function makePath(map){return Object.freeze([map.spawn,...map.waypoints,map.core]);}
export function samplePath(map,progress){
  const path=makePath(map);
  const lengths=path.slice(1).map((point,i)=>distance(path[i],point));
  const total=lengths.reduce((sum,value)=>sum+value,0);
  let remaining=Math.max(0,Math.min(1,progress))*total;
  for(let i=0;i<lengths.length;i+=1){
    if(remaining<=lengths[i]){
      const t=lengths[i]?remaining/lengths[i]:0;
      return {x:path[i].x+(path[i+1].x-path[i].x)*t,z:path[i].z+(path[i+1].z-path[i].z)*t};
    }
    remaining-=lengths[i];
  }
  return {...map.core};
}
export function samplePathWithOffset(map,progress,lateralOffset=0){
  const p=Math.max(0,Math.min(1,progress)),center=samplePath(map,p),epsilon=.0025;
  const before=samplePath(map,Math.max(0,p-epsilon)),after=samplePath(map,Math.min(1,p+epsilon));
  const tx=after.x-before.x,tz=after.z-before.z,length=Math.hypot(tx,tz)||1;
  const nx=-tz/length,nz=tx/length,maxOffset=Math.max(0,map.laneWidth/2-.35);
  const offset=Math.max(-maxOffset,Math.min(maxOffset,lateralOffset));
  return {x:center.x+nx*offset,z:center.z+nz*offset};
}

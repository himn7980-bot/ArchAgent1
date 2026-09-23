const STORAGE_KEY="gram_defenders_meta_v3";

export const HERO_BLUEPRINTS=Object.freeze({
  VOLYA:Object.freeze({
    id:"VOLYA",name:"VOLYA",role:"Guardian / Tank",unlocked:true,
    baseStats:Object.freeze({hp:500,attack:48,defense:10,attackSpeed:1.0,critChance:5,critDamage:150})
  }),
  GRAMCAT:Object.freeze({
    id:"GRAMCAT",name:"Gramcat",role:"Ranged DPS",unlocked:true,
    baseStats:Object.freeze({hp:320,attack:62,defense:5,attackSpeed:1.25,critChance:8,critDamage:160})
  }),
  VIRUS:Object.freeze({
    id:"VIRUS",name:"virus",role:"Support / Debuff",unlocked:false,
    baseStats:Object.freeze({hp:360,attack:34,defense:7,attackSpeed:1.05,critChance:5,critDamage:150})
  })
});

export const TOWER_BLUEPRINTS=Object.freeze({
  PULSE:Object.freeze({id:"PULSE",name:"Pulse Tower",role:"Fast single target",unlocked:true,baseStats:Object.freeze({damage:15,range:4.6,cooldown:.78})}),
  ENERGY:Object.freeze({id:"ENERGY",name:"Energy Tower",role:"Armor pierce / Shield breaker",unlocked:true,baseStats:Object.freeze({damage:26,range:4.8,cooldown:1.05})}),
  BOMB:Object.freeze({id:"BOMB",name:"Bomb Tower",role:"Slow high AoE",unlocked:false,baseStats:Object.freeze({damage:58,range:4.9,cooldown:1.65})}),
  CONTROL:Object.freeze({id:"CONTROL",name:"Control Tower",role:"Slow / Crowd control",unlocked:false,baseStats:Object.freeze({damage:10,range:5.0,cooldown:1.0})})
});

export const META_RULES=Object.freeze({
  heroSquadSize:3,
  towerDeckSize:4,
  maxPrototypeLevel:10,
  currencies:Object.freeze(["coins","gems","materials"])
});

export const STAGE_REWARD_RULES=Object.freeze({
  firstClearCoinsBase:100,
  firstClearCoinsPerStage:25,
  firstClearMaterialsBase:3,
  replayCoinsBase:20,
  replayCoinsPerStage:5,
  perfectBonusCoinsBase:50,
  perfectBonusCoinsPerStage:10,
  perfectBonusMaterials:2,
  perfectBonusGems:1
});

function defaultState(){
  return {
    wallet:{coins:1500,gems:50,materials:30},
    heroSquad:["VOLYA","GRAMCAT",null],
    towerDeck:["PULSE","ENERGY",null,null],
    heroes:{
      VOLYA:{unlocked:true,level:1,rank:1},
      GRAMCAT:{unlocked:true,level:1,rank:1},
      VIRUS:{unlocked:false,level:1,rank:1}
    },
    towers:{
      PULSE:{unlocked:true,level:1},
      ENERGY:{unlocked:true,level:1},
      BOMB:{unlocked:false,level:1},
      CONTROL:{unlocked:false,level:1}
    },
    rewardClaims:{}
  };
}

function clampLevel(value){
  return Math.max(1,Math.min(META_RULES.maxPrototypeLevel,Math.floor(Number(value)||1)));
}
function clampWalletValue(value,fallback=0){
  const n=Number(value);
  return Math.max(0,Math.floor(Number.isFinite(n)?n:fallback));
}
function normalize(raw){
  const base=defaultState(),value=raw||{};
  const wallet={
    coins:clampWalletValue(value.wallet?.coins,base.wallet.coins),
    gems:clampWalletValue(value.wallet?.gems,base.wallet.gems),
    materials:clampWalletValue(value.wallet?.materials,base.wallet.materials)
  };
  const heroes={};
  for(const id of Object.keys(HERO_BLUEPRINTS)){
    heroes[id]={
      unlocked:base.heroes[id].unlocked||Boolean(value.heroes?.[id]?.unlocked),
      level:clampLevel(value.heroes?.[id]?.level??1),
      rank:Math.max(1,Math.floor(Number(value.heroes?.[id]?.rank??1)))
    };
  }
  const towers={};
  for(const id of Object.keys(TOWER_BLUEPRINTS)){
    towers[id]={
      unlocked:base.towers[id].unlocked||Boolean(value.towers?.[id]?.unlocked),
      level:clampLevel(value.towers?.[id]?.level??1)
    };
  }
  const heroSquad=Array.from({length:META_RULES.heroSquadSize},(_,i)=>{
    const id=value.heroSquad?.[i]??base.heroSquad[i];
    return heroes[id]?.unlocked?id:(base.heroSquad[i]||null);
  });
  const towerDeck=Array.from({length:META_RULES.towerDeckSize},(_,i)=>{
    const id=value.towerDeck?.[i]??base.towerDeck[i];
    return towers[id]?.unlocked?id:(base.towerDeck[i]||null);
  });
  const rewardClaims={};
  for(const [stageId,claim] of Object.entries(value.rewardClaims||{})){
    const stage=Math.floor(Number(stageId));
    if(!Number.isInteger(stage)||stage<1)continue;
    rewardClaims[stage]={
      firstClear:Boolean(claim?.firstClear),
      perfectBonus:Boolean(claim?.perfectBonus)
    };
  }
  return {wallet,heroSquad,towerDeck,heroes,towers,rewardClaims};
}
function readLegacy(){
  for(const key of ["gram_defenders_meta_v2","gram_defenders_meta_v1"]){
    try{
      const raw=localStorage.getItem(key);
      if(raw)return JSON.parse(raw);
    }catch{}
  }
  return null;
}
function read(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(raw)return normalize(JSON.parse(raw));
    const legacy=readLegacy();
    return normalize(legacy);
  }catch{return defaultState();}
}
function write(state){
  const value=normalize(state);
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));}catch{}
  return value;
}

export function getMetaState(){return read();}
export function resetMeta(){
  const state=defaultState();
  try{
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("gram_defenders_meta_v1");
    localStorage.removeItem("gram_defenders_meta_v2");
  }catch{}
  return write(state);
}

export function getHeroUpgradeCost(id){
  const state=read(),entry=state.heroes[id];
  if(!entry||!entry.unlocked||entry.level>=META_RULES.maxPrototypeLevel)return null;
  return {coins:150*entry.level,materials:5*entry.level};
}
export function getTowerUpgradeCost(id){
  const state=read(),entry=state.towers[id];
  if(!entry||!entry.unlocked||entry.level>=META_RULES.maxPrototypeLevel)return null;
  return {coins:120*entry.level,materials:4*entry.level};
}
function canPay(wallet,cost){return wallet.coins>=cost.coins&&wallet.materials>=cost.materials;}
function pay(wallet,cost){wallet.coins-=cost.coins;wallet.materials-=cost.materials;}

export function upgradeHero(id){
  const state=read(),cost=getHeroUpgradeCost(id),entry=state.heroes[id];
  if(!cost||!entry||!canPay(state.wallet,cost))return {ok:false,state,cost};
  pay(state.wallet,cost);entry.level+=1;return {ok:true,state:write(state),cost};
}
export function upgradeTowerCard(id){
  const state=read(),cost=getTowerUpgradeCost(id),entry=state.towers[id];
  if(!cost||!entry||!canPay(state.wallet,cost))return {ok:false,state,cost};
  pay(state.wallet,cost);entry.level+=1;return {ok:true,state:write(state),cost};
}

export function getHeroStats(id){
  const state=read(),bp=HERO_BLUEPRINTS[id],entry=state.heroes[id];
  if(!bp||!entry)return null;
  const n=entry.level-1;
  return {
    hp:Math.round(bp.baseStats.hp*(1+n*.08)),
    attack:Math.round(bp.baseStats.attack*(1+n*.07)),
    defense:+(bp.baseStats.defense*(1+n*.05)).toFixed(1),
    attackSpeed:+(bp.baseStats.attackSpeed*(1+n*.015)).toFixed(2),
    critChance:+(bp.baseStats.critChance+n*.25).toFixed(1),
    critDamage:+(bp.baseStats.critDamage+n*1.5).toFixed(1)
  };
}
export function getTowerCardStats(id){
  const state=read(),bp=TOWER_BLUEPRINTS[id],entry=state.towers[id];
  if(!bp||!entry)return null;
  const n=entry.level-1;
  return {
    damage:Math.round(bp.baseStats.damage*(1+n*.08)),
    range:+(bp.baseStats.range+n*.04).toFixed(2),
    cooldown:+Math.max(.35,bp.baseStats.cooldown*(1-n*.018)).toFixed(2)
  };
}

export function getPowerScore(){
  const state=read();
  let score=0;
  for(const id of state.heroSquad.filter(Boolean)){
    const entry=state.heroes[id];if(entry?.unlocked)score+=100+entry.level*35+entry.rank*25;
  }
  for(const id of state.towerDeck.filter(Boolean)){
    const entry=state.towers[id];if(entry?.unlocked)score+=70+entry.level*25;
  }
  return score;
}

export function equipHero(id,slot){
  const state=read(),index=Number(slot);
  if(!state.heroes[id]?.unlocked||!Number.isInteger(index)||index<0||index>=META_RULES.heroSquadSize)return state;
  const previousIndex=state.heroSquad.indexOf(id);
  const displaced=state.heroSquad[index]||null;
  if(previousIndex===index)return state;
  if(previousIndex>=0)state.heroSquad[previousIndex]=displaced;
  state.heroSquad[index]=id;
  return write(state);
}
export function equipTower(id,slot){
  const state=read(),index=Number(slot);
  if(!state.towers[id]?.unlocked||!Number.isInteger(index)||index<0||index>=META_RULES.towerDeckSize)return state;
  const previousIndex=state.towerDeck.indexOf(id);
  const displaced=state.towerDeck[index]||null;
  if(previousIndex===index)return state;
  if(previousIndex>=0)state.towerDeck[previousIndex]=displaced;
  state.towerDeck[index]=id;
  return write(state);
}

function emptyReward(){return {coins:0,gems:0,materials:0,firstClear:false,perfectBonus:false};}
export function previewStageReward(stageId,stars=1){
  const stage=Math.max(1,Math.floor(Number(stageId)||1));
  const rating=Math.max(0,Math.min(3,Math.floor(Number(stars)||0)));
  if(rating<1)return emptyReward();

  const state=read(),claim=state.rewardClaims[stage]||{firstClear:false,perfectBonus:false};
  const reward=emptyReward();

  if(!claim.firstClear){
    reward.coins=STAGE_REWARD_RULES.firstClearCoinsBase+stage*STAGE_REWARD_RULES.firstClearCoinsPerStage;
    reward.materials=STAGE_REWARD_RULES.firstClearMaterialsBase+Math.ceil(stage/2);
    reward.firstClear=true;
  }else{
    reward.coins=STAGE_REWARD_RULES.replayCoinsBase+stage*STAGE_REWARD_RULES.replayCoinsPerStage;
    reward.materials=stage>=5?2:1;
  }

  if(rating===3&&!claim.perfectBonus){
    reward.coins+=STAGE_REWARD_RULES.perfectBonusCoinsBase+stage*STAGE_REWARD_RULES.perfectBonusCoinsPerStage;
    reward.materials+=STAGE_REWARD_RULES.perfectBonusMaterials;
    reward.gems+=STAGE_REWARD_RULES.perfectBonusGems;
    reward.perfectBonus=true;
  }
  return reward;
}

export function grantStageReward(stageId,stars=1){
  const stage=Math.max(1,Math.floor(Number(stageId)||1));
  const rating=Math.max(0,Math.min(3,Math.floor(Number(stars)||0)));
  if(rating<1)return {ok:false,reward:emptyReward(),state:read()};

  const state=read(),claim=state.rewardClaims[stage]||{firstClear:false,perfectBonus:false};
  const reward=previewStageReward(stage,rating);

  state.wallet.coins+=reward.coins;
  state.wallet.materials+=reward.materials;
  state.wallet.gems+=reward.gems;
  state.rewardClaims[stage]={
    firstClear:claim.firstClear||reward.firstClear,
    perfectBonus:claim.perfectBonus||reward.perfectBonus
  };

  return {ok:true,reward,state:write(state)};
}

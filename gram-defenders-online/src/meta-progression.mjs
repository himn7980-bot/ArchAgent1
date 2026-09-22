const STORAGE_KEY="gram_defenders_meta_v1";

export const HERO_BLUEPRINTS=Object.freeze({
  VOLYA:Object.freeze({
    id:"VOLYA",name:"VOLYA",role:"Guardian / Tank",unlocked:true,
    baseStats:Object.freeze({hp:500,attack:48,defense:10,attackSpeed:1.0,critChance:5,critDamage:150})
  }),
  GRAMCAT:Object.freeze({
    id:"GRAMCAT",name:"Gramcat",role:"Ranged DPS",unlocked:false,
    baseStats:Object.freeze({hp:320,attack:62,defense:5,attackSpeed:1.25,critChance:8,critDamage:160})
  }),
  VIRUS:Object.freeze({
    id:"VIRUS",name:"virus",role:"Support / Debuff",unlocked:false,
    baseStats:Object.freeze({hp:360,attack:34,defense:7,attackSpeed:1.05,critChance:5,critDamage:150})
  })
});

export const TOWER_BLUEPRINTS=Object.freeze({
  PULSE:Object.freeze({id:"PULSE",name:"Pulse Tower",role:"Fast single target",unlocked:true,baseStats:Object.freeze({damage:15,range:4.6,cooldown:.78})}),
  ENERGY:Object.freeze({id:"ENERGY",name:"Energy Tower",role:"Special / Energy",unlocked:false,baseStats:Object.freeze({damage:26,range:4.8,cooldown:1.05})}),
  BOMB:Object.freeze({id:"BOMB",name:"Bomb Tower",role:"Slow high AoE",unlocked:false,baseStats:Object.freeze({damage:58,range:4.9,cooldown:1.65})}),
  CONTROL:Object.freeze({id:"CONTROL",name:"Control Tower",role:"Slow / Crowd control",unlocked:false,baseStats:Object.freeze({damage:10,range:5.0,cooldown:1.0})})
});

export const META_RULES=Object.freeze({
  heroSquadSize:3,
  towerDeckSize:4,
  maxPrototypeLevel:10,
  currencies:Object.freeze(["coins","gems","materials"])
});

function defaultState(){
  return {
    wallet:{coins:1500,gems:50,materials:30},
    heroSquad:["VOLYA",null,null],
    towerDeck:["PULSE",null,null,null],
    heroes:{
      VOLYA:{unlocked:true,level:1,rank:1},
      GRAMCAT:{unlocked:false,level:1,rank:1},
      VIRUS:{unlocked:false,level:1,rank:1}
    },
    towers:{
      PULSE:{unlocked:true,level:1},
      ENERGY:{unlocked:false,level:1},
      BOMB:{unlocked:false,level:1},
      CONTROL:{unlocked:false,level:1}
    }
  };
}

function clampLevel(value){
  return Math.max(1,Math.min(META_RULES.maxPrototypeLevel,Math.floor(Number(value)||1)));
}
function normalize(raw){
  const base=defaultState(),value=raw||{};
  const wallet={
    coins:Math.max(0,Math.floor(Number(value.wallet?.coins??base.wallet.coins))),
    gems:Math.max(0,Math.floor(Number(value.wallet?.gems??base.wallet.gems))),
    materials:Math.max(0,Math.floor(Number(value.wallet?.materials??base.wallet.materials)))
  };
  const heroes={};
  for(const id of Object.keys(HERO_BLUEPRINTS)){
    heroes[id]={
      unlocked:Boolean(value.heroes?.[id]?.unlocked??base.heroes[id].unlocked),
      level:clampLevel(value.heroes?.[id]?.level??1),
      rank:Math.max(1,Math.floor(Number(value.heroes?.[id]?.rank??1)))
    };
  }
  const towers={};
  for(const id of Object.keys(TOWER_BLUEPRINTS)){
    towers[id]={
      unlocked:Boolean(value.towers?.[id]?.unlocked??base.towers[id].unlocked),
      level:clampLevel(value.towers?.[id]?.level??1)
    };
  }
  const heroSquad=Array.from({length:META_RULES.heroSquadSize},(_,i)=>{
    const id=value.heroSquad?.[i];
    return heroes[id]?.unlocked?id:(i===0?"VOLYA":null);
  });
  const towerDeck=Array.from({length:META_RULES.towerDeckSize},(_,i)=>{
    const id=value.towerDeck?.[i];
    return towers[id]?.unlocked?id:(i===0?"PULSE":null);
  });
  return {wallet,heroSquad,towerDeck,heroes,towers};
}
function read(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    return normalize(raw?JSON.parse(raw):null);
  }catch{return defaultState();}
}
function write(state){
  const value=normalize(state);
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));}catch{}
  return value;
}

export function getMetaState(){return read();}
export function resetMeta(){const state=defaultState();try{localStorage.removeItem(STORAGE_KEY);}catch{}return write(state);}

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
  state.heroSquad=state.heroSquad.map(x=>x===id?null:x);
  state.heroSquad[index]=id;
  return write(state);
}
export function equipTower(id,slot){
  const state=read(),index=Number(slot);
  if(!state.towers[id]?.unlocked||!Number.isInteger(index)||index<0||index>=META_RULES.towerDeckSize)return state;
  state.towerDeck=state.towerDeck.map(x=>x===id?null:x);
  state.towerDeck[index]=id;
  return write(state);
}

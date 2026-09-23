import { HERO_BLUEPRINTS, TOWER_BLUEPRINTS, getHeroStats, getMetaState, getTowerCardStats } from "./meta-progression.mjs";

const BASE_HERO_ATTACK=48;
const BASE_HERO_COOLDOWN=.72;
const BASE_SKILL_DAMAGE=100;
const BASE_TOWER=Object.freeze({damage:15,range:4.6,cooldown:.78});

const HERO_COMBAT=Object.freeze({
  VOLYA:Object.freeze({
    combat:"melee",attackRange:1.18,moveSpeed:4.2,guardRadius:3.6,
    skillName:"GRAM Pulse",skillMode:"aoe",skillRange:2.6,skillCooldown:10,
    skillMultiplier:BASE_SKILL_DAMAGE/BASE_HERO_ATTACK,skillTargets:99
  }),
  GRAMCAT:Object.freeze({
    combat:"ranged",attackRange:5.8,moveSpeed:4.8,guardRadius:6.5,
    skillName:"Triple Claw",skillMode:"multi",skillRange:6.2,skillCooldown:8,
    skillMultiplier:1.35,skillTargets:3
  }),
  VIRUS:Object.freeze({
    combat:"ranged",attackRange:5.2,moveSpeed:4.4,guardRadius:5.8,
    skillName:"Viral Field",skillMode:"aoe",skillRange:4.0,skillCooldown:11,
    skillMultiplier:.8,skillTargets:99
  })
});

function firstEquipped(state,listKey,collectionKey,fallback){
  const list=state[listKey]||[];
  for(const id of list){
    if(id&&state[collectionKey]?.[id]?.unlocked)return id;
  }
  return fallback;
}

function heroProfile(id){
  const stats=getHeroStats(id)||getHeroStats("VOLYA");
  const combat=HERO_COMBAT[id]||HERO_COMBAT.VOLYA;
  return {
    id,
    name:HERO_BLUEPRINTS[id]?.name||id,
    role:HERO_BLUEPRINTS[id]?.role||"",
    ...stats,
    ...combat,
    cooldown:+(BASE_HERO_COOLDOWN/Math.max(.1,stats.attackSpeed)).toFixed(4),
    skillDamage:Math.max(1,Math.round(stats.attack*combat.skillMultiplier))
  };
}

function towerProfile(id){
  const stats=getTowerCardStats(id)||getTowerCardStats("PULSE");
  const bp=TOWER_BLUEPRINTS[id]||TOWER_BLUEPRINTS.PULSE;
  return {id,name:bp.name,role:bp.role,...stats};
}

export function createBattleMeta(){
  const state=getMetaState();
  const heroId=firstEquipped(state,"heroSquad","heroes","VOLYA");
  const towerDeck=(state.towerDeck||[]).filter(id=>id&&state.towers[id]?.unlocked);
  if(!towerDeck.length)towerDeck.push("PULSE");

  const towerCards={};
  for(const id of towerDeck)towerCards[id]=towerProfile(id);

  return {
    heroId,
    heroSquad:[...(state.heroSquad||[])],
    hero:heroProfile(heroId),
    towerDeck,
    towerCards,
    towerId:towerDeck[0],
    tower:towerCards[towerDeck[0]]
  };
}

export function applyHeroDefense(game,rawDamage){
  const defense=Math.max(0,Number(game?.battleMeta?.hero?.defense)||0);
  const mitigated=Math.max(0,Number(rawDamage)||0)*(100/(100+defense));
  game.hero.health-=mitigated;
  game.hero.lastDamageTaken=mitigated;
  return mitigated;
}

export function getHeroAttackDamage(game){
  const hero=game?.battleMeta?.hero;
  if(!hero)return BASE_HERO_ATTACK;

  game.hero.critCharge=(Number(game.hero.critCharge)||0)+Math.max(0,Number(hero.critChance)||0);
  let crit=false;
  if(game.hero.critCharge>=100){
    game.hero.critCharge-=100;
    crit=true;
  }

  const damage=hero.attack*(crit?(hero.critDamage/100):1);
  game.hero.lastAttackCrit=crit;
  return damage;
}

export function getEffectiveTowerStats(game,battleLevel=1,baseBattleStats=BASE_TOWER,cardId=null){
  const selected=cardId||game?.selectedTowerCardId||game?.battleMeta?.towerId||"PULSE";
  const meta=game?.battleMeta?.towerCards?.[selected]||game?.battleMeta?.tower||BASE_TOWER;
  const damageFactor=meta.damage/BASE_TOWER.damage;
  const rangeBonus=meta.range-BASE_TOWER.range;
  const cooldownFactor=meta.cooldown/BASE_TOWER.cooldown;

  return {
    cardId:selected,
    damage:+(baseBattleStats.damage*damageFactor).toFixed(3),
    range:+Math.max(.5,baseBattleStats.range+rangeBonus).toFixed(3),
    cooldown:+Math.max(.2,baseBattleStats.cooldown*cooldownFactor).toFixed(4),
    battleLevel,
    metaLevelDamage:meta.damage
  };
}

export function getTowerSpecial(cardId){
  if(cardId==="ENERGY"){
    return Object.freeze({armorPierce:.5,shieldMultiplier:1.5});
  }
  return Object.freeze({armorPierce:0,shieldMultiplier:1});
}

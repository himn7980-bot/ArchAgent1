import { getHeroStats, getMetaState, getTowerCardStats } from "./meta-progression.mjs";

const BASE_HERO_ATTACK=48;
const BASE_HERO_COOLDOWN=.72;
const BASE_SKILL_DAMAGE=100;
const BASE_TOWER=Object.freeze({damage:15,range:4.6,cooldown:.78});

function firstEquipped(state,listKey,collectionKey,fallback){
  const list=state[listKey]||[];
  for(const id of list){
    if(id&&state[collectionKey]?.[id]?.unlocked)return id;
  }
  return fallback;
}

export function createBattleMeta(){
  const state=getMetaState();
  const heroId=firstEquipped(state,"heroSquad","heroes","VOLYA");
  const towerId=firstEquipped(state,"towerDeck","towers","PULSE");
  const heroStats=getHeroStats(heroId)||getHeroStats("VOLYA");
  const towerStats=getTowerCardStats(towerId)||getTowerCardStats("PULSE");

  return {
    heroId,
    towerId,
    hero:{
      ...heroStats,
      cooldown:+(BASE_HERO_COOLDOWN/Math.max(.1,heroStats.attackSpeed)).toFixed(4),
      skillDamage:Math.max(1,Math.round(BASE_SKILL_DAMAGE*(heroStats.attack/BASE_HERO_ATTACK)))
    },
    tower:{...towerStats}
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

export function getEffectiveTowerStats(game,battleLevel=1,baseBattleStats=BASE_TOWER){
  const meta=game?.battleMeta?.tower||BASE_TOWER;
  const damageFactor=meta.damage/BASE_TOWER.damage;
  const rangeBonus=meta.range-BASE_TOWER.range;
  const cooldownFactor=meta.cooldown/BASE_TOWER.cooldown;

  return {
    damage:+(baseBattleStats.damage*damageFactor).toFixed(3),
    range:+Math.max(.5,baseBattleStats.range+rangeBonus).toFixed(3),
    cooldown:+Math.max(.2,baseBattleStats.cooldown*cooldownFactor).toFixed(4),
    battleLevel,
    cardLevelDamage:meta.damage
  };
}

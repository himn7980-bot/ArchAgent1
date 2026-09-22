import { MAP, distance, samplePathWithOffset } from "./map.mjs";
import { STAGE_RATING, getStageStars } from "./stage-rating.mjs";
import { applyHeroDefense, createBattleMeta, getEffectiveTowerStats, getHeroAttackDamage } from "./battle-meta.mjs";

export const ENEMY_TYPES = Object.freeze({
  scout: Object.freeze({
    id: "scout", label: "Scout", combat: "melee",
    health: 85, speed: 0.026, damage: 9, attackCooldown: 1.1, interceptRange: 1.55
  }),
  archer: Object.freeze({
    id: "archer", label: "Archer", combat: "ranged",
    health: 105, speed: 0.021, damage: 11, attackCooldown: 1.35, attackRange: 5.0
  }),
  brute: Object.freeze({
    id: "brute", label: "Brute", combat: "melee",
    health: 185, speed: 0.017, damage: 20, attackCooldown: 1.25, interceptRange: 1.70
  })
});

const LANE_OFFSETS = Object.freeze([-0.95, -0.5, 0, 0.5, 0.95]);

function group(type, count, interval, gapAfter = 0) {
  return { type, count, interval, gapAfter };
}

export const WAVES = Object.freeze([
  Object.freeze([
    group("scout", 3, 0.62, 2.7),
    group("archer", 4, 0.76, 2.3),
    group("brute", 5, 0.82, 0)
  ]),
  Object.freeze([
    group("scout", 4, 0.60, 2.5),
    group("archer", 5, 0.74, 2.1),
    group("brute", 6, 0.80, 0)
  ]),
  Object.freeze([
    group("scout", 5, 0.58, 2.3),
    group("archer", 6, 0.72, 1.9),
    group("brute", 7, 0.78, 0)
  ])
]);

export const CONFIG = Object.freeze({
  maxLeaks: STAGE_RATING.maxLeaks,
  coreHealth: 4,
  heroMaxHealth: 500,
  heroDamage: 48,
  heroRange: 1.18,
  heroCooldown: 0.72,
  heroMoveSpeed: 4.2,
  heroGuardRadius: 3.6,
  heroRespawnDelay: 15,
  heroSkillDamage: 100,
  heroSkillRadius: 2.6,
  heroSkillCooldown: 10,
  towerDamage: 15,
  towerRange: 4.6,
  towerCooldown: 0.78,
  maxTowers: 3
});

function buildSpawnQueue(waveGroups) {
  const queue = [];
  waveGroups.forEach((entry, groupIndex) => {
    for (let i = 0; i < entry.count; i += 1) {
      queue.push({
        type: entry.type,
        delay: i === 0 && groupIndex === 0 ? 0 : (i === 0 ? waveGroups[groupIndex - 1].gapAfter : entry.interval)
      });
    }
  });
  return queue;
}

function clampBattlefieldPoint(point) {
  const margin = 0.8;
  return {
    x: Math.max(-MAP.width / 2 + margin, Math.min(MAP.width / 2 - margin, point.x)),
    z: Math.max(-MAP.depth / 2 + margin, Math.min(MAP.depth / 2 - margin, point.z))
  };
}

export function createGame() {
  const start = { x: -7.2, z: 3.8 };
  const battleMeta = createBattleMeta();
  return {
    status: "ready",
    battleMeta,
    leaks: 0, stars: null, wave: 0,
    enemies: [],
    spawnQueue: [],
    spawnTimer: 0,
    nextEnemyId: 1,
    hero: {
      position: { ...start },
      anchor: { ...start },
      manualDestination: null,
      targetId: null,
      state: "guard",
      health: battleMeta.hero.hp,
      maxHealth: battleMeta.hero.hp,
      critCharge: 0,
      lastAttackCrit: false,
      lastDamageTaken: 0,
      cooldown: 0,
      skillCooldown: 0,
      downTimer: 0
    },
    towers: []
  };
}

export function buildTower(game, slotId) {
  if (game.status === "won" || game.status === "lost") return false;
  if (!MAP.towerSlots.some((slot) => slot.id === slotId)) return false;
  if (game.towers.some((tower) => tower.slotId === slotId)) return false;
  if (game.towers.length >= CONFIG.maxTowers) return false;
  game.towers.push({ slotId, cooldown: 0 });
  return true;
}

export function removeTower(game, slotId) {
  if (game.status === "won" || game.status === "lost") return false;
  const index = game.towers.findIndex((tower) => tower.slotId === slotId);
  if (index === -1) return false;
  game.towers.splice(index, 1);
  return true;
}

export function startWave(game) {
  if (game.status === "won" || game.status === "lost" || game.spawnQueue.length || game.enemies.length) return false;
  if (game.wave >= WAVES.length) return false;
  game.spawnQueue = buildSpawnQueue(WAVES[game.wave]);
  game.wave += 1;
  game.spawnTimer = 0;
  game.status = "playing";
  return true;
}

export function moveHero(game, point) {
  if (game.status === "won" || game.status === "lost" || game.hero.downTimer > 0) return false;
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z)) return false;
  const destination = clampBattlefieldPoint(point);
  game.hero.anchor = { ...destination };
  game.hero.manualDestination = { ...destination };
  game.hero.targetId = null;
  game.hero.state = "relocating";
  return true;
}

export function useHeroSkill(game) {
  if (game.status !== "playing" || game.hero.state === "relocating" || game.hero.downTimer > 0 || game.hero.skillCooldown > 0) return false;
  const targets = game.enemies.filter((enemy) => distance(enemy.position, game.hero.position) <= CONFIG.heroSkillRadius);
  if (!targets.length) return false;
  for (const target of targets) target.health -= game.battleMeta.hero.skillDamage;
  game.hero.skillCooldown = CONFIG.heroSkillCooldown;
  return true;
}

function spawnEnemy(game, typeId) {
  const type = ENEMY_TYPES[typeId];
  const id = game.nextEnemyId++;
  const laneOffset = LANE_OFFSETS[(id - 1) % LANE_OFFSETS.length];
  game.enemies.push({
    id,
    type: typeId,
    health: type.health,
    maxHealth: type.health,
    progress: 0,
    laneOffset,
    position: samplePathWithOffset(0, laneOffset),
    attackCooldown: 0,
    engaged: false,
    engagement: null
  });
}

function nearestTarget(enemies, origin, range) {
  return enemies.filter((enemy) => distance(enemy.position, origin) <= range)
    .sort((a, b) => b.progress - a.progress)[0];
}

function attackEnemy(attacker, enemies, origin, range, damage, cooldown, dt) {
  attacker.cooldown = Math.max(0, attacker.cooldown - dt);
  if (attacker.cooldown > 0) return null;
  const target = nearestTarget(enemies, origin, range);
  if (!target) return null;
  target.health -= damage;
  attacker.cooldown = cooldown;
  return target;
}

function moveToward(position, target, speed, dt) {
  const dx = target.x - position.x;
  const dz = target.z - position.z;
  const remaining = Math.hypot(dx, dz);
  if (remaining < 0.03) {
    position.x = target.x;
    position.z = target.z;
    return true;
  }
  const travel = Math.min(remaining, speed * dt);
  position.x += dx / remaining * travel;
  position.z += dz / remaining * travel;
  return travel >= remaining - 1e-6;
}

function findHeroTarget(game) {
  return game.enemies
    .filter((enemy) => enemy.health > 0 && distance(enemy.position, game.hero.anchor) <= CONFIG.heroGuardRadius)
    .sort((a, b) => b.progress - a.progress)[0] || null;
}

function updateHeroAI(game, dt) {
  const hero = game.hero;
  if (hero.downTimer > 0) return;

  if (hero.manualDestination) {
    const arrived = moveToward(hero.position, hero.manualDestination, CONFIG.heroMoveSpeed, dt);
    hero.state = "relocating";
    hero.targetId = null;
    if (arrived) {
      hero.manualDestination = null;
      hero.state = "guard";
    }
    return;
  }

  let target = game.enemies.find((enemy) => enemy.id === hero.targetId && enemy.health > 0) || null;
  if (target && distance(target.position, hero.anchor) > CONFIG.heroGuardRadius + 0.25) {
    target = null;
    hero.targetId = null;
  }

  if (!target) {
    target = findHeroTarget(game);
    hero.targetId = target?.id ?? null;
  }

  if (target) {
    if (distance(hero.position, target.position) > CONFIG.heroRange) {
      moveToward(hero.position, target.position, CONFIG.heroMoveSpeed, dt);
      hero.state = "chasing";
    } else {
      hero.state = "fighting";
    }
    return;
  }

  if (distance(hero.position, hero.anchor) > 0.06) {
    moveToward(hero.position, hero.anchor, CONFIG.heroMoveSpeed, dt);
    hero.state = "returning";
  } else {
    hero.position = { ...hero.anchor };
    hero.state = "guard";
  }
}

function updateRespawn(game, dt) {
  if (game.hero.downTimer <= 0) return;
  game.hero.downTimer = Math.max(0, game.hero.downTimer - dt);
  if (game.hero.downTimer === 0) {
    game.hero.health = game.hero.maxHealth;
    game.hero.position = { ...game.hero.anchor };
    game.hero.manualDestination = null;
    game.hero.targetId = null;
    game.hero.state = "guard";
  }
}

function moveEnemyAlongLane(enemy, type, dt) {
  enemy.progress += type.speed * dt;
  enemy.position = samplePathWithOffset(enemy.progress, enemy.laneOffset);
}

export function updateGame(game, dt) {
  const step = Math.max(0, Math.min(dt, 0.1));
  if (game.status === "won" || game.status === "lost") return game;

  if (game.status !== "playing") {
    if (game.hero.downTimer <= 0) updateHeroAI(game, step);
    return game;
  }

  game.hero.skillCooldown = Math.max(0, game.hero.skillCooldown - step);
  updateRespawn(game, step);

  game.spawnTimer -= step;
  if (game.spawnQueue.length && game.spawnTimer <= 0) {
    const next = game.spawnQueue.shift();
    spawnEnemy(game, next.type);
    game.spawnTimer = game.spawnQueue.length ? game.spawnQueue[0].delay : 0;
  }

  const heroActive = game.hero.downTimer <= 0 && game.hero.health > 0;
  if (heroActive) updateHeroAI(game, step);

  for (const enemy of game.enemies) {
    const type = ENEMY_TYPES[enemy.type];
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - step);
    enemy.engaged = false;
    enemy.engagement = null;

    if (type.combat === "ranged") {
      const canShootHero = heroActive && distance(enemy.position, game.hero.position) <= type.attackRange;
      if (canShootHero) {
        enemy.engaged = true;
        enemy.engagement = "ranged";
        if (enemy.attackCooldown <= 0) {
          applyHeroDefense(game, type.damage);
          enemy.attackCooldown = type.attackCooldown;
        }
      } else {
        moveEnemyAlongLane(enemy, type, step);
      }
      continue;
    }

    const isLockedTarget = heroActive && game.hero.targetId === enemy.id && game.hero.state !== "relocating";
    const inMelee = isLockedTarget && distance(enemy.position, game.hero.position) <= type.interceptRange;
    if (inMelee) {
      enemy.engaged = true;
      enemy.engagement = "melee";
      if (enemy.attackCooldown <= 0) {
        applyHeroDefense(game, type.damage);
        enemy.attackCooldown = type.attackCooldown;
      }
    } else {
      moveEnemyAlongLane(enemy, type, step);
    }
  }

  if (heroActive && game.hero.targetId && game.hero.state !== "relocating") {
    const target = game.enemies.find((enemy) => enemy.id === game.hero.targetId && enemy.health > 0);
    game.hero.cooldown = Math.max(0, game.hero.cooldown - step);
    if (target && distance(target.position, game.hero.position) <= CONFIG.heroRange && game.hero.cooldown <= 0) {
      target.health -= getHeroAttackDamage(game);
      game.hero.cooldown = game.battleMeta.hero.cooldown;
    }
  } else {
    game.hero.cooldown = Math.max(0, game.hero.cooldown - step);
  }

  for (const tower of game.towers) {
    const towerPosition = MAP.towerSlots.find((slot) => slot.id === tower.slotId);
    const stats = getEffectiveTowerStats(game, 1, { damage: CONFIG.towerDamage, range: CONFIG.towerRange, cooldown: CONFIG.towerCooldown });
    attackEnemy(tower, game.enemies, towerPosition, stats.range, stats.damage, stats.cooldown, step);
  }

  const deadTarget = game.hero.targetId && game.enemies.some((enemy) => enemy.id === game.hero.targetId && enemy.health <= 0);
  game.enemies = game.enemies.filter((enemy) => {
    if (enemy.health <= 0) return false;
    if (enemy.progress >= 1) {
      game.leaks += 1;
      return false;
    }
    return true;
  });
  if (deadTarget || (game.hero.targetId && !game.enemies.some((enemy) => enemy.id === game.hero.targetId))) {
    game.hero.targetId = null;
    if (game.hero.state === "fighting" || game.hero.state === "chasing") game.hero.state = "returning";
  }

  if (game.hero.health <= 0 && game.hero.downTimer <= 0) {
    game.hero.health = 0;
    game.hero.manualDestination = null;
    game.hero.targetId = null;
    game.hero.state = "down";
    game.hero.downTimer = CONFIG.heroRespawnDelay;
  }

  if(game.leaks>=CONFIG.maxLeaks){game.status="lost";game.stars=0;}
  else if (!game.spawnQueue.length && !game.enemies.length) {
    game.status = game.wave === WAVES.length ? "won" : "between";
    if (game.status === "won") game.stars = getStageStars(game.leaks);
  }
  return game;
}

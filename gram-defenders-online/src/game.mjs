import { MAP, distance, samplePath } from "./map.mjs";

export const ENEMY_TYPES = Object.freeze({
  scout: Object.freeze({ id: "scout", label: "Scout", health: 85, speed: 0.026, damage: 9, attackCooldown: 1.1, engageRange: 1.05 }),
  raider: Object.freeze({ id: "raider", label: "Raider", health: 125, speed: 0.022, damage: 13, attackCooldown: 1.0, engageRange: 1.08 }),
  brute: Object.freeze({ id: "brute", label: "Brute", health: 185, speed: 0.017, damage: 20, attackCooldown: 1.25, engageRange: 1.12 })
});

function group(type, count, interval, gapAfter = 0) {
  return { type, count, interval, gapAfter };
}

export const WAVES = Object.freeze([
  Object.freeze([
    group("scout", 3, 0.62, 2.7),
    group("raider", 4, 0.72, 2.3),
    group("brute", 5, 0.82, 0)
  ]),
  Object.freeze([
    group("scout", 4, 0.60, 2.5),
    group("raider", 5, 0.70, 2.1),
    group("brute", 6, 0.80, 0)
  ]),
  Object.freeze([
    group("scout", 5, 0.58, 2.3),
    group("raider", 6, 0.68, 1.9),
    group("brute", 7, 0.78, 0)
  ])
]);

export const CONFIG = Object.freeze({
  coreHealth: 4,
  heroMaxHealth: 500,
  heroDamage: 48,
  heroRange: 1.18,
  heroCooldown: 0.72,
  heroMoveSpeed: 4.2,
  heroRespawnDelay: 6,
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

export function createGame() {
  return {
    status: "ready",
    coreHealth: CONFIG.coreHealth,
    wave: 0,
    enemies: [],
    spawnQueue: [],
    spawnTimer: 0,
    nextEnemyId: 1,
    hero: {
      position: { x: -7.2, z: 3.8 },
      destination: null,
      health: CONFIG.heroMaxHealth,
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
  const margin = 0.8;
  game.hero.destination = {
    x: Math.max(-MAP.width / 2 + margin, Math.min(MAP.width / 2 - margin, point.x)),
    z: Math.max(-MAP.depth / 2 + margin, Math.min(MAP.depth / 2 - margin, point.z))
  };
  return true;
}

export function useHeroSkill(game) {
  if (game.status !== "playing" || game.hero.destination || game.hero.downTimer > 0 || game.hero.skillCooldown > 0) return false;
  const targets = game.enemies.filter((enemy) => distance(enemy.position, game.hero.position) <= CONFIG.heroSkillRadius);
  if (!targets.length) return false;
  for (const target of targets) target.health -= CONFIG.heroSkillDamage;
  game.hero.skillCooldown = CONFIG.heroSkillCooldown;
  return true;
}

function spawnEnemy(game, typeId) {
  const type = ENEMY_TYPES[typeId];
  game.enemies.push({
    id: game.nextEnemyId++,
    type: typeId,
    health: type.health,
    maxHealth: type.health,
    progress: 0,
    position: samplePath(0),
    attackCooldown: 0,
    engaged: false
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

function updateHeroMovement(hero, dt) {
  if (!hero.destination || hero.downTimer > 0) return;
  const dx = hero.destination.x - hero.position.x;
  const dz = hero.destination.z - hero.position.z;
  const remaining = Math.hypot(dx, dz);
  if (remaining < 0.03) {
    hero.position = { ...hero.destination };
    hero.destination = null;
    return;
  }
  const travel = Math.min(remaining, CONFIG.heroMoveSpeed * dt);
  hero.position.x += dx / remaining * travel;
  hero.position.z += dz / remaining * travel;
}

function updateRespawn(game, dt) {
  if (game.hero.downTimer <= 0) return;
  game.hero.downTimer = Math.max(0, game.hero.downTimer - dt);
  if (game.hero.downTimer === 0) {
    game.hero.health = CONFIG.heroMaxHealth;
    game.hero.position = { x: -7.2, z: 3.8 };
    game.hero.destination = null;
  }
}

export function updateGame(game, dt) {
  const step = Math.max(0, Math.min(dt, 0.1));
  if (game.status === "won" || game.status === "lost") return game;
  updateHeroMovement(game.hero, step);
  if (game.status !== "playing") return game;

  game.hero.skillCooldown = Math.max(0, game.hero.skillCooldown - step);
  updateRespawn(game, step);

  game.spawnTimer -= step;
  if (game.spawnQueue.length && game.spawnTimer <= 0) {
    const next = game.spawnQueue.shift();
    spawnEnemy(game, next.type);
    game.spawnTimer = game.spawnQueue.length ? game.spawnQueue[0].delay : 0;
  }

  const heroActive = game.hero.downTimer <= 0 && game.hero.health > 0;
  for (const enemy of game.enemies) {
    const type = ENEMY_TYPES[enemy.type];
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - step);
    const closeToHero = heroActive && distance(enemy.position, game.hero.position) <= type.engageRange;
    enemy.engaged = closeToHero;

    if (closeToHero) {
      if (enemy.attackCooldown <= 0) {
        game.hero.health -= type.damage;
        enemy.attackCooldown = type.attackCooldown;
      }
    } else {
      enemy.progress += type.speed * step;
      enemy.position = samplePath(enemy.progress);
    }
  }

  if (heroActive && !game.hero.destination) {
    attackEnemy(game.hero, game.enemies, game.hero.position, CONFIG.heroRange, CONFIG.heroDamage, CONFIG.heroCooldown, step);
  } else {
    game.hero.cooldown = Math.max(0, game.hero.cooldown - step);
  }

  for (const tower of game.towers) {
    const towerPosition = MAP.towerSlots.find((slot) => slot.id === tower.slotId);
    attackEnemy(tower, game.enemies, towerPosition, CONFIG.towerRange, CONFIG.towerDamage, CONFIG.towerCooldown, step);
  }

  game.enemies = game.enemies.filter((enemy) => {
    if (enemy.health <= 0) return false;
    if (enemy.progress >= 1) {
      game.coreHealth -= 1;
      return false;
    }
    return true;
  });

  if (game.hero.health <= 0 && game.hero.downTimer <= 0) {
    game.hero.health = 0;
    game.hero.destination = null;
    game.hero.downTimer = CONFIG.heroRespawnDelay;
  }

  if (game.coreHealth <= 0) game.status = "lost";
  else if (!game.spawnQueue.length && !game.enemies.length) {
    game.status = game.wave === WAVES.length ? "won" : "between";
  }
  return game;
}

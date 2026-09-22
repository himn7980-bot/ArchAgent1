import { MAP, distance, samplePath } from "./map.mjs";

export const CONFIG = Object.freeze({
  coreHealth: 4,
  heroDamage: 32,
  heroRange: 4.2,
  heroCooldown: 0.6,
  heroMoveDuration: 0.7,
  heroSkillDamage: 100,
  heroSkillRadius: 3.5,
  heroSkillCooldown: 10,
  towerDamage: 15,
  towerRange: 4.6,
  towerCooldown: 0.78,
  enemyHealth: 125,
  enemySpeed: 0.052,
  spawnInterval: 0.68,
  waveCounts: [6, 9, 12],
  maxTowers: 3
});

export function createGame() {
  return {
    status: "ready",
    coreHealth: CONFIG.coreHealth,
    wave: 0,
    enemies: [],
    pending: 0,
    spawnTimer: 0,
    nextEnemyId: 1,
    hero: { nodeId: "H1", position: { ...MAP.heroNodes[0] }, from: null, to: null, moveElapsed: 0, cooldown: 0, skillCooldown: 0 },
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
  if (game.status === "won" || game.status === "lost" || game.pending || game.enemies.length) return false;
  if (game.wave >= CONFIG.waveCounts.length) return false;
  game.pending = CONFIG.waveCounts[game.wave];
  game.wave += 1;
  game.spawnTimer = 0;
  game.status = "playing";
  return true;
}

export function moveHero(game, nodeId) {
  if (game.status === "won" || game.status === "lost") return false;
  const target = MAP.heroNodes.find((node) => node.id === nodeId);
  if (!target || game.hero.to?.id === nodeId || (!game.hero.to && game.hero.nodeId === nodeId)) return false;
  game.hero.from = { ...game.hero.position };
  game.hero.to = target;
  game.hero.moveElapsed = 0;
  return true;
}

export function useHeroSkill(game) {
  if (game.status !== "playing" || game.hero.to || game.hero.skillCooldown > 0) return false;
  const targets = game.enemies.filter((enemy) => distance(enemy.position, game.hero.position) <= CONFIG.heroSkillRadius);
  if (!targets.length) return false;
  for (const target of targets) target.health -= CONFIG.heroSkillDamage;
  game.hero.skillCooldown = CONFIG.heroSkillCooldown;
  return true;
}

function spawnEnemy(game) {
  game.enemies.push({ id: game.nextEnemyId++, health: CONFIG.enemyHealth, progress: 0, position: samplePath(0) });
  game.pending -= 1;
  game.spawnTimer = CONFIG.spawnInterval;
}

function nearestTarget(enemies, origin, range) {
  return enemies.filter((enemy) => distance(enemy.position, origin) <= range)
    .sort((a, b) => b.progress - a.progress)[0];
}

function attack(game, attacker, origin, range, damage, dt) {
  attacker.cooldown = Math.max(0, attacker.cooldown - dt);
  if (attacker.cooldown > 0) return;
  const target = nearestTarget(game.enemies, origin, range);
  if (target) {
    target.health -= damage;
    attacker.cooldown = attacker === game.hero ? CONFIG.heroCooldown : CONFIG.towerCooldown;
  }
}

export function updateGame(game, dt) {
  if (game.status !== "playing") return game;
  const step = Math.max(0, Math.min(dt, 0.1));
  game.hero.skillCooldown = Math.max(0, game.hero.skillCooldown - step);

  if (game.hero.to) {
    game.hero.moveElapsed += step;
    const t = Math.min(1, game.hero.moveElapsed / CONFIG.heroMoveDuration);
    game.hero.position = {
      x: game.hero.from.x + (game.hero.to.x - game.hero.from.x) * t,
      z: game.hero.from.z + (game.hero.to.z - game.hero.from.z) * t
    };
    game.hero.cooldown = Math.max(0, game.hero.cooldown - step);
    if (t === 1) {
      game.hero.nodeId = game.hero.to.id;
      game.hero.position = { ...game.hero.to };
      game.hero.from = null;
      game.hero.to = null;
    }
  }

  game.spawnTimer -= step;
  if (game.pending > 0 && game.spawnTimer <= 0) spawnEnemy(game);

  for (const enemy of game.enemies) {
    enemy.progress += CONFIG.enemySpeed * step;
    enemy.position = samplePath(enemy.progress);
  }

  if (!game.hero.to) attack(game, game.hero, game.hero.position, CONFIG.heroRange, CONFIG.heroDamage, step);
  for (const tower of game.towers) {
    const towerPosition = MAP.towerSlots.find((slot) => slot.id === tower.slotId);
    attack(game, tower, towerPosition, CONFIG.towerRange, CONFIG.towerDamage, step);
  }

  game.enemies = game.enemies.filter((enemy) => {
    if (enemy.health <= 0) return false;
    if (enemy.progress >= 1) {
      game.coreHealth -= 1;
      return false;
    }
    return true;
  });

  if (game.coreHealth <= 0) game.status = "lost";
  else if (!game.pending && !game.enemies.length) {
    game.status = game.wave === CONFIG.waveCounts.length ? "won" : "between";
  }
  return game;
}

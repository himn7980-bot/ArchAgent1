import { MAP, PATH, distance } from "./map.mjs";
import { buildTower, CONFIG, createGame, ENEMY_TYPES, moveHero, removeTower, startWave, updateGame, useHeroSkill, WAVES } from "./game.mjs";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const waveLabel = document.querySelector("#wave");
const coreLabel = document.querySelector("#core");
const heroLabel = document.querySelector("#hero-hp");
const message = document.querySelector("#message");
const startButton = document.querySelector("#start");
const skillButton = document.querySelector("#hero-skill");
const towerCard = document.querySelector("#tower-card");
const removeButton = document.querySelector("#remove-tower");
const buildStatus = document.querySelector("#build-status");
let game = createGame();
let last = performance.now();
let towerMode = "build";
let selectedSlotId = null;
let pulseFxUntil = 0;

const iso = ({ x, z }) => ({ x: canvas.width / 2 + (x - z) * 27, y: 334 + (x + z) * 13.5 });
const unIso = (px, py) => {
  const u = (px - canvas.width / 2) / 27;
  const v = (py - 334) / 13.5;
  return { x: (u + v) / 2, z: (v - u) / 2 };
};

function pathStroke(points, color, width, smooth = false) {
  const projected = points.map(iso);
  ctx.beginPath(); ctx.moveTo(projected[0].x, projected[0].y);
  if (smooth) {
    for (let i = 1; i < projected.length - 1; i += 1) {
      const mid = { x: (projected[i].x + projected[i + 1].x) / 2, y: (projected[i].y + projected[i + 1].y) / 2 };
      ctx.quadraticCurveTo(projected[i].x, projected[i].y, mid.x, mid.y);
    }
    ctx.lineTo(projected.at(-1).x, projected.at(-1).y);
  } else projected.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
}

function polygon(points, fill, stroke, width = 2) {
  ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke();
}

function terrain() {
  const corners = [{ x: -15, z: -9 }, { x: 15, z: -9 }, { x: 15, z: 9 }, { x: -15, z: 9 }].map(iso);
  polygon(corners.map((p) => ({ x: p.x, y: p.y + 24 })), "#06111d", "#102c42");
  polygon(corners, "#102638", "#35627f", 3);
  ctx.save(); ctx.globalAlpha = 0.18;
  for (let x = -15; x <= 15; x += 3) pathStroke([{ x, z: -9 }, { x, z: 9 }], "#79b4d3", 1);
  for (let z = -9; z <= 9; z += 3) pathStroke([{ x: -15, z }, { x: 15, z }], "#79b4d3", 1);
  ctx.restore();
}

function marker(point, label, color, radius = 15) {
  const p = iso(point); ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = "#dffaff"; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = "#04101b";
  ctx.font = "800 12px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, p.x, p.y); ctx.restore();
}

function drawTowerRange(slot) {
  const p = iso(slot); ctx.save();
  ctx.beginPath(); ctx.ellipse(p.x, p.y, CONFIG.towerRange * 38, CONFIG.towerRange * 19, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#ffb23f18"; ctx.fill(); ctx.strokeStyle = "#ffc45caa"; ctx.lineWidth = 2; ctx.setLineDash([9, 7]); ctx.stroke(); ctx.restore();
}

function drawTower(slot) {
  const p = iso(slot);
  const built = game.towers.some((tower) => tower.slotId === slot.id);
  if (!built) return marker(slot, slot.id, selectedSlotId === slot.id ? "#9a6a25" : "#6f5830", 14);
  ctx.save(); ctx.shadowColor = "#ffb23f"; ctx.shadowBlur = 18;
  polygon([{ x: p.x - 20, y: p.y + 11 }, { x: p.x, y: p.y + 22 }, { x: p.x + 20, y: p.y + 11 }, { x: p.x, y: p.y }], "#a65d16", "#ffd388");
  ctx.fillStyle = "#ffb23f"; ctx.fillRect(p.x - 9, p.y - 27, 18, 34); ctx.beginPath(); ctx.arc(p.x, p.y - 29, 13, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = "#112131"; ctx.font = "900 11px system-ui"; ctx.textAlign = "center"; ctx.fillText(slot.id, p.x, p.y + 14); ctx.restore();
}

function beam(origin, target, color) {
  const a = iso(origin); const b = iso(target); ctx.save(); ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 14;
  ctx.globalAlpha = 0.78; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(a.x, a.y - 18); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
}

function drawPulse(now) {
  if (now >= pulseFxUntil) return;
  const p = iso(game.hero.position);
  const progress = 1 - (pulseFxUntil - now) / 450;
  const radius = 28 + progress * 110;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 0.8 - progress * 0.8);
  ctx.strokeStyle = "#63efff";
  ctx.shadowColor = "#2ddcff";
  ctx.shadowBlur = 28;
  ctx.lineWidth = 7 - progress * 4;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, radius, radius * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function render(now) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createRadialGradient(600, 330, 30, 600, 330, 650);
  gradient.addColorStop(0, "#163653"); gradient.addColorStop(1, "#07131f"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
  terrain();
  pathStroke(PATH, "#20384d", 104, true); pathStroke(PATH, "#587993", 88, true); pathStroke(PATH, "#88a8bd", 4, true);
  marker(MAP.spawn, "SP", "#ff5d78", 20); marker(MAP.core, "G", "#8f6dff", 27);
  const selectedSlot = MAP.towerSlots.find((slot) => slot.id === selectedSlotId);
  if (selectedSlot && game.towers.some((tower) => tower.slotId === selectedSlotId)) drawTowerRange(selectedSlot);
  MAP.towerSlots.forEach(drawTower);
  for (const enemy of game.enemies) {
    const p = iso(enemy.position);
    const type = ENEMY_TYPES[enemy.type];
    const enemyColor = enemy.type === "scout" ? "#ffcf5a" : enemy.type === "raider" ? "#ff6b7f" : "#b88cff";
    ctx.save(); ctx.shadowColor = enemyColor; ctx.shadowBlur = enemy.engaged ? 20 : 10;
    ctx.beginPath(); ctx.arc(p.x, p.y, enemy.type === "brute" ? 15 : 12, 0, Math.PI * 2); ctx.fillStyle = enemyColor; ctx.fill();
    if (enemy.engaged) { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = "#07111e"; ctx.fillRect(p.x - 18, p.y - 25, 36, 5);
    ctx.fillStyle = "#6dff9a"; ctx.fillRect(p.x - 18, p.y - 25, 36 * Math.max(0, enemy.health / enemy.maxHealth), 5);
    ctx.fillStyle = "#dceeff"; ctx.font = "700 9px system-ui"; ctx.textAlign = "center"; ctx.fillText(type.label, p.x, p.y + 25);
  }
  for (const tower of game.towers) {
    const towerSlot = MAP.towerSlots.find((slot) => slot.id === tower.slotId);
    const towerTarget = game.enemies.filter((e) => distance(e.position, towerSlot) <= CONFIG.towerRange).sort((a, b) => b.progress - a.progress)[0];
    if (towerTarget && tower.cooldown > CONFIG.towerCooldown * 0.72) beam(towerSlot, towerTarget.position, "#ffc45c");
  }
  const heroTarget = game.enemies.filter((e) => distance(e.position, game.hero.position) <= CONFIG.heroRange).sort((a, b) => b.progress - a.progress)[0];
  const hp = iso(game.hero.position); ctx.save(); ctx.shadowColor = game.hero.downTimer > 0 ? "#ff6b7f" : "#44e9ff"; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.arc(hp.x, hp.y - 11, 19, 0, Math.PI * 2); ctx.fillStyle = game.hero.downTimer > 0 ? "#5f2634" : "#e8f7ff"; ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = game.hero.downTimer > 0 ? "#3d1821" : "#135bd6"; ctx.fillRect(hp.x - 15, hp.y - 9, 30, 34); ctx.fillStyle = "#fff"; ctx.font = "900 11px system-ui"; ctx.textAlign = "center"; ctx.fillText("V", hp.x, hp.y + 11);
  ctx.fillStyle = "#07111e"; ctx.fillRect(hp.x - 23, hp.y - 42, 46, 6); ctx.fillStyle = "#58f29b"; ctx.fillRect(hp.x - 23, hp.y - 42, 46 * Math.max(0, game.hero.health / CONFIG.heroMaxHealth), 6); ctx.restore();
  if (!game.hero.destination && heroTarget && game.hero.cooldown > CONFIG.heroCooldown * 0.58) {
    const target = iso(heroTarget.position); ctx.save(); ctx.strokeStyle = "#dffaff"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(hp.x + 5, hp.y - 14); ctx.lineTo((hp.x + target.x) / 2, (hp.y + target.y) / 2 - 8); ctx.stroke(); ctx.restore();
  }
  drawPulse(now);
}

function updateUi() {
  waveLabel.textContent = `Wave ${game.wave} / ${WAVES.length}`;
  coreLabel.textContent = `Core ${"◆".repeat(Math.max(0, game.coreHealth))}${"◇".repeat(Math.max(0, CONFIG.coreHealth - game.coreHealth))}`;
  heroLabel.textContent = game.hero.downTimer > 0 ? `VOLYA respawn ${game.hero.downTimer.toFixed(1)}s` : `VOLYA ${Math.ceil(game.hero.health)} / ${CONFIG.heroMaxHealth}`;
  const clear = !game.spawnQueue.length && !game.enemies.length; startButton.disabled = !clear || game.status === "won" || game.status === "lost";
  startButton.textContent = game.wave >= WAVES.length ? "All Waves Deployed" : `Start Wave ${game.wave + 1}`;
  const cooldown = game.hero.skillCooldown;
  skillButton.disabled = game.status !== "playing" || Boolean(game.hero.destination) || game.hero.downTimer > 0 || cooldown > 0;
  skillButton.textContent = cooldown > 0 ? `GRAM Pulse · ${cooldown.toFixed(1)}s` : "GRAM Pulse";
  message.textContent = game.status === "won" ? "VICTORY — Map 01 secured." : game.status === "lost" ? "DEFEAT — GRAM Core destroyed." : game.status === "between" ? "Wave cleared. Reposition VOLYA anywhere and continue." : game.status === "playing" ? "Place VOLYA in the lane to block and fight enemies." : "Tap anywhere on the battlefield to position VOLYA, then start Wave 1.";
}

function loop(now) { const dt = (now - last) / 1000; last = now; updateGame(game, dt); render(now); updateUi(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

function setTowerMode(mode) {
  towerMode = mode;
  towerCard.classList.toggle("selected", mode === "build");
  towerCard.setAttribute("aria-pressed", String(mode === "build"));
  removeButton.setAttribute("aria-pressed", String(mode === "remove"));
  buildStatus.textContent = mode === "build" ? `Build mode · ${game.towers.length}/${CONFIG.maxTowers} towers active` : "Remove mode · Tap a built tower";
}

canvas.addEventListener("pointerdown", (event) => {
  const rect = canvas.getBoundingClientRect(); const x = (event.clientX - rect.left) * canvas.width / rect.width; const y = (event.clientY - rect.top) * canvas.height / rect.height;
  let towerSlot = null; let towerDistance = 42;
  for (const slot of MAP.towerSlots) { const p = iso(slot); const d = Math.hypot(x - p.x, y - p.y); if (d < towerDistance) { towerSlot = slot; towerDistance = d; } }
  if (towerSlot) {
    selectedSlotId = towerSlot.id;
    if (towerMode === "remove") {
      const removed = removeTower(game, towerSlot.id);
      buildStatus.textContent = removed ? `${towerSlot.id} cleared · Select another tower` : `${towerSlot.id} is already empty`;
      if (removed) selectedSlotId = null;
    } else if (game.towers.some((tower) => tower.slotId === towerSlot.id)) {
      buildStatus.textContent = `${towerSlot.id} selected · Range displayed`;
    } else {
      const built = buildTower(game, towerSlot.id);
      buildStatus.textContent = built ? `${towerSlot.id} built · ${game.towers.length}/${CONFIG.maxTowers} towers active` : `Tower limit reached · Max ${CONFIG.maxTowers}`;
      if (!built) selectedSlotId = null;
    }
    return;
  }
  moveHero(game, unIso(x, y));
});
startButton.addEventListener("click", () => startWave(game));
skillButton.addEventListener("click", () => { if (useHeroSkill(game)) pulseFxUntil = performance.now() + 450; });
towerCard.addEventListener("click", () => setTowerMode("build"));
removeButton.addEventListener("click", () => setTowerMode("remove"));
document.querySelector("#restart").addEventListener("click", () => { game = createGame(); selectedSlotId = null; pulseFxUntil = 0; setTowerMode("build"); last = performance.now(); });

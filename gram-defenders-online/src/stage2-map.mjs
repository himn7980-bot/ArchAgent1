export const MAP = Object.freeze({
  id: "stage-02",
  name: "Stage 02",
  width: 30,
  depth: 18,
  laneWidth: 3.2,
  spawn: { x: -13, z: 6.5 },
  waypoints: [
    { x: -10.2, z: 4.4 },
    { x: -6.2, z: 4.8 },
    { x: -3.0, z: 1.4 },
    { x: 1.0, z: 2.2 },
    { x: 4.2, z: -1.4 },
    { x: 8.2, z: -0.8 },
    { x: 10.2, z: -4.3 }
  ],
  core: { x: 13, z: -6.4 },
  towerSlots: [
    { id: "T1", x: -11.5, z: 1.9 },
    { id: "T2", x: -6.4, z: 1.8 },
    { id: "T3", x: -0.5, z: -0.6 },
    { id: "T4", x: 5.2, z: 1.8 },
    { id: "T5", x: 10.4, z: -2.0 }
  ]
});

export const PATH = Object.freeze([MAP.spawn, ...MAP.waypoints, MAP.core]);

export function distance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

export function samplePath(progress) {
  const lengths = PATH.slice(1).map((point, i) => distance(PATH[i], point));
  const total = lengths.reduce((sum, value) => sum + value, 0);
  let remaining = Math.max(0, Math.min(1, progress)) * total;
  for (let i = 0; i < lengths.length; i += 1) {
    if (remaining <= lengths[i]) {
      const t = lengths[i] ? remaining / lengths[i] : 0;
      return {
        x: PATH[i].x + (PATH[i + 1].x - PATH[i].x) * t,
        z: PATH[i].z + (PATH[i + 1].z - PATH[i].z) * t
      };
    }
    remaining -= lengths[i];
  }
  return { ...MAP.core };
}

export function samplePathWithOffset(progress, lateralOffset = 0) {
  const p = Math.max(0, Math.min(1, progress));
  const center = samplePath(p);
  const epsilon = 0.0025;
  const before = samplePath(Math.max(0, p - epsilon));
  const after = samplePath(Math.min(1, p + epsilon));
  const tx = after.x - before.x;
  const tz = after.z - before.z;
  const length = Math.hypot(tx, tz) || 1;
  const nx = -tz / length;
  const nz = tx / length;
  const maxOffset = Math.max(0, MAP.laneWidth / 2 - 0.35);
  const offset = Math.max(-maxOffset, Math.min(maxOffset, lateralOffset));
  return { x: center.x + nx * offset, z: center.z + nz * offset };
}

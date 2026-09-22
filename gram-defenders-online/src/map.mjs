export const MAP = Object.freeze({
  width: 30,
  depth: 18,
  laneWidth: 3,
  spawn: { x: -13, z: 6 },
  waypoints: [
    { x: -9, z: 3 }, { x: -4, z: 2 }, { x: 0, z: 0 },
    { x: 5, z: -2 }, { x: 10, z: -2 }
  ],
  core: { x: 13, z: -6 },
  towerSlots: [
    { id: "T1", x: -11, z: 1 }, { id: "T2", x: -5, z: 5 },
    { id: "T3", x: 2, z: 2 }, { id: "T4", x: 7, z: 1 },
    { id: "T5", x: 12, z: -2 }
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

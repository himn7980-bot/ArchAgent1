export class WaveManager {
  constructor(waves, buildDelay=15, spawnInterval=.65, clearGrace=.3) {
    this.waves=Array.isArray(waves) ? waves : [];
    this.buildDelay=Math.max(0,buildDelay);
    this.spawnInterval=Math.max(.05,spawnInterval);
    this.clearGrace=Math.max(0,clearGrace);
    this.active=false;
    this.countdown=this.buildDelay;
    this.waveIndex=0;
    this.spawnIndex=0;
    this.spawnTimer=0;
    this.clearTimer=0;
    this.finished=this.waves.length===0;
  }
  get waveNumber(){ return this.waves.length ? Math.min(this.waves.length,this.waveIndex+1) : 0; }
  get timeUntilNextWave(){ return this.active ? 0 : Math.max(0,this.countdown); }
  sendEarly(scene){ if (!this.active && !this.finished) this.start(scene); }
  start(scene){
    if (this.active || this.finished || !this.waves[this.waveIndex]) return;
    this.active=true;
    this.spawnIndex=0;
    this.spawnTimer=.25;
    this.clearTimer=0;
    scene.onWaveStarted?.(this.waveNumber);
  }
  update(dt,scene){
    if (this.finished) return;
    dt=Math.min(.25,Math.max(0,Number(dt)||0));
    if (!this.active) {
      this.countdown -= dt;
      if (this.countdown <= 0) this.start(scene);
      return;
    }
    const wave=this.waves[this.waveIndex] || [];
    this.spawnTimer -= dt;
    while (this.spawnIndex < wave.length && this.spawnTimer <= 0) {
      scene.createCoinEnemy?.(wave[this.spawnIndex++]);
      this.spawnTimer += this.spawnInterval;
    }
    const livingEnemies=Array.isArray(scene.enemies) ? scene.enemies.some(e=>e && !e.dead) : false;
    if (this.spawnIndex >= wave.length && !livingEnemies) {
      this.clearTimer += dt;
      if (this.clearTimer < this.clearGrace) return;
      this.active=false;
      this.clearTimer=0;
      if (this.waveIndex >= this.waves.length-1) {
        this.finished=true;
        scene.showVictory?.();
        return;
      }
      this.waveIndex++;
      this.countdown=this.buildDelay;
      scene.onBuildPhase?.(this.waveNumber);
    } else {
      this.clearTimer=0;
    }
  }
}

export class WaveManager {
  constructor(waves, buildDelay=15) {
    this.waves=waves;
    this.buildDelay=buildDelay;
    this.active=false;
    this.countdown=buildDelay;
    this.waveIndex=0;
    this.spawnIndex=0;
    this.spawnTimer=0;
    this.finished=false;
  }
  get waveNumber(){ return Math.min(this.waves.length,this.waveIndex+1); }
  get timeUntilNextWave(){ return this.active ? 0 : Math.max(0,this.countdown); }
  sendEarly(scene){ if (!this.active && !this.finished) this.start(scene); }
  start(scene){
    if (this.active || this.finished) return;
    this.active=true;
    this.spawnIndex=0;
    this.spawnTimer=.25;
    scene.onWaveStarted?.(this.waveNumber);
  }
  update(dt,scene){
    if (this.finished) return;
    if (!this.active) {
      this.countdown -= dt;
      if (this.countdown <= 0) this.start(scene);
      return;
    }
    const wave=this.waves[this.waveIndex];
    this.spawnTimer -= dt;
    while (this.spawnIndex < wave.length && this.spawnTimer <= 0) {
      scene.createCoinEnemy(wave[this.spawnIndex++]);
      this.spawnTimer += .65;
    }
    if (this.spawnIndex >= wave.length && scene.enemies.filter(e=>!e.dead).length===0) {
      this.active=false;
      if (this.waveIndex >= this.waves.length-1) {
        this.finished=true;
        scene.showVictory();
        return;
      }
      this.waveIndex++;
      this.countdown=this.buildDelay;
      scene.onBuildPhase?.(this.waveNumber);
    }
  }
}

import assert from 'node:assert/strict';
import { PathRoute } from '../src/core/PathRoute.js';
import { WaveManager } from '../src/core/WaveManager.js';

const route = new PathRoute([{x:0,y:0},{x:100,y:0},{x:100,y:100}]);
assert.equal(Math.round(route.length), 200, 'route length');
assert.deepEqual(route.pointAt(0), {x:0,y:0});
assert.deepEqual(route.pointAt(1), {x:100,y:100});
const mid=route.pointAt(.5);
assert.ok(Math.abs(mid.x-100)<.001 && Math.abs(mid.y)<.001, 'route midpoint');

const events=[];
const scene={
  enemies:[],
  createCoinEnemy(type){ events.push(`spawn:${type}`); this.enemies.push({dead:false,type}); },
  onWaveStarted(n){ events.push(`start:${n}`); },
  onBuildPhase(n){ events.push(`build:${n}`); },
  showVictory(){ events.push('victory'); }
};
const wm=new WaveManager([['a','b'],['boss']],1,.1);
wm.update(1,scene);
assert.equal(wm.active,true,'wave starts after countdown');
for(let i=0;i<4;i++) wm.update(.1,scene);
assert.deepEqual(events.slice(0,3),['start:1','spawn:a','spawn:b']);
scene.enemies.forEach(e=>e.dead=true);
wm.update(.1,scene);
assert.ok(events.includes('build:2'),'build phase after clearing wave');
wm.sendEarly(scene);
for(let i=0;i<3;i++) wm.update(.1,scene);
assert.ok(events.includes('spawn:boss'),'second wave spawns');
scene.enemies.forEach(e=>e.dead=true);
wm.update(.1,scene);
assert.ok(events.includes('victory'),'victory after final clear');

const emptyScene={enemies:[],showVictory(){this.won=true;}};
const empty=new WaveManager([],1,.1);
empty.update(10,emptyScene);
assert.equal(empty.finished,true,'empty wave set is safely finished');

console.log('VOLYA smoke tests passed');

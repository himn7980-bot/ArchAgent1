import assert from 'node:assert/strict';
import { PathRoute } from '../src/core/PathRoute.js';
import { WaveManager } from '../src/core/WaveManager.js';

const route = new PathRoute([{x:0,y:0},{x:100,y:0},{x:100,y:100}]);
assert.equal(Math.round(route.totalLength), 200, 'route length');
assert.deepEqual(route.getPosition(0), {x:0,y:0});
assert.deepEqual(route.getPosition(1), {x:100,y:100});
const mid=route.getPosition(.5);
assert.ok(Math.abs(mid.x-100)<.001 && Math.abs(mid.y)<.001, 'route midpoint');
assert.ok(Number.isFinite(route.getAngle(.5)), 'route angle is finite');

const events=[];
const scene={
  enemies:[],
  createCoinEnemy(type){ events.push(`spawn:${type}`); this.enemies.push({dead:false,type}); },
  onWaveStarted(n){ events.push(`start:${n}`); },
  onBuildPhase(n){ events.push(`build:${n}`); },
  showVictory(){ events.push('victory'); }
};
const wm=new WaveManager([['a','b'],['boss']],1,.1,.1);
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

// A killed splitter can create children on a delayed callback. The manager must
// not declare the wave clear in the short empty gap before those children exist.
const splitEvents=[];
const splitScene={
  enemies:[],
  createCoinEnemy(type){ splitEvents.push(`spawn:${type}`); this.enemies.push({dead:false,type}); },
  onWaveStarted(){},
  onBuildPhase(){ splitEvents.push('build'); },
  showVictory(){ splitEvents.push('victory'); }
};
const splitWm=new WaveManager([['splitter']],0,.1,.3);
splitWm.sendEarly(splitScene);
splitWm.update(.25,splitScene);
assert.equal(splitScene.enemies.length,1,'splitter spawned');
splitScene.enemies[0].dead=true;
splitWm.update(.1,splitScene);
assert.equal(splitWm.finished,false,'clear grace prevents premature victory');
splitScene.enemies.push({dead:false,type:'child'});
splitWm.update(.1,splitScene);
assert.equal(splitWm.finished,false,'late child keeps wave active');
splitScene.enemies.at(-1).dead=true;
splitWm.update(.1,splitScene);
splitWm.update(.1,splitScene);
splitWm.update(.1,splitScene);
assert.equal(splitWm.finished,true,'victory occurs after child is actually cleared');

const emptyScene={enemies:[],showVictory(){this.won=true;}};
const empty=new WaveManager([],1,.1);
empty.update(10,emptyScene);
assert.equal(empty.finished,true,'empty wave set is safely finished');

console.log('VOLYA smoke tests passed');

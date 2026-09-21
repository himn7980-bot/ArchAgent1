import assert from 'node:assert/strict';
import { PathRoute } from '../src/core/PathRoute.js';
import { WaveManager } from '../src/core/WaveManager.js';
import { pickFrontTarget, pickNearestChainTarget } from '../src/core/Targeting.js';

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

// Target acquisition must prefer route progress, ignore dead/out-of-range enemies,
// and do so without filter/sort allocations in the hot combat loop.
const enemy=(x,y,pathProgress,dead=false)=>({container:{x,y},pathProgress,dead});
const e1=enemy(10,0,.2), e2=enemy(20,0,.8), e3=enemy(200,0,.95), e4=enemy(5,0,.99,true);
assert.equal(pickFrontTarget([e1,e2,e3,e4],0,0,50),e2,'front target chosen in range');
assert.equal(pickFrontTarget([e3,e4],0,0,50),null,'dead/out-of-range targets ignored');
const c1=enemy(30,0,.1), c2=enemy(15,0,.1), c3=enemy(8,0,.1);
assert.equal(pickNearestChainTarget([c1,c2,c3],e1,25,new Set([c3])),c2,'nearest unhit chain target chosen');
assert.equal(pickNearestChainTarget([c1],e1,5,new Set()),null,'chain range respected');

console.log('VOLYA smoke tests passed');

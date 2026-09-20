import { HEROES, TOWERS, MODS, POWERS, COINS, WAVES } from './data.js';
import { PathRoute } from './core/PathRoute.js';
import { WaveManager } from './core/WaveManager.js';

const W = 1600;
const H = 900;
const HUD_H = 62;
const DRAWER_OPEN_H = 196;
const DRAWER_CLOSED_H = 52;
const RIGHT_RAIL_W = 130;
const CORE_X = 1470;
const CORE_Y = 560;
const PATH = [
  {x:-40,y:220},{x:290,y:220},{x:290,y:520},{x:610,y:520},
  {x:610,y:180},{x:1000,y:180},{x:1000,y:560},{x:CORE_X,y:560}
];
const PAD_DATA = [
  [235,120,1],[245,380,1],[430,640,1],[690,390,1],
  [800,100,2],[860,660,3],[1180,370,4],[1320,670,5]
];
const HERO_DEPLOY_LIMITS = [3,3,4,4,5];
const HERO_FRAME = {
  volya:0, pengu:1, utya:2, teddy:3,
  yoda:4, egor:5, telegramdog:6, virus:7,
  babyshark:8, yaya:9, gramcat:10, memegram:11, noctis:12
};

function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
function dist(ax,ay,bx,by){ return Math.hypot(ax-bx,ay-by); }

class BattleScene extends Phaser.Scene {
  constructor(){ super('battle'); }

  preload(){
    this.load.spritesheet('heroSheet','./assets/heroes/hero-sheet.webp',{
      frameWidth:96,
      frameHeight:120
    });
  }

  create(){
    this.state = {
      wave:1, life:20, gold:360, energy:45, maxEnergy:100,
      running:false, betweenWaves:true, spawnIndex:0, spawnTimer:0,
      selected:null, selectedEntity:null, drawerOpen:true, tab:'towers',
      powerCd:Object.fromEntries(POWERS.map(p=>[p.id,0])), overdriveUntil:0,
      heroLimit:HERO_DEPLOY_LIMITS[0], gameSpeed:1
    };
    this.simTime=0;
    this.route=new PathRoute(PATH);
    this.waveManager=new WaveManager(WAVES,15);

    this.enemies=[];
    this.towers=[];
    this.heroes=[];
    this.shots=[];
    this.gravityZones=[];
    this.reinforceZones=[];
    this.createTextures();
    this.createWorld();
    this.createUI();
    this.updateHUD();
    this.showToast('Build phase — Wave 1 auto-starts in 15 seconds.');
  }

  createTextures(){
    const g=this.make.graphics({x:0,y:0,add:false});
    g.fillStyle(0x9cecff).fillTriangle(10,0,20,10,10,20).fillTriangle(10,0,0,10,10,20);
    g.generateTexture('crystal',20,20); g.clear();
    g.fillStyle(0xffffff).fillCircle(8,8,8); g.generateTexture('spark',16,16); g.destroy();
  }

  createWorld(){
    this.cameras.main.setBackgroundColor('#07101f');
    this.drawBackdrop();
    this.drawRoad();
    this.createGramCore();
    this.buildPads=PAD_DATA.map((p,i)=>this.createPad(i,p[0],p[1],p[2]));

    this.input.on('pointerdown',pointer=>{
      const worldX=pointer.worldX, worldY=pointer.worldY;
      if(worldY<HUD_H || worldY>this.gameAreaBottom()) return;
      if(worldX>W-RIGHT_RAIL_W) return;
      this.handleFieldTap(worldX,worldY);
    });
  }

  drawBackdrop(){
    const bg=this.add.graphics();
    bg.fillGradientStyle(0x0c1b35,0x071224,0x061020,0x08152b,1);
    bg.fillRect(0,HUD_H,W,H-HUD_H);
    bg.lineStyle(1,0x5f8cc5,0.06);
    for(let x=0;x<W;x+=32){ bg.lineBetween(x,HUD_H,x,H); }
    for(let y=HUD_H;y<H;y+=32){ bg.lineBetween(0,y,W,y); }
    for(let i=0;i<18;i++){
      const x=(i*97)%W, h=55+(i*31)%130;
      bg.fillStyle(0x0a1831,0.8).fillRect(x,H-DRAWER_CLOSED_H-h,50,h);
      bg.fillStyle(0x4fb5ff,0.14);
      for(let wy=H-DRAWER_CLOSED_H-h+12;wy<H-DRAWER_CLOSED_H-8;wy+=18) bg.fillRect(x+10,wy,4,7);
    }
  }

  drawRoad(){
    const road=this.add.graphics();
    const draw=(width,color,alpha=1)=>{
      road.lineStyle(width,color,alpha); road.beginPath(); road.moveTo(PATH[0].x,PATH[0].y);
      for(let i=1;i<PATH.length;i++) road.lineTo(PATH[i].x,PATH[i].y);
      road.strokePath();
    };
    draw(96,0x050b15,1); draw(74,0x617797,1); draw(52,0x455f82,1);
    road.lineStyle(3,0xbfe5ff,0.22);
    road.beginPath(); road.moveTo(PATH[0].x,PATH[0].y); for(let i=1;i<PATH.length;i++) road.lineTo(PATH[i].x,PATH[i].y); road.strokePath();
  }

  createGramCore(){
    this.core=this.add.container(CORE_X+55,CORE_Y);
    const aura=this.add.circle(0,0,68,0x7e65ff,0.12).setStrokeStyle(3,0xa892ff,0.55);
    this.tweens.add({targets:aura,scale:1.2,alpha:0.035,duration:1400,yoyo:true,repeat:-1});
    const crystal=this.add.polygon(0,0,[0,-50,35,-12,22,42,-22,42,-35,-12],0x8b76ff,0.98).setStrokeStyle(4,0xd4c9ff,1);
    const gram=this.add.text(0,1,'GRAM',{fontFamily:'Arial Black',fontSize:'19px',color:'#ffffff'}).setOrigin(.5);
    const label=this.add.text(0,73,'GRAM CORE',{fontFamily:'Arial',fontSize:'13px',fontStyle:'bold',color:'#d8d2ff'}).setOrigin(.5);

    const guardianRing=this.add.circle(-98,0,38,0xff546a,0.08).setStrokeStyle(2,0xff6578,0.55);
    const volya=this.add.sprite(-98,-2,'heroSheet',HERO_FRAME.volya).setDisplaySize(58,72);
    const volyaName=this.add.text(-98,44,'VOLYA',{fontFamily:'Arial Black',fontSize:'11px',color:'#ff8a97'}).setOrigin(.5);
    this.tweens.add({targets:volya,y:-7,duration:820,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    this.tweens.add({targets:guardianRing,scale:1.14,alpha:0.02,duration:1100,yoyo:true,repeat:-1});

    this.core.add([aura,crystal,gram,label,guardianRing,volya,volyaName]);
  }

  createPad(id,x,y,unlockWave){
    const c=this.add.container(x,y);
    const glow=this.add.circle(0,0,32,0x4c9cff,0.14);
    const ring=this.add.circle(0,0,28,0x102443,0.86).setStrokeStyle(3,0x76baff,0.8);
    const plus=this.add.text(0,0,'+',{fontFamily:'Arial Black',fontSize:'24px',color:'#bce9ff'}).setOrigin(.5);
    this.tweens.add({targets:glow,scale:1.18,alpha:0.05,duration:1000+id*80,yoyo:true,repeat:-1});
    c.add([glow,ring,plus]); c.setSize(64,64); c.setInteractive({useHandCursor:true});
    const pad={id,x,y,unlockWave,unlocked:unlockWave<=1,container:c,ring,plus,tower:null};
    c.on('pointerdown',pointer=>{ pointer.event.stopPropagation?.(); this.handlePadTap(pad); });
    this.refreshPad(pad);
    return pad;
  }

  refreshPad(pad){
    const visible=pad.unlocked || pad.tower;
    pad.container.setAlpha(visible?1:0.28);
    pad.plus.setText(pad.tower?'':(pad.unlocked?'+':'🔒'));
    pad.ring.setStrokeStyle(3,pad.unlocked?0x76baff:0x3b4e69,pad.unlocked?0.8:0.5);
  }

  gameAreaBottom(){ return H-(this.state.drawerOpen?DRAWER_OPEN_H:DRAWER_CLOSED_H); }

  handlePadTap(pad){
    if(this.state.selected?.kind==='tower'){
      if(!pad.unlocked) return this.showToast(`Pad unlocks at Wave ${pad.unlockWave}.`);
      if(pad.tower) return this.showToast('That pad already has a tower.');
      const def=TOWERS.find(t=>t.id===this.state.selected.id);
      if(this.state.gold<def.cost) return this.showToast('Not enough gold.');
      this.state.gold-=def.cost; this.createTower(pad,def); this.clearSelection(); this.updateHUD();
      return;
    }
    if(this.state.selected?.kind==='mod'){
      if(!pad.tower) return this.showToast('Choose a built tower.');
      const mod=MODS.find(m=>m.id===this.state.selected.id);
      if(pad.tower.mods.length >= (pad.tower.level>=3?2:1)) return this.showToast('Upgrade this tower to unlock more mod slots.');
      if(pad.tower.mods.includes(mod.id)) return this.showToast('That mod is already installed.');
      pad.tower.mods.push(mod.id); this.addTowerModVisual(pad.tower,mod); this.showToast(`${mod.name} installed.`); this.clearSelection(); this.selectEntity(pad.tower);
      return;
    }
    if(pad.tower) this.selectEntity(pad.tower);
  }

  handleFieldTap(x,y){
    if(this.state.selected?.kind==='hero'){
      if(this.heroes.length>=this.state.heroLimit) return this.showToast(`Hero slots full (${this.state.heroLimit}).`);
      if(this.isNearRoad(x,y,62)) return this.showToast('Deploy heroes off the road.');
      const def=HEROES.find(h=>h.id===this.state.selected.id);
      if(this.heroes.some(h=>h.def.id===def.id)) return this.showToast(`${def.name} is already deployed.`);
      this.createHero(x,y,def); this.clearSelection(); return;
    }
    if(this.state.selected?.kind==='moveHero'){
      if(this.isNearRoad(x,y,62)) return this.showToast('Move the hero off the road.');
      const hero=this.heroes.find(h=>h.uid===this.state.selected.uid);
      if(hero){ hero.anchor.set(x,y); this.showToast(`${hero.def.name} repositioned.`); }
      this.clearSelection(); return;
    }
    if(this.state.selected?.kind==='power'){ this.castPower(this.state.selected.id,x,y); return; }
    this.state.selectedEntity=null; this.refreshInspector();
  }

  isNearRoad(x,y,threshold){
    for(let i=0;i<PATH.length-1;i++){
      const a=PATH[i],b=PATH[i+1], dx=b.x-a.x,dy=b.y-a.y;
      const t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy),0,1);
      const px=a.x+t*dx,py=a.y+t*dy;
      if(dist(x,y,px,py)<threshold) return true;
    }
    return false;
  }

  createTower(pad,def){
    const body=this.add.container(pad.x,pad.y);
    const halo=this.add.circle(0,0,32,def.color,0.10);
    this.tweens.add({targets:halo,scale:1.16,alpha:0.025,duration:900,yoyo:true,repeat:-1});
    const shadow=this.add.ellipse(0,15,50,16,0x000000,0.30);
    const base=this.add.circle(0,8,25,0x0a111e,1);
    const shell=this.add.circle(0,0,21,0x182b4d,1).setStrokeStyle(3,def.color,1);
    const core=this.add.circle(0,0,10,0x29466f,1);

    const weapon=this.add.container(0,-2);
    let turret=null;
    if(def.id==='ranger'){
      turret=this.add.rectangle(10,0,42,6,def.color,1).setOrigin(.25,.5);
      const bow=this.add.arc(3,0,17,265,95,false,def.color,0).setStrokeStyle(3,def.color,1);
      weapon.add([bow,turret]);
    }else if(def.id==='arcane'){
      turret=this.add.circle(8,0,10,def.color,1);
      const orb2=this.add.circle(25,0,5,0xffffff,0.9);
      weapon.add([turret,orb2]);
      this.tweens.add({targets:orb2,y:{from:-6,to:6},duration:560,yoyo:true,repeat:-1});
    }else if(def.id==='bombard'){
      turret=this.add.rectangle(9,0,38,13,def.color,1).setOrigin(.25,.5);
      const muzzle=this.add.circle(28,0,8,0x20293b,1).setStrokeStyle(2,0xdde8ff,0.75);
      weapon.add([turret,muzzle]);
    }else if(def.id==='guardian'){
      turret=this.add.polygon(10,0,[0,-16,23,0,0,16,-8,0],def.color,0.95);
      weapon.add(turret);
    }else if(def.id==='frost'){
      turret=this.add.polygon(9,0,[0,-18,11,-2,5,17,-5,17,-11,-2],0xb8efff,0.95).setStrokeStyle(2,def.color,1);
      weapon.add(turret);
    }else if(def.id==='tesla'){
      turret=this.add.rectangle(8,0,32,5,def.color,0.85).setOrigin(.2,.5);
      const coilA=this.add.circle(4,-9,5,0xa9b7ff,1), coilB=this.add.circle(4,9,5,0xa9b7ff,1);
      weapon.add([turret,coilA,coilB]);
    }else if(def.id==='venom'){
      turret=this.add.circle(8,0,13,0x70ef78,0.92);
      const bubble=this.add.circle(20,-8,5,0xaaffaa,0.7);
      weapon.add([turret,bubble]);
      this.tweens.add({targets:bubble,y:{from:-11,to:-4},alpha:{from:.35,to:.9},duration:620,yoyo:true,repeat:-1});
    }else{
      turret=this.add.rectangle(0,-8,5,32,0xffdb75,1).setOrigin(.5,1);
      const dish=this.add.arc(0,-22,17,205,335,false,0xffdb75,0).setStrokeStyle(4,0xffdb75,1);
      weapon.add([turret,dish]);
      this.tweens.add({targets:dish,angle:{from:-10,to:10},duration:700,yoyo:true,repeat:-1});
    }

    const icon=this.add.text(0,34,def.icon,{fontSize:'16px'}).setOrigin(.5);
    body.add([halo,shadow,base,shell,core,weapon,icon]);
    body.setSize(68,78).setInteractive({useHandCursor:true});
    const tower={kind:'tower',uid:`t${Date.now()}${Math.random()}`,pad,def,body,weapon,turret,mods:[],level:1,nextShot:0,rangeBonus:0,damageBonus:0,rateMul:1,levelArt:[]};
    pad.tower=tower; this.towers.push(tower); this.refreshPad(pad);
    body.on('pointerdown',pointer=>{pointer.event.stopPropagation?.();this.selectEntity(tower);});
    this.selectEntity(tower); this.showToast(`${def.name} built.`);
  }

  towerStats(tower){
    const s={range:tower.def.range+tower.rangeBonus,damage:tower.def.damage+tower.damageBonus,rate:tower.def.rate*tower.rateMul,slow:tower.def.slow||0,poison:tower.def.poison||0,splash:tower.def.splash||0,chain:tower.def.chain||0,crit:0};
    for(const id of tower.mods){ const m=MODS.find(x=>x.id===id); if(!m) continue; if(m.range)s.range+=m.range;if(m.damage)s.damage+=m.damage;if(m.rateMul)s.rate*=m.rateMul;if(m.slow)s.slow+=m.slow;if(m.poison)s.poison+=m.poison;if(m.splash)s.splash+=m.splash;if(m.chain)s.chain+=m.chain;if(m.crit)s.crit+=m.crit; }
    const beacon=this.towers.find(t=>t!==tower && t.def.id==='beacon' && dist(t.pad.x,t.pad.y,tower.pad.x,tower.pad.y)<205);
    if(beacon){ s.range+=18; s.rate*=0.88; s.damage+=3; }
    if(this.simTime<this.state.overdriveUntil) s.rate*=0.7;
    s.rate=Math.max(180,s.rate); return s;
  }

  addTowerModVisual(tower,mod){
    const idx=tower.mods.length-1;
    const dot=this.add.circle(-13+idx*26,-29,9,0x08111e,1).setStrokeStyle(2,mod.color,1);
    const glyph=this.add.text(-13+idx*26,-29,mod.icon,{fontSize:'11px',color:'#fff'}).setOrigin(.5);
    tower.body.add([dot,glyph]);
    this.tweens.add({targets:[dot,glyph],scale:1.18,duration:180,yoyo:true});
  }

  upgradeTower(tower){
    const cost=70+30*tower.level;
    if(tower.level>=4) return this.showToast('Tower is already max level.');
    if(this.state.gold<cost) return this.showToast(`Need ${cost} gold.`);
    this.state.gold-=cost; tower.level++; tower.damageBonus+=7; tower.rangeBonus+=8; tower.rateMul*=0.93;
    tower.body.setScale(1+0.06*(tower.level-1));
    const ring=this.add.circle(0,0,24+4*tower.level,0x000000,0).setStrokeStyle(2,tower.def.color,0.38);
    tower.body.addAt(ring,2); tower.levelArt.push(ring);
    if(tower.level>=3){
      const finL=this.add.triangle(-18,6,0,12,8,0,16,12,tower.def.color,0.75);
      const finR=this.add.triangle(18,6,0,12,8,0,16,12,tower.def.color,0.75).setFlipX(true);
      tower.body.add([finL,finR]); tower.levelArt.push(finL,finR);
    }
    this.add.particles(tower.pad.x,tower.pad.y,'spark',{speed:{min:30,max:120},lifespan:380,quantity:12,scale:{start:.45,end:0},tint:tower.def.color});
    this.showToast(tower.level===3?'Level 3: second mod slot unlocked.':`Tower upgraded to Lv.${tower.level}.`);
    this.updateHUD(); this.refreshInspector();
  }

  sellTower(tower){
    const refund=Math.round((tower.def.cost+(tower.level-1)*85)*0.5);
    this.state.gold+=refund; tower.body.destroy(); tower.pad.tower=null; this.towers=this.towers.filter(t=>t!==tower); this.refreshPad(tower.pad); this.state.selectedEntity=null; this.refreshInspector(); this.updateHUD(); this.showToast(`Sold for ${refund} gold.`);
  }

  createHero(x,y,def){
    const uid=`h${Date.now()}${Math.random()}`;
    const c=this.add.container(x,y);
    const shadow=this.add.ellipse(0,26,48,15,0x000000,0.34);
    const aura=this.add.circle(0,0,32,def.color,0.08).setStrokeStyle(2,def.color,0.55);
    const portrait=this.add.sprite(0,-5,'heroSheet',HERO_FRAME[def.id]).setDisplaySize(50,63);
    const portraitFrame=this.add.rectangle(0,-5,54,67,0x000000,0).setStrokeStyle(3,def.color,0.9);
    const hpBg=this.add.rectangle(0,-43,48,5,0x03070d,0.9);
    const hpBar=this.add.rectangle(-24,-43,48,5,0x64eaa2,1).setOrigin(0,.5);
    const name=this.add.text(0,34,def.name,{fontFamily:'Arial',fontSize:'10px',fontStyle:'bold',color:'#dce7ff'}).setOrigin(.5);
    c.add([shadow,aura,portrait,portraitFrame,hpBg,hpBar,name]);
    c.setSize(66,84).setInteractive({useHandCursor:true});
    const hero={kind:'hero',uid,def,container:c,portrait,hpBar,anchor:new Phaser.Math.Vector2(x,y),nextShot:0,hp:100,maxHp:100,target:null};
    c.on('pointerdown',pointer=>{pointer.event.stopPropagation?.();this.selectEntity(hero);});
    this.tweens.add({targets:portrait,y:-10,duration:700+Math.random()*250,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    this.tweens.add({targets:aura,scale:1.16,alpha:0.025,duration:980,yoyo:true,repeat:-1});
    this.heroes.push(hero); this.selectEntity(hero); this.showToast(`${def.name} deployed.`); this.renderDeck();
  }

  recallHero(hero){
    hero.container.destroy(); this.heroes=this.heroes.filter(h=>h!==hero); this.state.selectedEntity=null; this.refreshInspector(); this.renderDeck(); this.showToast(`${hero.def.name} recalled.`);
  }

  createCoinEnemy(id){
    const d=COINS[id]; const c=this.add.container(PATH[0].x,PATH[0].y);
    const shadow=this.add.ellipse(0,25,48,15,0x000000,0.34);
    const legL=this.add.rectangle(-11,23,7,18,0x27364d,1).setOrigin(.5,0);
    const legR=this.add.rectangle(11,23,7,18,0x27364d,1).setOrigin(.5,0);
    const armL=this.add.rectangle(-28,2,13,6,0x334765,1).setAngle(-18);
    const armR=this.add.rectangle(28,2,13,6,0x334765,1).setAngle(18);
    const glow=this.add.circle(0,0,29,d.color,0.13);
    const coin=this.add.circle(0,0,23,d.color,1).setStrokeStyle(4,0xffffff,0.72);
    const inner=this.add.circle(0,0,17,0x0b1322,0.30);
    const logo=this.createCoinLogo(id,d);
    const role=this.add.text(0,31,d.role.toUpperCase(),{fontFamily:'Arial',fontSize:'8px',fontStyle:'bold',color:'#aebfe2'}).setOrigin(.5);
    const hpbg=this.add.rectangle(0,-36,50,6,0x03070d,0.92);
    const hp=this.add.rectangle(-25,-36,50,6,0x5cff91,1).setOrigin(0,.5);
    c.add([shadow,legL,legR,armL,armR,glow,coin,inner,logo,role,hpbg,hp]);

    let shieldSprite=null;
    if(d.shield){
      shieldSprite=this.add.circle(0,0,31,0x7f98ff,0.07).setStrokeStyle(3,0x9bb0ff,0.8);
      c.add(shieldSprite);
      this.tweens.add({targets:shieldSprite,scale:1.09,alpha:0.02,duration:520,yoyo:true,repeat:-1});
    }
    if(d.heal){
      const plus=this.add.text(27,-21,'+',{fontFamily:'Arial Black',fontSize:'18px',color:'#7dffb7'}).setOrigin(.5);
      c.add(plus); this.tweens.add({targets:plus,y:-28,alpha:.35,duration:620,yoyo:true,repeat:-1});
    }
    if(d.armor){
      const plate=this.add.arc(0,0,27,205,335,false,0x111827,0.9).setStrokeStyle(4,0xf9a43a,0.8);
      c.add(plate);
    }

    this.tweens.add({targets:coin,scale:1.06,duration:420,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    this.tweens.add({targets:legL,angle:{from:-12,to:12},duration:180,yoyo:true,repeat:-1});
    this.tweens.add({targets:legR,angle:{from:12,to:-12},duration:180,yoyo:true,repeat:-1});
    const enemy={id,d,container:c,coin,logo,hpBar:hp,shieldSprite,hp:d.hp,maxHp:d.hp,shield:d.shield||0,maxShield:d.shield||0,pathIndex:0,pathT:0,pathProgress:0,slowUntil:0,slowFactor:1,poisonUntil:0,poisonDps:0,lastHeal:0,dead:false};
    this.enemies.push(enemy); return enemy;
  }

  createCoinLogo(id,d){
    if(id==='eth'){
      return this.add.polygon(0,-1,[0,-18,10,0,0,7,-10,0],0xffffff,0.98).setStrokeStyle(1,0x9aa9ff,1);
    }
    if(id==='sol'){
      const logo=this.add.container(0,0);
      const a=this.add.rectangle(-2,-9,25,5,0x6cf0c2,1).setSkewX(-0.38);
      const b=this.add.rectangle(2,0,25,5,0x9c63ff,1).setSkewX(-0.38);
      const cc=this.add.rectangle(-2,9,25,5,0x54d8ff,1).setSkewX(-0.38);
      logo.add([a,b,cc]); return logo;
    }
    if(id==='bnb'){
      const logo=this.add.container(0,0);
      const diamond=(x,y,s)=>this.add.rectangle(x,y,s,s,0xffffff,1).setAngle(45);
      logo.add([diamond(0,-10,7),diamond(-10,0,7),diamond(10,0,7),diamond(0,10,7),diamond(0,0,6)]);
      return logo;
    }
    if(id==='ada'){
      const logo=this.add.container(0,0);
      for(let i=0;i<8;i++){const a=Math.PI*2*i/8;logo.add(this.add.circle(Math.cos(a)*12,Math.sin(a)*12,2.2,0xffffff,1));}
      logo.add(this.add.circle(0,0,3.2,0xffffff,1)); return logo;
    }
    if(id==='avax'){
      return this.add.triangle(0,1,0,18,11,-8,-11,-8,0xffffff,1);
    }
    if(id==='trx'){
      const g=this.add.graphics().lineStyle(3,0xffffff,1);
      g.beginPath(); g.moveTo(-13,-11); g.lineTo(14,-7); g.lineTo(-3,15); g.closePath(); g.strokePath();
      g.lineBetween(-13,-11,-3,15); g.lineBetween(14,-7,2,-2); return g;
    }
    if(id==='xrp'){
      const g=this.add.graphics().lineStyle(3,0xffffff,1);
      g.beginPath(); g.arc(0,-5,13,0.25,2.9,false); g.strokePath();
      g.beginPath(); g.arc(0,5,13,3.4,6.0,false); g.strokePath(); return g;
    }
    return this.add.text(0,-1,d.symbol,{fontFamily:'Arial Black',fontSize:'20px',color:'#fff'}).setOrigin(.5);
  }

  update(time,delta){
    if(!this.state) return;
    const simDelta=Math.min(50,delta)*(this.state.gameSpeed||1);
    this.simTime+=simDelta;
    this.tweens.timeScale=this.state.gameSpeed||1;
    this.state.energy=Math.min(this.state.maxEnergy,this.state.energy+simDelta*0.0022);
    for(const p of POWERS) this.state.powerCd[p.id]=Math.max(0,this.state.powerCd[p.id]-simDelta);
    this.updateEnemies(this.simTime,simDelta);
    this.updateTowers(this.simTime);
    this.updateHeroes(this.simTime,simDelta);
    this.updateZones(this.simTime,simDelta);
    this.updateWave(this.simTime,simDelta);
    this.updatePowerRail();
    this.updateHUD();
  }

  updateWave(time,delta){
    this.waveManager.update(delta/1000,this);
    this.state.running=this.waveManager.active;
    this.state.wave=this.waveManager.waveNumber;
    if(this.waveCountdownText){
      this.waveCountdownText.setText(this.waveManager.active?'WAVE ACTIVE':`NEXT ${this.waveManager.timeUntilNextWave.toFixed(1)}s`);
      this.waveCountdownText.setColor(!this.waveManager.active&&this.waveManager.timeUntilNextWave<5?'#ff7c8c':'#8fe8ff');
    }
    if(this.startWaveBtn) this.startWaveBtn.setVisible(!this.waveManager.active&&!this.waveManager.finished);
  }

  startWave(){
    this.waveManager.sendEarly(this);
  }

  onWaveStarted(wave){
    this.state.running=true;
    this.state.betweenWaves=false;
    this.state.wave=wave;
    this.startWaveBtn?.setVisible(false);
    this.showToast(`Wave ${wave} started.`);
  }

  onBuildPhase(wave){
    this.state.running=false;
    this.state.betweenWaves=true;
    this.state.wave=wave;
    this.state.heroLimit=HERO_DEPLOY_LIMITS[wave-1]||5;
    for(const p of this.buildPads){ if(!p.unlocked && p.unlockWave<=wave){p.unlocked=true;this.refreshPad(p);} }
    this.state.gold+=70;
    this.state.energy=Math.min(100,this.state.energy+20);
    this.startWaveBtn?.setText(`START WAVE ${wave}`).setVisible(true);
    this.showToast(`Build phase — Wave ${wave} auto-starts in 15 seconds.`);
    this.renderDeck();
  }

  updateEnemies(time,delta){
    for(const e of [...this.enemies]){
      if(e.dead) continue;
      if(e.poisonUntil>time){ this.damageEnemy(e,e.poisonDps*delta/1000,{ignoreArmor:true}); }
      if(e.d.heal && time-e.lastHeal>1800){ e.lastHeal=time; const nearby=this.enemies.filter(x=>!x.dead&&x!==e&&dist(x.container.x,x.container.y,e.container.x,e.container.y)<120); for(const n of nearby)n.hp=Math.min(n.maxHp,n.hp+12); }
      const slow=time<e.slowUntil?e.slowFactor:1;
      let speed=e.d.speed*slow;
      if(e.d.dash && Math.floor(time/1600)%3===0) speed*=1.7;
      this.advanceEnemy(e,speed*delta/1000);
      e.hpBar.width=50*clamp(e.hp/e.maxHp,0,1);
      if(e.hp<=0) this.killEnemy(e);
    }
  }

  advanceEnemy(e,distance){
    e.pathProgress=(e.pathProgress||0)+(distance/this.route.totalLength);
    if(e.pathProgress>=1){ this.enemyEscaped(e); return; }
    const pos=this.route.getPosition(e.pathProgress);
    e.container.setPosition(pos.x,pos.y);
    e.pathIndex=Math.floor(e.pathProgress*(PATH.length-1));
    e.pathT=e.pathProgress*(PATH.length-1)-e.pathIndex;
  }

  enemyEscaped(e){
    if(e.dead)return; e.dead=true; e.container.destroy(); this.state.life=Math.max(0,this.state.life-1); this.enemies=this.enemies.filter(x=>x!==e); this.updateHUD();
    this.cameras.main.shake(120,0.006); if(this.state.life<=0)this.showDefeat();
  }

  killEnemy(e){
    if(e.dead)return;
    const splitInfo=e.d.split?{pathProgress:e.pathProgress||0,x:e.container.x,y:e.container.y}:null;
    e.dead=true; this.state.gold+=e.d.reward; this.state.energy=Math.min(100,this.state.energy+4);
    this.tweens.add({targets:e.container,scale:0,angle:180,alpha:0,duration:180,onComplete:()=>e.container.destroy()});
    this.enemies=this.enemies.filter(x=>x!==e);
    if(splitInfo){
      this.time.delayedCall(120,()=>{
        for(let i=0;i<2;i++){
          const child=this.createCoinEnemy('xrp');
          child.hp*=0.58; child.maxHp=child.hp;
          child.pathProgress=clamp(splitInfo.pathProgress+(i?0.008:-0.006),0,0.98);
          const cp=this.route.getPosition(child.pathProgress);
          child.container.setPosition(cp.x+(i?10:-10),cp.y+(i?6:-6)).setScale(.78);
        }
        this.showToast('DOGE split into two XRP runners!');
      });
    }
    this.updateHUD();
  }

  damageEnemy(e,amount,opts={}){
    if(e.dead)return;
    if(e.shield>0){
      const used=Math.min(e.shield,amount); e.shield-=used; amount-=used;
      if(e.shieldSprite && e.shield<=0){ this.tweens.add({targets:e.shieldSprite,scale:1.6,alpha:0,duration:170,onComplete:()=>e.shieldSprite?.destroy()}); e.shieldSprite=null; }
    }
    if(amount<=0)return;
    if(!opts.ignoreArmor && e.d.armor) amount*=1-e.d.armor;
    e.hp-=amount;
    e.coin.setFillStyle(0xffffff); this.time.delayedCall(55,()=>{if(!e.dead)e.coin.setFillStyle(e.d.color);});
    if(opts.slow){e.slowUntil=this.simTime+1300;e.slowFactor=Math.max(0.35,1-opts.slow);}
    if(opts.poison){e.poisonUntil=this.simTime+2800;e.poisonDps=Math.max(e.poisonDps,opts.poison);}
  }

  updateTowers(time){
    for(const t of this.towers){
      if(t.def.support) continue;
      if(time<t.nextShot) continue;
      const s=this.towerStats(t); const target=this.pickTarget(t.pad.x,t.pad.y,s.range); if(!target)continue;
      t.nextShot=time+s.rate;
      if(t.weapon) t.weapon.rotation=Phaser.Math.Angle.Between(0,0,target.container.x-t.pad.x,target.container.y-t.pad.y);
      if(t.weapon) this.tweens.add({targets:t.weapon,scaleX:.82,duration:55,yoyo:true});
      if(t.def.id==='tesla'){ this.chainLightning(t,target,s); }
      else this.fireProjectile(t.pad.x,t.pad.y,target,s,t.def.color,t.def.id==='bombard'?'bomb':'tower');
    }
  }

  updateHeroes(time,delta){
    for(const h of this.heroes){
      const d=h.def; let target=this.pickTarget(h.container.x,h.container.y,d.range);
      if(!target){ this.returnHeroToAnchor(h,delta); continue; }
      const td=dist(h.container.x,h.container.y,target.container.x,target.container.y);
      if(d.projectile==='melee'){
        if(td>50){ this.moveHeroToward(h,target.container.x,target.container.y,delta,true); }
        else if(time>=h.nextShot){
          h.nextShot=time+d.rate;
          this.tweens.add({targets:h.portrait,scaleX:1.14,scaleY:.9,duration:75,yoyo:true});
          this.damageEnemy(target,d.damage,{});
          this.slashFX(target.container.x,target.container.y,d.color);
        }
      } else {
        if(td>d.range*.9) this.moveHeroToward(h,target.container.x,target.container.y,delta,false);
        else if(td<d.range*.4) this.moveHeroToward(h,h.container.x-(target.container.x-h.container.x),h.container.y-(target.container.y-h.container.y),delta,false);
        if(time>=h.nextShot && td<=d.range){
          h.nextShot=time+d.rate;
          this.tweens.add({targets:h.portrait,scaleX:1.10,scaleY:.92,duration:70,yoyo:true});
          this.fireProjectile(h.container.x,h.container.y,target,{damage:d.damage,slow:d.id==='pengu'?0.25:0,poison:d.poison||0,splash:0,crit:d.crit||0},d.color,d.projectile);
        }
      }
    }
  }

  moveHeroToward(h,x,y,delta,allowRoad){
    const angle=Phaser.Math.Angle.Between(h.container.x,h.container.y,x,y); const nx=h.container.x+Math.cos(angle)*h.def.speed*delta/1000; const ny=h.container.y+Math.sin(angle)*h.def.speed*delta/1000;
    if(dist(nx,ny,h.anchor.x,h.anchor.y)>120)return;
    if(!allowRoad && this.isNearRoad(nx,ny,42))return;
    h.container.x=nx;h.container.y=ny;
  }

  returnHeroToAnchor(h,delta){
    const d=dist(h.container.x,h.container.y,h.anchor.x,h.anchor.y); if(d<4)return;
    const a=Phaser.Math.Angle.Between(h.container.x,h.container.y,h.anchor.x,h.anchor.y); h.container.x+=Math.cos(a)*h.def.speed*.6*delta/1000; h.container.y+=Math.sin(a)*h.def.speed*.6*delta/1000;
  }

  pickTarget(x,y,range){
    const list=this.enemies.filter(e=>!e.dead&&dist(x,y,e.container.x,e.container.y)<=range);
    list.sort((a,b)=>(b.pathProgress||0)-(a.pathProgress||0)); return list[0]||null;
  }

  fireProjectile(x,y,target,stats,color,style){
    const dot=this.add.circle(x,y,style==='bomb'?7:5,color,1);
    const shot={sprite:dot,target,stats,color,style,speed:style==='bomb'?300:520}; this.shots.push(shot);
    this.tweens.addCounter({from:0,to:1,duration:Math.max(100,dist(x,y,target.container.x,target.container.y)/shot.speed*1000),onUpdate:t=>{
      if(target.dead)return; dot.x=Phaser.Math.Linear(x,target.container.x,t.getValue()); dot.y=Phaser.Math.Linear(y,target.container.y,t.getValue());
    },onComplete:()=>{
      if(!target.dead){ const dmg=stats.crit&&Math.random()<stats.crit?stats.damage*1.8:stats.damage; this.damageEnemy(target,dmg,{slow:stats.slow,poison:stats.poison}); if(stats.splash)this.splashDamage(target.container.x,target.container.y,stats.splash,stats.damage*.65,target); }
      dot.destroy(); this.shots=this.shots.filter(s=>s!==shot);
    }});
  }

  splashDamage(x,y,r,damage,primary){
    const ring=this.add.circle(x,y,r,0xffa06c,0.08).setStrokeStyle(3,0xffa06c,0.65); this.tweens.add({targets:ring,scale:1.15,alpha:0,duration:220,onComplete:()=>ring.destroy()});
    for(const e of this.enemies) if(!e.dead&&e!==primary&&dist(x,y,e.container.x,e.container.y)<r)this.damageEnemy(e,damage,{});
  }

  chainLightning(tower,target,s){
    let current=target; let damage=s.damage; const hit=[target]; this.damageEnemy(target,damage,{slow:s.slow,poison:s.poison});
    this.lightningFX(tower.pad.x,tower.pad.y,target.container.x,target.container.y,tower.def.color);
    for(let i=0;i<s.chain;i++){
      const next=this.enemies.filter(e=>!e.dead&&!hit.includes(e)&&dist(e.container.x,e.container.y,current.container.x,current.container.y)<120).sort((a,b)=>dist(a.container.x,a.container.y,current.container.x,current.container.y)-dist(b.container.x,b.container.y,current.container.x,current.container.y))[0];
      if(!next)break; damage*=.72; this.damageEnemy(next,damage,{slow:s.slow,poison:s.poison}); this.lightningFX(current.container.x,current.container.y,next.container.x,next.container.y,tower.def.color); hit.push(next); current=next;
    }
  }

  lightningFX(x1,y1,x2,y2,color){ const g=this.add.graphics().lineStyle(4,color,1).lineBetween(x1,y1,x2,y2); this.tweens.add({targets:g,alpha:0,duration:130,onComplete:()=>g.destroy()}); }
  slashFX(x,y,color){ const arc=this.add.arc(x,y,25,210,330,false,color,0.9).setStrokeStyle(5,color,1); this.tweens.add({targets:arc,scale:1.4,alpha:0,duration:160,onComplete:()=>arc.destroy()}); }

  updateZones(time){
    for(const z of [...this.gravityZones]){
      if(time>z.until){z.sprite.destroy();this.gravityZones=this.gravityZones.filter(x=>x!==z);continue;}
      for(const e of this.enemies){ if(e.dead)continue;const d=dist(e.container.x,e.container.y,z.x,z.y);if(d<z.r){e.slowUntil=time+120;e.slowFactor=.45;} }
    }
    for(const z of [...this.reinforceZones]){
      if(time>z.until){z.sprite.destroy();this.reinforceZones=this.reinforceZones.filter(x=>x!==z);continue;}
      for(const e of this.enemies){if(!e.dead&&dist(e.container.x,e.container.y,z.x,z.y)<z.r){e.slowUntil=time+120;e.slowFactor=.18;}}
    }
  }

  castPower(id,x,y){
    const p=POWERS.find(q=>q.id===id); if(!p)return;
    if(this.state.powerCd[id]>0)return this.showToast('Power is cooling down.');
    if(this.state.energy<p.cost)return this.showToast('Not enough Core Energy.');
    this.state.energy-=p.cost; this.state.powerCd[id]=p.cooldown; this.clearSelection();
    if(id==='bombard'){
      const marker=this.add.circle(x,y,82,0xff875f,0.08).setStrokeStyle(3,0xff875f,.9);
      const reticle=this.add.text(x,y,'⊕',{fontFamily:'Arial Black',fontSize:'42px',color:'#ffbd8d'}).setOrigin(.5);
      this.tweens.add({targets:[marker,reticle],scale:.25,alpha:1,duration:400,onComplete:()=>{
        for(const e of this.enemies)if(!e.dead&&dist(x,y,e.container.x,e.container.y)<95)this.damageEnemy(e,72,{});
        const flash=this.add.circle(x,y,18,0xffd0a6,1); this.tweens.add({targets:flash,scale:6,alpha:0,duration:220,onComplete:()=>flash.destroy()});
        this.cameras.main.shake(160,.008); marker.destroy(); reticle.destroy();
      }});
    } else if(id==='laser'){
      const beam=this.add.rectangle(x,H/2,16,H,0xff4960,.85); for(const e of this.enemies)if(!e.dead&&Math.abs(e.container.x-x)<45)this.damageEnemy(e,110,{ignoreArmor:true}); this.tweens.add({targets:beam,alpha:0,width:44,duration:260,onComplete:()=>beam.destroy()});
    } else if(id==='gravity'){
      const s=this.add.circle(x,y,90,0x765cff,.10).setStrokeStyle(4,0x927dff,.65); this.tweens.add({targets:s,scale:.82,duration:500,yoyo:true,repeat:-1}); this.gravityZones.push({x,y,r:90,until:this.simTime+6000,sprite:s});
    } else if(id==='reinforce'){
      const s=this.add.circle(x,y,62,0x64e6a4,.10).setStrokeStyle(4,0x64e6a4,.7); const txt=this.add.text(x,y,'✚',{fontSize:'30px',color:'#9ff1c9'}).setOrigin(.5); const c=this.add.container(0,0,[s,txt]); this.reinforceZones.push({x,y,r:62,until:this.simTime+8000,sprite:c});
    } else if(id==='overdrive'){
      this.state.overdriveUntil=this.simTime+8000; this.cameras.main.flash(180,86,128,255,false);
    }
    this.updateHUD(); this.updatePowerRail();
  }

  createUI(){
    this.uiLayer=this.add.container(0,0).setDepth(1000);
    const top=this.add.rectangle(W/2,HUD_H/2,W,HUD_H,0x08111e,0.98).setStrokeStyle(1,0x263a61,1);
    this.stageText=this.add.text(18,15,'STAGE 1',{fontFamily:'Arial Black',fontSize:'18px',color:'#fff'});
    this.waveText=this.add.text(145,16,'WAVE 1 / 5',{fontFamily:'Arial',fontSize:'16px',fontStyle:'bold',color:'#bcd1f8'});
    this.lifeText=this.add.text(300,16,'❤ 20',{fontFamily:'Arial',fontSize:'17px',fontStyle:'bold',color:'#fff'});
    this.goldText=this.add.text(390,16,'◆ 360',{fontFamily:'Arial',fontSize:'17px',fontStyle:'bold',color:'#ffd277'});
    this.waveCountdownBox=this.add.rectangle(650,31,240,42,0x111b31,1).setStrokeStyle(2,0x355180,1);
    this.waveCountdownText=this.add.text(650,31,'NEXT 15.0s',{fontFamily:'Arial Black',fontSize:'14px',color:'#8fe8ff'}).setOrigin(.5);
    this.speedBtn=this.add.text(790,12,'×1',{fontFamily:'Arial Black',fontSize:'17px',color:'#fff',backgroundColor:'#152640',padding:{x:14,y:9}}).setInteractive({useHandCursor:true});
    this.speedBtn.on('pointerdown',()=>this.toggleGameSpeed());
    this.startWaveBtn=this.add.text(865,12,'START WAVE 1',{fontFamily:'Arial Black',fontSize:'13px',color:'#fff',backgroundColor:'#2458c8',padding:{x:13,y:10}}).setInteractive({useHandCursor:true});
    this.startWaveBtn.on('pointerdown',()=>this.startWave());
    this.energyTitle=this.add.text(1100,11,'CORE ENERGY',{fontFamily:'Arial Black',fontSize:'10px',color:'#8da4d0'});
    this.energyBg=this.add.rectangle(1305,35,330,10,0x10192a,1).setStrokeStyle(1,0x2f446e,1);
    this.energyFill=this.add.rectangle(1140,35,330,8,0x4aa8ff,1).setOrigin(0,.5);
    this.energyValue=this.add.text(1460,12,'45/100',{fontFamily:'Arial',fontSize:'11px',color:'#9bb0d7'});
    this.uiLayer.add([top,this.stageText,this.waveText,this.lifeText,this.goldText,this.waveCountdownBox,this.waveCountdownText,this.speedBtn,this.startWaveBtn,this.energyTitle,this.energyBg,this.energyFill,this.energyValue]);

    this.createRightRail();
    this.createDrawer();
  }

  toggleGameSpeed(){
    this.state.gameSpeed=this.state.gameSpeed===1?2:1;
    this.speedBtn.setText(`×${this.state.gameSpeed}`);
    this.speedBtn.setBackgroundColor(this.state.gameSpeed===2?'#6547d8':'#152640');
    this.showToast(`Game speed ×${this.state.gameSpeed}`);
  }

  createRightRail(){
    this.railBg=this.add.rectangle(W-RIGHT_RAIL_W/2,(HUD_H+H)/2,RIGHT_RAIL_W,H-HUD_H,0x09111f,.98).setStrokeStyle(1,0x26385e,1).setDepth(1000);
    this.railTitle=this.add.text(W-RIGHT_RAIL_W+12,HUD_H+12,'TACTICAL',{fontFamily:'Arial Black',fontSize:'11px',color:'#8da4d0'}).setDepth(1001);
    this.powerButtons=[];
    POWERS.forEach((p,i)=>{
      const y=HUD_H+50+i*82; const rect=this.add.rectangle(W-RIGHT_RAIL_W/2,y+28,110,66,0x14203a,1).setStrokeStyle(2,0x31496f,1).setInteractive({useHandCursor:true}).setDepth(1001);
      const icon=this.add.text(W-RIGHT_RAIL_W/2,y+9,p.icon,{fontSize:'22px',color:'#fff'}).setOrigin(.5).setDepth(1002);
      const label=this.add.text(W-RIGHT_RAIL_W/2,y+32,p.name,{fontFamily:'Arial',fontSize:'11px',fontStyle:'bold',color:'#fff'}).setOrigin(.5).setDepth(1002);
      const cost=this.add.text(W-RIGHT_RAIL_W/2,y+48,`${p.cost} E`,{fontFamily:'Arial',fontSize:'9px',color:'#ffd276'}).setOrigin(.5).setDepth(1002);
      rect.on('pointerdown',()=>{
        if(this.state.powerCd[p.id]>0)return this.showToast('Power is cooling down.');
        if(this.state.energy<p.cost)return this.showToast('Not enough Core Energy.');
        if(p.targeted){this.state.selected={kind:'power',id:p.id};this.renderDeck();this.showToast(`Tap the battlefield to cast ${p.name}.`);} else this.castPower(p.id,W/2,H/2);
      });
      this.powerButtons.push({p,rect,icon,label,cost});
    });
  }

  updatePowerRail(){
    for(const b of this.powerButtons){
      const cd=Math.ceil(this.state.powerCd[b.p.id]/1000); b.rect.setFillStyle(cd>0?0x0a0f1b:0x14203a,1); b.cost.setText(cd>0?`${cd}s`:`${b.p.cost} E`);
      b.rect.setStrokeStyle(2,this.state.selected?.kind==='power'&&this.state.selected.id===b.p.id?0x67e4ff:0x31496f,1);
    }
  }

  createDrawer(){
    this.drawer=this.add.container(0,H-DRAWER_OPEN_H).setDepth(1000);
    this.drawerBg=this.add.rectangle(W/2,DRAWER_OPEN_H/2,W,DRAWER_OPEN_H,0x09101f,0.98).setStrokeStyle(1,0x26385e,1);
    this.drawer.add(this.drawerBg);
    this.drawerToggle=this.add.text(W-150,7,'▼ COLLAPSE',{fontFamily:'Arial',fontSize:'11px',fontStyle:'bold',color:'#9bb0d8',backgroundColor:'#101a30',padding:{x:10,y:6}}).setInteractive({useHandCursor:true}); this.drawer.add(this.drawerToggle);
    this.drawerToggle.on('pointerdown',()=>this.toggleDrawer());
    this.tabButtons={};
    ['towers','heroes','mods'].forEach((id,i)=>{
      const label=id==='towers'?'TOWERS':id==='heroes'?'HEROES':'TOWER MODS';
      const t=this.add.text(18+i*125,8,label,{fontFamily:'Arial Black',fontSize:'11px',color:i===0?'#fff':'#8ca1c9',backgroundColor:i===0?'#17305c':'#101827',padding:{x:12,y:7}}).setInteractive({useHandCursor:true});
      t.on('pointerdown',()=>{this.state.tab=id;this.clearSelection(false);this.renderDeck();}); this.drawer.add(t); this.tabButtons[id]=t;
    });
    this.deckContainer=this.add.container(14,46); this.drawer.add(this.deckContainer);
    this.inspector=this.add.container(W-355,44); this.drawer.add(this.inspector);
    this.renderDeck(); this.refreshInspector();
  }

  toggleDrawer(){
    this.state.drawerOpen=!this.state.drawerOpen;
    const y=H-(this.state.drawerOpen?DRAWER_OPEN_H:DRAWER_CLOSED_H);
    this.tweens.add({targets:this.drawer,y,duration:180,ease:'Quad.easeOut'});
    this.drawerToggle.setText(this.state.drawerOpen?'▼ COLLAPSE':'▲ DECK');
  }

  renderDeck(){
    this.deckContainer.removeAll(true);
    for(const [id,t] of Object.entries(this.tabButtons)){t.setColor(this.state.tab===id?'#fff':'#8ca1c9');t.setBackgroundColor(this.state.tab===id?'#17305c':'#101827');}
    const items=this.state.tab==='towers'?TOWERS:this.state.tab==='heroes'?HEROES:MODS;
    const cardW=this.state.tab==='heroes'?90:102;
    items.forEach((item,i)=>{
      const x=i*(cardW+8); const c=this.add.container(x,0); const selected=this.state.selected?.kind===(this.state.tab==='towers'?'tower':this.state.tab==='heroes'?'hero':'mod')&&this.state.selected.id===item.id;
      const bg=this.add.rectangle(cardW/2,61,cardW,122,0x111a31,1).setStrokeStyle(2,selected?0x66e0ff:0x2d4370,1).setInteractive({useHandCursor:true});
      const top=this.add.rectangle(cardW/2,29,cardW-12,50,item.color,0.18);
      let heroPortrait=null;
      let glyph=null;
      if(this.state.tab==='heroes'){
        heroPortrait=this.add.sprite(cardW/2,28,'heroSheet',HERO_FRAME[item.id]).setDisplaySize(38,48);
      }else{
        glyph=this.add.text(cardW/2,27,this.state.tab==='towers'?item.icon:item.icon,{fontFamily:'Arial Black',fontSize:'24px',color:'#fff'}).setOrigin(.5);
      }
      const name=this.add.text(cardW/2,69,item.name,{fontFamily:'Arial',fontSize:'10px',fontStyle:'bold',color:'#fff',align:'center',wordWrap:{width:cardW-6}}).setOrigin(.5,0);
      const meta=this.add.text(cardW/2,94,this.state.tab==='towers'?`${item.cost} ◆`:this.state.tab==='heroes'?item.role:'Install on tower',{fontFamily:'Arial',fontSize:'8px',color:'#92a8d1',align:'center',wordWrap:{width:cardW-6}}).setOrigin(.5,0);
      if(this.state.tab==='heroes' && this.heroes.some(h=>h.def.id===item.id)) c.setAlpha(.42);
      c.add([bg,top,name,meta]);
      if(heroPortrait)c.add(heroPortrait);
      if(glyph)c.add(glyph);
      bg.on('pointerdown',()=>this.selectDeckItem(item)); this.deckContainer.add(c);
    });
  }

  selectDeckItem(item){
    if(this.state.tab==='towers') this.state.selected={kind:'tower',id:item.id};
    else if(this.state.tab==='heroes'){
      if(this.heroes.some(h=>h.def.id===item.id))return this.showToast(`${item.name} is already deployed.`);
      this.state.selected={kind:'hero',id:item.id};
    } else this.state.selected={kind:'mod',id:item.id};
    this.state.selectedEntity=null; this.renderDeck(); this.refreshInspector();
    this.showToast(this.state.tab==='towers'?`Tap a build pad for ${item.name}.`:this.state.tab==='heroes'?`Tap the ground to deploy ${item.name}.`:`Tap a built tower to install ${item.name}.`);
  }

  clearSelection(render=true){ this.state.selected=null; if(render){this.renderDeck();this.updatePowerRail();} }
  selectEntity(entity){ this.state.selectedEntity=entity; this.clearSelection(false); this.refreshInspector(); this.renderDeck(); }

  refreshInspector(){
    this.inspector.removeAll(true);
    const e=this.state.selectedEntity; const box=this.add.rectangle(0,0,330,136,0x0f182e,1).setOrigin(0).setStrokeStyle(1,0x243a62,1); this.inspector.add(box);
    if(!e){ this.inspector.add(this.add.text(16,18,'Select a tower or hero',{fontFamily:'Arial',fontSize:'13px',color:'#7689b1'})); return; }
    if(e.kind==='tower'){
      const s=this.towerStats(e); this.inspector.add(this.add.text(16,12,`${e.def.name}  Lv.${e.level}`,{fontFamily:'Arial Black',fontSize:'16px',color:'#fff'}));
      this.inspector.add(this.add.text(16,38,`DMG ${Math.round(s.damage)}   RANGE ${Math.round(s.range)}   RATE ${(1000/s.rate).toFixed(1)}/s`,{fontFamily:'Arial',fontSize:'10px',color:'#9cb0d7'}));
      this.inspector.add(this.add.text(16,57,`MODS: ${e.mods.length?e.mods.map(id=>MODS.find(m=>m.id===id).name).join(' + '):'none'}`,{fontFamily:'Arial',fontSize:'10px',color:'#cbd7ef',wordWrap:{width:295}}));
      const cost=70+30*e.level; const up=this.add.text(16,95,e.level>=4?'MAX LEVEL':`UPGRADE ${cost}◆`,{fontFamily:'Arial Black',fontSize:'10px',color:'#fff',backgroundColor:'#2458c8',padding:{x:10,y:8}}).setInteractive({useHandCursor:true});
      const sell=this.add.text(150,95,'SELL',{fontFamily:'Arial Black',fontSize:'10px',color:'#fff',backgroundColor:'#29334a',padding:{x:14,y:8}}).setInteractive({useHandCursor:true});
      up.on('pointerdown',()=>this.upgradeTower(e)); sell.on('pointerdown',()=>this.sellTower(e)); this.inspector.add([up,sell]);
    } else {
      this.inspector.add(this.add.text(16,12,e.def.name,{fontFamily:'Arial Black',fontSize:'16px',color:'#fff'}));
      this.inspector.add(this.add.text(16,38,e.def.role,{fontFamily:'Arial',fontSize:'11px',color:'#9cb0d7'}));
      this.inspector.add(this.add.text(16,61,`DMG ${e.def.damage}   RANGE ${e.def.range}   MOVE ${e.def.speed}`,{fontFamily:'Arial',fontSize:'10px',color:'#cbd7ef'}));
      const move=this.add.text(16,95,'REPOSITION',{fontFamily:'Arial Black',fontSize:'10px',color:'#fff',backgroundColor:'#2458c8',padding:{x:10,y:8}}).setInteractive({useHandCursor:true});
      const recall=this.add.text(145,95,'RECALL',{fontFamily:'Arial Black',fontSize:'10px',color:'#fff',backgroundColor:'#29334a',padding:{x:14,y:8}}).setInteractive({useHandCursor:true});
      move.on('pointerdown',()=>{this.state.selected={kind:'moveHero',uid:e.uid};this.showToast(`Tap a new position for ${e.def.name}.`);}); recall.on('pointerdown',()=>this.recallHero(e)); this.inspector.add([move,recall]);
    }
  }

  updateHUD(){
    if(!this.waveText)return;
    this.waveText.setText(`WAVE ${this.state.wave} / ${WAVES.length}`); this.lifeText.setText(`❤ ${this.state.life}`); this.goldText.setText(`◆ ${Math.floor(this.state.gold)}`);
    this.energyValue.setText(`${Math.floor(this.state.energy)}/${this.state.maxEnergy}`); this.energyFill.width=330*(this.state.energy/this.state.maxEnergy);
  }

  showToast(msg){
    if(this.toast)this.toast.destroy(); this.toast=this.add.text((W-RIGHT_RAIL_W)/2,HUD_H+18,msg,{fontFamily:'Arial',fontSize:'13px',color:'#eaf6ff',backgroundColor:'#081423',padding:{x:14,y:8}}).setOrigin(.5,0).setDepth(2000).setAlpha(0);
    this.tweens.add({targets:this.toast,alpha:1,y:HUD_H+26,duration:120,hold:1400,yoyo:true,onComplete:()=>{this.toast?.destroy();this.toast=null;}});
  }

  showVictory(){ this.showEndOverlay('GRAM DEFENDED','Stage cleared — GRAM Core survived all five waves.'); }
  showDefeat(){ this.state.running=false; this.showEndOverlay('GRAM CORE LOST','The enemy coins reached the Core. Rebuild and try again.'); }
  showEndOverlay(title,body){
    this.add.rectangle(W/2,H/2,W,H,0x030711,.86).setDepth(3000); this.add.rectangle(W/2,H/2,560,260,0x0d172a,1).setStrokeStyle(2,0x425c93,1).setDepth(3001);
    this.add.text(W/2,H/2-72,title,{fontFamily:'Arial Black',fontSize:'34px',color:'#fff'}).setOrigin(.5).setDepth(3002); this.add.text(W/2,H/2-18,body,{fontFamily:'Arial',fontSize:'15px',color:'#aebfe0',align:'center',wordWrap:{width:460}}).setOrigin(.5).setDepth(3002);
    const retry=this.add.text(W/2,H/2+70,'RESTART STAGE',{fontFamily:'Arial Black',fontSize:'14px',color:'#fff',backgroundColor:'#285bcc',padding:{x:18,y:11}}).setOrigin(.5).setInteractive({useHandCursor:true}).setDepth(3002); retry.on('pointerdown',()=>this.scene.restart());
  }
}

const config={
  type:Phaser.AUTO,
  parent:'game',
  backgroundColor:'#050914',
  width:W,height:H,
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
  render:{antialias:true,pixelArt:false,roundPixels:false},
  input:{activePointers:4},
  scene:[BattleScene]
};

new Phaser.Game(config);
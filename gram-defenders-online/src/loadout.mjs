import {
  HERO_BLUEPRINTS,TOWER_BLUEPRINTS,META_RULES,equipHero,equipTower,
  getHeroStats,getHeroUpgradeCost,getMetaState,getPowerScore,getTowerCardStats,
  getTowerUpgradeCost,resetMeta,upgradeHero,upgradeTowerCard
} from "./meta-progression.mjs";

const coins=document.querySelector("#coins"),gems=document.querySelector("#gems"),materials=document.querySelector("#materials"),power=document.querySelector("#power");
const heroSlots=document.querySelector("#hero-slots"),towerSlots=document.querySelector("#tower-slots"),heroCards=document.querySelector("#hero-cards"),towerCards=document.querySelector("#tower-cards");

function statLine(obj){
  return Object.entries(obj).map(([k,v])=>`<span><b>${k}</b> ${v}</span>`).join("");
}
function renderSlots(container,items,size,type){
  container.innerHTML="";
  for(let i=0;i<size;i+=1){
    const id=items[i];
    const el=document.createElement("div");
    el.className="loadout-slot";
    const label=type==="hero"&&i===0?"ACTIVE HERO":type==="hero"?`HERO SLOT ${i+1}`:`TOWER CARD ${i+1}`;
    el.innerHTML=`<small>${label}</small><strong>${id||"EMPTY"}</strong>`;
    container.appendChild(el);
  }
}
function render(){
  const state=getMetaState();
  coins.textContent=`Coins ${state.wallet.coins}`;
  gems.textContent=`Gems ${state.wallet.gems}`;
  materials.textContent=`Materials ${state.wallet.materials}`;
  power.textContent=`Power ${getPowerScore()}`;

  renderSlots(heroSlots,state.heroSquad,META_RULES.heroSquadSize,"hero");
  renderSlots(towerSlots,state.towerDeck,META_RULES.towerDeckSize,"tower");

  heroCards.innerHTML="";
  for(const [id,bp] of Object.entries(HERO_BLUEPRINTS)){
    const entry=state.heroes[id],card=document.createElement("article");
    card.className=`collection-card ${entry.unlocked?"":"locked"}`;
    const stats=getHeroStats(id),cost=getHeroUpgradeCost(id);
    card.innerHTML=`
      <div class="collection-head"><div><small>HERO</small><h4>${bp.name}</h4><p>${bp.role}</p></div><b>Lv ${entry.level}</b></div>
      <div class="stats-grid">${statLine(stats)}</div>
      <div class="card-actions"></div>
    `;
    const actions=card.querySelector(".card-actions");
    if(entry.unlocked){
      for(let slot=0;slot<META_RULES.heroSquadSize;slot+=1){
        const btn=document.createElement("button");btn.className="secondary compact";btn.textContent=`Equip ${slot+1}`;btn.addEventListener("click",()=>{equipHero(id,slot);render();});actions.appendChild(btn);
      }
      const up=document.createElement("button");up.className="compact";up.textContent=cost?`Upgrade · ${cost.coins}C + ${cost.materials}M`:"MAX";up.disabled=!cost;up.addEventListener("click",()=>{upgradeHero(id);render();});actions.appendChild(up);
    }else actions.innerHTML='<span class="locked-copy">Locked · unlock through progression / collection</span>';
    heroCards.appendChild(card);
  }

  towerCards.innerHTML="";
  for(const [id,bp] of Object.entries(TOWER_BLUEPRINTS)){
    const entry=state.towers[id],card=document.createElement("article");
    card.className=`collection-card ${entry.unlocked?"":"locked"}`;
    const stats=getTowerCardStats(id),cost=getTowerUpgradeCost(id);
    card.innerHTML=`
      <div class="collection-head"><div><small>TOWER CARD</small><h4>${bp.name}</h4><p>${bp.role}</p></div><b>Lv ${entry.level}</b></div>
      <div class="stats-grid">${statLine(stats)}</div>
      <div class="card-actions"></div>
    `;
    const actions=card.querySelector(".card-actions");
    if(entry.unlocked){
      for(let slot=0;slot<META_RULES.towerDeckSize;slot+=1){
        const btn=document.createElement("button");btn.className="secondary compact";btn.textContent=`Equip ${slot+1}`;btn.addEventListener("click",()=>{equipTower(id,slot);render();});actions.appendChild(btn);
      }
      const up=document.createElement("button");up.className="compact";up.textContent=cost?`Upgrade · ${cost.coins}C + ${cost.materials}M`:"MAX";up.disabled=!cost;up.addEventListener("click",()=>{upgradeTowerCard(id);render();});actions.appendChild(up);
    }else actions.innerHTML='<span class="locked-copy">Locked · unlock through progression / collection</span>';
    towerCards.appendChild(card);
  }
}

document.querySelector("#reset-meta").addEventListener("click",()=>{resetMeta();render();});
render();

import { LAND_RULES, applyCompletionFromSearch, getLandStars, getProgress, isNextLandUnlocked, resetProgress } from "./progression.mjs";
import { formatStars } from "./stage-rating.mjs";

applyCompletionFromSearch(window.location.search);
if (window.location.search.includes("completed=")) {
  history.replaceState(null, "", window.location.pathname);
}

const STAGES = [
  { id:1, title:"Frontline Basics", subtitle:"VOLYA Guard AI · Tower L1", href:"/" , implemented:true },
  { id:2, title:"Tower Upgrade", subtitle:"Unlock Tower Level 2", href:"/stage2.html", implemented:true },
  { id:3, title:"Energy Economy", subtitle:"Build / Upgrade Energy decisions", href:"/stage3.html", implemented:true },
  { id:4, title:"Mini-Boss", subtitle:"COREBREAKER elite encounter", href:"/stage4.html", implemented:true },
  { id:5, title:"Shielded Threat", subtitle:"Shieldguards · Tower Level 3", href:"/stage5.html", implemented:true },
  { id:6, title:"Combined Pressure", subtitle:"Mixed melee / ranged / shielded pressure", href:"/stage6.html", implemented:true },
  { id:7, title:"Pre-Boss", subtitle:"WARDEN ranged Elite encounter", href:"/stage7.html", implemented:true },
  { id:8, title:"Main Boss", subtitle:"CORE TYRANT two-phase boss", href:"/stage8.html", implemented:true }
];

const grid=document.querySelector("#stage-grid");
const summary=document.querySelector("#progress-summary");
const resetButton=document.querySelector("#reset-progress");
const landGate=document.querySelector("#land-gate");

function render(){
  const progress=getProgress();
  const totalStars=getLandStars();
  summary.textContent=`Unlocked through Stage ${progress.unlockedStage} · ${progress.completedStages.length} cleared · ${totalStars}/${LAND_RULES.maxStars}★`;
  const bossCleared=progress.completedStages.includes(LAND_RULES.mainBossStage);
  const nextLandOpen=isNextLandUnlocked();
  landGate.innerHTML=`
    <div>
      <strong>Land 02 Gate</strong>
      <span>${totalStars}/${LAND_RULES.maxStars}★ collected · need ${LAND_RULES.nextLandStarRequirement}★ + Main Boss clear</span>
    </div>
    <b class="${nextLandOpen?"gate-open":"gate-locked"}">${nextLandOpen?"UNLOCKED · COMING NEXT":bossCleared?"MORE STARS REQUIRED":"BOSS CLEAR REQUIRED"}</b>
  `;
  grid.innerHTML="";

  for(const stage of STAGES){
    const unlocked=stage.id<=progress.unlockedStage;
    const completed=progress.completedStages.includes(stage.id);
    const card=document.createElement("article");
    card.className=`stage-card ${unlocked?"unlocked":"locked"} ${completed?"completed":""}`;

    const stars=progress.bestStars?.[stage.id]||0;
    const state=completed?"CLEARED":unlocked?"UNLOCKED":"LOCKED";
    card.innerHTML=`
      <div class="stage-number">${String(stage.id).padStart(2,"0")}</div>
      <div class="stage-copy">
        <span class="stage-state">${state}</span>
        <h3>${stage.title}</h3>
        <p>${stage.subtitle}</p>
        <div class="stage-stars ${stars>0?"earned":""}">${formatStars(stars)}</div>
      </div>
    `;

    if(unlocked&&stage.implemented&&stage.href){
      const link=document.createElement("a");
      link.className="stage-play";
      link.href=stage.href;
      link.textContent=completed?"Replay":"Play";
      card.appendChild(link);
    }else{
      const lock=document.createElement("span");
      lock.className="stage-lock";
      lock.textContent=unlocked?"In development":"🔒";
      card.appendChild(lock);
    }
    grid.appendChild(card);
  }
}

resetButton.addEventListener("click",()=>{resetProgress();render();});
render();

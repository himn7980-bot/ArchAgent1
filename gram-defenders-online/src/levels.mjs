import { applyCompletionFromSearch, getProgress, resetProgress } from "./progression.mjs";

applyCompletionFromSearch(window.location.search);
if (window.location.search.includes("completed=")) {
  history.replaceState(null, "", window.location.pathname);
}

const STAGES = [
  { id:1, title:"Frontline Basics", subtitle:"VOLYA Guard AI · Tower L1", href:"/" , implemented:true },
  { id:2, title:"Tower Upgrade", subtitle:"Unlock Tower Level 2", href:"/stage2.html", implemented:true },
  { id:3, title:"Energy Economy", subtitle:"Build / Upgrade Energy decisions", href:"/stage3.html", implemented:true },
  { id:4, title:"Mini-Boss", subtitle:"COREBREAKER elite encounter", href:"/stage4.html", implemented:true },
  { id:5, title:"New Threat", subtitle:"New enemy / tactical rule · progression test", href:"/stage-placeholder.html?stage=5", implemented:true, prototypeOnly:true },
  { id:6, title:"Combined Pressure", subtitle:"Mixed threat composition · progression test", href:"/stage-placeholder.html?stage=6", implemented:true, prototypeOnly:true },
  { id:7, title:"Pre-Boss", subtitle:"Elite preparation stage · progression test", href:"/stage-placeholder.html?stage=7", implemented:true, prototypeOnly:true },
  { id:8, title:"Main Boss", subtitle:"Land 01 boss encounter · progression test", href:"/stage-placeholder.html?stage=8", implemented:true, prototypeOnly:true }
];

const grid=document.querySelector("#stage-grid");
const summary=document.querySelector("#progress-summary");
const resetButton=document.querySelector("#reset-progress");

function render(){
  const progress=getProgress();
  summary.textContent=`Unlocked through Stage ${progress.unlockedStage} · ${progress.completedStages.length} cleared`;
  grid.innerHTML="";

  for(const stage of STAGES){
    const unlocked=stage.id<=progress.unlockedStage;
    const completed=progress.completedStages.includes(stage.id);
    const card=document.createElement("article");
    card.className=`stage-card ${unlocked?"unlocked":"locked"} ${completed?"completed":""}`;

    const state=completed?"CLEARED":unlocked?(stage.prototypeOnly?"UNLOCKED · PROGRESSION TEST":"UNLOCKED"):"LOCKED";
    card.innerHTML=`
      <div class="stage-number">${String(stage.id).padStart(2,"0")}</div>
      <div class="stage-copy">
        <span class="stage-state">${state}</span>
        <h3>${stage.title}</h3>
        <p>${stage.subtitle}</p>
      </div>
    `;

    if(unlocked&&stage.implemented&&stage.href){
      const link=document.createElement("a");
      link.className="stage-play";
      link.href=stage.href;
      link.textContent=completed?(stage.prototypeOnly?"Retest":"Replay"):(stage.prototypeOnly?"Test unlock":"Play");
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

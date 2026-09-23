export function installTowerDeckUi(game,primaryButton,{buildCost=null,onSelect=null}={}){
  if(!primaryButton||!game?.battleMeta)return {buttons:[],select:()=>{}};

  const parent=primaryButton.parentElement;
  const deck=game.battleMeta.towerDeck||[];
  const buttons=[];

  function labelButton(button,cardId){
    const profile=game.battleMeta.towerCards?.[cardId];
    if(!profile)return;
    button.dataset.towerCardId=cardId;
    button.classList.add("tower-card");
    const strong=button.querySelector("strong");
    const small=button.querySelector("small");
    if(strong)strong.textContent=`${profile.name}${buildCost!=null?` · ${buildCost}⚡`:""}`;
    if(small)small.textContent=`${profile.role} · Meta DMG ${profile.damage}`;
  }

  function select(cardId){
    if(!deck.includes(cardId))return false;
    game.selectedTowerCardId=cardId;
    for(const button of buttons){
      const selected=button.dataset.towerCardId===cardId;
      button.classList.toggle("selected",selected);
      button.setAttribute("aria-pressed",String(selected));
    }
    if(onSelect)onSelect(cardId);
    return true;
  }

  deck.forEach((cardId,index)=>{
    const button=index===0?primaryButton:primaryButton.cloneNode(true);
    if(index>0){
      button.id=`tower-card-${cardId.toLowerCase()}`;
      primaryButton.insertAdjacentElement("afterend",button);
    }
    labelButton(button,cardId);
    button.addEventListener("click",()=>select(cardId));
    buttons.push(button);
  });

  select(game.selectedTowerCardId||deck[0]);
  return {buttons,select};
}

export function refreshTowerDeckUi(controller,game,{buildCost=null}={}){
  if(!controller?.buttons)return;
  for(const button of controller.buttons){
    const id=button.dataset.towerCardId;
    const profile=game.battleMeta.towerCards?.[id];
    if(!profile)continue;
    const strong=button.querySelector("strong");
    const small=button.querySelector("small");
    if(strong)strong.textContent=`${profile.name}${buildCost!=null?` · ${buildCost}⚡`:""}`;
    if(small)small.textContent=`${profile.role} · Meta DMG ${profile.damage}`;
  }
}

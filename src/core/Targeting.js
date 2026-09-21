function distSq(ax,ay,bx,by){
  const dx=ax-bx, dy=ay-by;
  return dx*dx+dy*dy;
}

// Select the living in-range enemy furthest along the route in one pass.
// This avoids allocating/filtering/sorting every time a tower or hero acquires a target.
export function pickFrontTarget(enemies,x,y,range){
  if(!Array.isArray(enemies) || range<=0) return null;
  const r2=range*range;
  let best=null, bestProgress=-Infinity;
  for(const e of enemies){
    if(!e || e.dead || !e.container) continue;
    if(distSq(x,y,e.container.x,e.container.y)>r2) continue;
    const progress=Number(e.pathProgress)||0;
    if(progress>bestProgress){ best=e; bestProgress=progress; }
  }
  return best;
}

// Select nearest eligible chain target in one pass, excluding already-hit enemies.
export function pickNearestChainTarget(enemies,current,range,hit){
  if(!Array.isArray(enemies) || !current?.container || range<=0) return null;
  const r2=range*range;
  let best=null, bestD2=Infinity;
  for(const e of enemies){
    if(!e || e.dead || e===current || hit?.has?.(e) || !e.container) continue;
    const d2=distSq(current.container.x,current.container.y,e.container.x,e.container.y);
    if(d2<=r2 && d2<bestD2){ best=e; bestD2=d2; }
  }
  return best;
}

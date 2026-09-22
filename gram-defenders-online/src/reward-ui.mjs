export function formatStageReward(reward){
  if(!reward)return "";
  const parts=[];
  if(reward.coins>0)parts.push(`+${reward.coins} Coins`);
  if(reward.materials>0)parts.push(`+${reward.materials} Materials`);
  if(reward.gems>0)parts.push(`+${reward.gems} Gem${reward.gems===1?"":"s"}`);
  return parts.join(" · ");
}

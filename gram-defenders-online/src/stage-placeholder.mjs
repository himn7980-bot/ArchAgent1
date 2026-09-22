import { completeStage, getProgress, isStageUnlocked } from "./progression.mjs";

const params = new URLSearchParams(window.location.search);
const stage = Number(params.get("stage"));
const ROLES = {
  5: ["New Threat", "New enemy / tactical rule"],
  6: ["Combined Pressure", "Mixed threat composition"],
  7: ["Pre-Boss", "Elite preparation stage"],
  8: ["Main Boss", "Land 01 boss encounter"]
};

const title = document.querySelector("#stage-title");
const name = document.querySelector("#stage-name");
const number = document.querySelector("#stage-number");
const role = document.querySelector("#stage-role");
const description = document.querySelector("#stage-description");
const status = document.querySelector("#stage-status");
const button = document.querySelector("#complete-stage");
const back = document.querySelector(".stage-link");

if (!Number.isInteger(stage) || stage < 5 || stage > 8) {
  window.location.replace("/levels.html");
} else if (!isStageUnlocked(stage)) {
  window.location.replace("/levels.html");
} else {
  const [roleName, roleDescription] = ROLES[stage];
  title.textContent = `GRAM DEFENDERS · STAGE ${String(stage).padStart(2,"0")}`;
  name.textContent = `Stage ${stage}`;
  number.textContent = String(stage).padStart(2,"0");
  role.textContent = roleName;
  description.textContent = roleDescription + " · Gameplay not built yet; progression flow is being verified.";
  status.textContent = `Stage ${stage} unlocked`;

  button.addEventListener("click", () => {
    const before = getProgress();
    if (before.unlockedStage !== stage) return;
    const after = completeStage(stage);
    const next = Math.min(8, stage + 1);
    status.textContent = stage === 8
      ? "Land 01 progression test complete"
      : `Stage ${stage} cleared · Stage ${next} unlocked`;
    button.disabled = true;
    button.textContent = "Cleared";
    back.href = stage === 8 ? "/levels.html" : `/levels.html?completed=${stage}`;
    back.textContent = stage === 8 ? "Back to Land 01 Map" : `Continue · Stage ${next}`;

    // completeStage already wrote progression; the URL token is a fallback for browser storage edge cases.
    if (after.unlockedStage !== (stage === 8 ? 8 : stage + 1)) {
      status.textContent = "Progression write failed";
    }
  });
}

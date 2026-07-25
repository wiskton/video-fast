import { storage } from "../lib/browser-api.js";
import { t, applyI18n } from "../lib/i18n.js";

const els = {
  enabledToggle: document.getElementById("enabledToggle"),
  speedInput: document.getElementById("speedInput"),
  volumeInput: document.getElementById("volumeInput"),
  ignoreListArea: document.getElementById("ignoreListArea"),
  saveVideoBtn: document.getElementById("saveVideoBtn"),
  videoSavedHint: document.getElementById("videoSavedHint"),
};

async function loadVideoSettings() {
  const stored = await storage.get("local", [
    "vf_enabled",
    "vf_defaultSpeed",
    "vf_volumeGain",
    "vf_ignoreList",
  ]);
  els.enabledToggle.checked = stored.vf_enabled !== false;
  els.speedInput.value = String(stored.vf_defaultSpeed ?? 2);
  els.volumeInput.value = String(stored.vf_volumeGain ?? 100);
  els.ignoreListArea.value = (stored.vf_ignoreList || []).join("\n");
}

async function saveVideoSettings() {
  const speed = Math.min(16, Math.max(0.1, parseFloat(els.speedInput.value) || 1));
  const volumeGain = Math.min(500, Math.max(0, parseFloat(els.volumeInput.value) || 100));
  const ignoreList = els.ignoreListArea.value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  await storage.set("local", {
    vf_enabled: els.enabledToggle.checked,
    vf_defaultSpeed: speed,
    vf_volumeGain: volumeGain,
    vf_ignoreList: ignoreList,
  });

  els.speedInput.value = String(speed);
  els.volumeInput.value = String(volumeGain);
  els.videoSavedHint.textContent = t("optionsSavedHint");
  setTimeout(() => (els.videoSavedHint.textContent = ""), 1500);
}

els.saveVideoBtn.addEventListener("click", saveVideoSettings);

document.title = t("optionsPageTitle");
applyI18n();
loadVideoSettings();

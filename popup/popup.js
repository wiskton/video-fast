import { ext, storage, tabs } from "../lib/browser-api.js";

const els = {
  enabledToggle: document.getElementById("enabledToggle"),
  speedRange: document.getElementById("speedRange"),
  speedInput: document.getElementById("speedInput"),
  volumeRange: document.getElementById("volumeRange"),
  volumeInput: document.getElementById("volumeInput"),
  currentHost: document.getElementById("currentHost"),
  toggleIgnoreBtn: document.getElementById("toggleIgnoreBtn"),
  statusHint: document.getElementById("statusHint"),
  openOptionsBtn: document.getElementById("openOptionsBtn"),
};

let settings = { vf_enabled: true, vf_defaultSpeed: 2, vf_volumeGain: 100, vf_ignoreList: [] };
let currentHostname = "";

function isIgnored(hostname, list) {
  return list.some((raw) => {
    const p = (raw || "").trim().toLowerCase();
    if (!p || p.includes("*") || p.includes("/")) return false;
    return hostname === p || hostname.endsWith("." + p);
  });
}

function updateStatusHint() {
  if (!currentHostname) {
    els.statusHint.textContent = "";
    return;
  }
  const ignored = isIgnored(currentHostname, settings.vf_ignoreList);
  els.toggleIgnoreBtn.textContent = ignored ? "Parar de ignorar" : "Ignorar";
  if (!settings.vf_enabled) {
    els.statusHint.textContent = "A extensão está desativada.";
  } else if (ignored) {
    els.statusHint.textContent = "Este site está na lista de exceções.";
  } else {
    els.statusHint.textContent = `Vídeos serão acelerados em ${settings.vf_defaultSpeed}x, volume em ${settings.vf_volumeGain}%.`;
  }
}

async function loadSettings() {
  const stored = await storage.get("local", [
    "vf_enabled",
    "vf_defaultSpeed",
    "vf_volumeGain",
    "vf_ignoreList",
  ]);
  settings = { ...settings, ...stored };
  els.enabledToggle.checked = !!settings.vf_enabled;
  els.speedRange.value = String(settings.vf_defaultSpeed);
  els.speedInput.value = String(settings.vf_defaultSpeed);
  els.volumeRange.value = String(settings.vf_volumeGain);
  els.volumeInput.value = String(settings.vf_volumeGain);
}

async function loadCurrentTab() {
  const [tab] = await tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    try {
      currentHostname = new URL(tab.url).hostname;
      els.currentHost.textContent = currentHostname;
    } catch {
      currentHostname = "";
      els.currentHost.textContent = "—";
      els.toggleIgnoreBtn.disabled = true;
    }
  } else {
    els.toggleIgnoreBtn.disabled = true;
  }
}

async function saveSpeed(value) {
  const clamped = Math.min(16, Math.max(0.1, value));
  settings.vf_defaultSpeed = clamped;
  els.speedRange.value = String(clamped);
  els.speedInput.value = String(clamped);
  await storage.set("local", { vf_defaultSpeed: clamped });
  updateStatusHint();
}

async function saveVolume(value) {
  const clamped = Math.min(500, Math.max(0, value));
  settings.vf_volumeGain = clamped;
  els.volumeRange.value = String(clamped);
  els.volumeInput.value = String(clamped);
  await storage.set("local", { vf_volumeGain: clamped });
  updateStatusHint();
}

els.enabledToggle.addEventListener("change", async () => {
  settings.vf_enabled = els.enabledToggle.checked;
  await storage.set("local", { vf_enabled: settings.vf_enabled });
  updateStatusHint();
});

els.speedRange.addEventListener("input", () => saveSpeed(parseFloat(els.speedRange.value)));
els.speedInput.addEventListener("change", () => saveSpeed(parseFloat(els.speedInput.value) || 1));

els.volumeRange.addEventListener("input", () => saveVolume(parseFloat(els.volumeRange.value)));
els.volumeInput.addEventListener("change", () =>
  saveVolume(parseFloat(els.volumeInput.value) || 100)
);

els.toggleIgnoreBtn.addEventListener("click", async () => {
  if (!currentHostname) return;
  const ignored = isIgnored(currentHostname, settings.vf_ignoreList);
  if (ignored) {
    settings.vf_ignoreList = settings.vf_ignoreList.filter((raw) => {
      const p = (raw || "").trim().toLowerCase();
      return !(currentHostname === p || currentHostname.endsWith("." + p));
    });
  } else {
    settings.vf_ignoreList = [...settings.vf_ignoreList, currentHostname];
  }
  await storage.set("local", { vf_ignoreList: settings.vf_ignoreList });
  updateStatusHint();
});

els.openOptionsBtn.addEventListener("click", () => {
  ext.runtime.openOptionsPage();
});

(async function init() {
  await Promise.all([loadSettings(), loadCurrentTab()]);
  updateStatusHint();
})();

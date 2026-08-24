import { ext, storage, tabs } from "../lib/browser-api.js";
import { t, applyI18n } from "../lib/i18n.js";

const els = {
  enabledToggle: document.getElementById("enabledToggle"),
  viewToggle: document.getElementById("viewToggle"),
  // speed — bar
  speedRange: document.getElementById("speedRange"),
  speedInput: document.getElementById("speedInput"),
  // speed — buttons
  speedBarView: document.getElementById("speedBarView"),
  speedBtnView: document.getElementById("speedBtnView"),
  speedCustomInput: document.getElementById("speedCustomInput"),
  speedCustomApply: document.getElementById("speedCustomApply"),
  // volume — bar
  volumeRange: document.getElementById("volumeRange"),
  volumeInput: document.getElementById("volumeInput"),
  // volume — buttons
  volumeBarView: document.getElementById("volumeBarView"),
  volumeBtnView: document.getElementById("volumeBtnView"),
  volumeCustomInput: document.getElementById("volumeCustomInput"),
  volumeCustomApply: document.getElementById("volumeCustomApply"),
  // site
  currentHost: document.getElementById("currentHost"),
  toggleIgnoreBtn: document.getElementById("toggleIgnoreBtn"),
  statusHint: document.getElementById("statusHint"),
  openOptionsBtn: document.getElementById("openOptionsBtn"),
  btcAddressBtn: document.getElementById("btcAddressBtn"),
};

let settings = {
  vf_enabled: true,
  vf_defaultSpeed: 2,
  vf_volumeGain: 100,
  vf_ignoreList: [],
  vf_viewMode: "bar", // "bar" | "buttons" — controls both speed and volume
};
let currentHostname = "";

// ─── helpers ─────────────────────────────────────────────────────────────────

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
  els.toggleIgnoreBtn.textContent = t(ignored ? "popupUnignoreBtn" : "popupIgnoreBtn");
  if (!settings.vf_enabled) {
    els.statusHint.textContent = t("popupStatusDisabled");
  } else if (ignored) {
    els.statusHint.textContent = t("popupStatusIgnored");
  } else {
    els.statusHint.textContent = t("popupStatusActive", [
      String(settings.vf_defaultSpeed),
      String(settings.vf_volumeGain),
    ]);
  }
}

// ─── view mode (single toggle for both) ──────────────────────────────────────

function applyViewMode(mode) {
  settings.vf_viewMode = mode;
  const isBar = mode === "bar";
  els.speedBarView.hidden = !isBar;
  els.speedBtnView.hidden = isBar;
  els.volumeBarView.hidden = !isBar;
  els.volumeBtnView.hidden = isBar;
  if (!isBar) {
    updateSpeedBtnsActive(settings.vf_defaultSpeed);
    updateVolumeBtnsActive(settings.vf_volumeGain);
  }
}

els.viewToggle.addEventListener("click", async () => {
  const newMode = settings.vf_viewMode === "bar" ? "buttons" : "bar";
  applyViewMode(newMode);
  await storage.set("local", { vf_viewMode: newMode });
});

// ─── speed ───────────────────────────────────────────────────────────────────

function updateSpeedBtnsActive(speed) {
  els.speedBtnView.querySelectorAll(".vf-preset-btn[data-speed]").forEach((btn) => {
    btn.classList.toggle("active", parseFloat(btn.dataset.speed) === speed);
  });
}

async function saveSpeed(value) {
  const clamped = Math.min(16, Math.max(0.1, value));
  settings.vf_defaultSpeed = clamped;
  els.speedRange.value = String(clamped);
  els.speedInput.value = String(clamped);
  updateSpeedBtnsActive(clamped);
  await storage.set("local", { vf_defaultSpeed: clamped });
  updateStatusHint();
}

els.speedBtnView.addEventListener("click", async (e) => {
  const btn = e.target.closest(".vf-preset-btn[data-speed]");
  if (!btn) return;
  await saveSpeed(parseFloat(btn.dataset.speed));
});

els.speedCustomApply.addEventListener("click", async () => {
  const val = parseFloat(els.speedCustomInput.value);
  if (!isNaN(val) && val > 0) {
    await saveSpeed(val);
    els.speedCustomInput.value = "";
  }
});

els.speedCustomInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.speedCustomApply.click();
});

els.speedRange.addEventListener("input", () => saveSpeed(parseFloat(els.speedRange.value)));
els.speedInput.addEventListener("change", () => saveSpeed(parseFloat(els.speedInput.value) || 1));

// ─── volume ──────────────────────────────────────────────────────────────────

function updateVolumeBtnsActive(volume) {
  els.volumeBtnView.querySelectorAll(".vf-preset-btn[data-volume]").forEach((btn) => {
    btn.classList.toggle("active", parseInt(btn.dataset.volume, 10) === volume);
  });
}

async function saveVolume(value) {
  const clamped = Math.min(500, Math.max(0, value));
  settings.vf_volumeGain = clamped;
  els.volumeRange.value = String(clamped);
  els.volumeInput.value = String(clamped);
  updateVolumeBtnsActive(clamped);
  await storage.set("local", { vf_volumeGain: clamped });
  updateStatusHint();
}

els.volumeBtnView.addEventListener("click", async (e) => {
  const btn = e.target.closest(".vf-preset-btn[data-volume]");
  if (!btn) return;
  await saveVolume(parseInt(btn.dataset.volume, 10));
});

els.volumeCustomApply.addEventListener("click", async () => {
  const val = parseInt(els.volumeCustomInput.value, 10);
  if (!isNaN(val) && val >= 0) {
    await saveVolume(val);
    els.volumeCustomInput.value = "";
  }
});

els.volumeCustomInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.volumeCustomApply.click();
});

els.volumeRange.addEventListener("input", () => saveVolume(parseFloat(els.volumeRange.value)));
els.volumeInput.addEventListener("change", () =>
  saveVolume(parseFloat(els.volumeInput.value) || 100)
);

// ─── enabled toggle ──────────────────────────────────────────────────────────

els.enabledToggle.addEventListener("change", async () => {
  settings.vf_enabled = els.enabledToggle.checked;
  await storage.set("local", { vf_enabled: settings.vf_enabled });
  updateStatusHint();
});

// ─── ignore list ─────────────────────────────────────────────────────────────

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

// ─── misc ─────────────────────────────────────────────────────────────────────

els.openOptionsBtn.addEventListener("click", () => {
  ext.runtime.openOptionsPage();
});

els.btcAddressBtn.addEventListener("click", async () => {
  const address = els.btcAddressBtn.dataset.address;
  try {
    await navigator.clipboard.writeText(address);
    els.btcAddressBtn.textContent = t("popupSupportCopied");
    setTimeout(() => {
      els.btcAddressBtn.textContent = address;
    }, 1500);
  } catch {
    // Clipboard API unavailable; nothing to fall back to.
  }
});

// ─── init ─────────────────────────────────────────────────────────────────────

async function loadSettings() {
  const stored = await storage.get("local", [
    "vf_enabled",
    "vf_defaultSpeed",
    "vf_volumeGain",
    "vf_ignoreList",
    "vf_viewMode",
  ]);
  settings = { ...settings, ...stored };
  els.enabledToggle.checked = !!settings.vf_enabled;
  els.speedRange.value = String(settings.vf_defaultSpeed);
  els.speedInput.value = String(settings.vf_defaultSpeed);
  els.volumeRange.value = String(settings.vf_volumeGain);
  els.volumeInput.value = String(settings.vf_volumeGain);
  applyViewMode(settings.vf_viewMode || "bar");
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

(async function init() {
  applyI18n();
  await Promise.all([loadSettings(), loadCurrentTab()]);
  updateStatusHint();
})();

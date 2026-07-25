import { ext, storage } from "../lib/browser-api.js";

const DEFAULT_SETTINGS = {
  vf_enabled: true,
  vf_defaultSpeed: 2.0,
  vf_volumeGain: 100,
  vf_ignoreList: ["twitch.tv", "kick.com"],
};

ext.runtime.onInstalled.addListener(async () => {
  const current = await storage.get("local", Object.keys(DEFAULT_SETTINGS));
  const merged = { ...DEFAULT_SETTINGS, ...current };
  await storage.set("local", merged);
  await updateBadge();
});

ext.runtime.onStartup?.addListener(updateBadge);

async function getSettings(keys) {
  return storage.get("local", keys ?? Object.keys(DEFAULT_SETTINGS));
}

function formatSpeedBadge(speed) {
  const rounded = Math.round(speed * 100) / 100;
  const withX = `${rounded}x`;
  // o badge fica ilegível com mais de ~4 caracteres; nesse caso corta o "x".
  return withX.length <= 4 ? withX : String(rounded).slice(0, 4);
}

async function updateBadge() {
  const { vf_enabled, vf_defaultSpeed } = await getSettings(["vf_enabled", "vf_defaultSpeed"]);
  const speed = vf_defaultSpeed ?? DEFAULT_SETTINGS.vf_defaultSpeed;

  if (vf_enabled === false) {
    await ext.action.setBadgeText({ text: "OFF" });
    await ext.action.setBadgeBackgroundColor({ color: "#53535f" });
    await ext.action.setTitle({ title: "Video Fast — desativado" });
    return;
  }

  const badgeText = formatSpeedBadge(speed);
  await ext.action.setBadgeText({ text: badgeText });
  await ext.action.setBadgeBackgroundColor({ color: "#9147ff" });
  await ext.action.setTitle({ title: `Video Fast — velocidade padrão ${speed}x` });
}

storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if ("vf_enabled" in changes || "vf_defaultSpeed" in changes) updateBadge();
});

updateBadge();

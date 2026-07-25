// Content script: aplica a velocidade padrão configurada a todos os elementos
// <video> da página atual, a menos que a URL esteja na lista de exceções.
(function () {
  const DEFAULTS = {
    vf_enabled: true,
    vf_defaultSpeed: 2.0,
    vf_volumeGain: 100,
    vf_ignoreList: ["twitch.tv", "kick.com"],
  };

  let state = { ...DEFAULTS };
  let active = false;

  // vídeos já roteados por um GainNode (Web Audio), para poder ajustar o ganho
  // sem recriar o grafo de áudio a cada mudança.
  const wiredVideos = new WeakMap();

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, (m) => (m === "*" ? m : "\\" + m));
  }

  function patternToRegExp(pattern) {
    // "*" vira curinga; o resto do texto é escapado literalmente.
    const escaped = pattern
      .split("*")
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    return new RegExp("^" + escaped + "$", "i");
  }

  function matchesIgnoreList(href, hostname, patterns) {
    for (const raw of patterns) {
      const pattern = (raw || "").trim().toLowerCase();
      if (!pattern) continue;

      if (pattern.includes("*")) {
        const re = patternToRegExp(pattern);
        if (re.test(href) || re.test(hostname)) return true;
        continue;
      }

      if (pattern.includes("/")) {
        if (href.toLowerCase().includes(pattern)) return true;
        continue;
      }

      if (hostname === pattern || hostname.endsWith("." + pattern)) return true;
    }
    return false;
  }

  function computeActive() {
    if (!state.vf_enabled) return false;
    return !matchesIgnoreList(location.href, location.hostname, state.vf_ignoreList);
  }

  function applyToVideo(video) {
    if (!active) return;
    const speed = state.vf_defaultSpeed;
    if (Math.abs(video.playbackRate - speed) > 0.01) {
      try {
        video.playbackRate = speed;
      } catch (err) {
        // alguns players bloqueiam a troca antes de ter metadata carregada; ignora.
      }
    }
  }

  function applyGainToVideo(video) {
    if (!active) return;
    const targetGain = state.vf_volumeGain / 100;

    const wired = wiredVideos.get(video);
    if (wired) {
      if (wired.ctx.state === "suspended") wired.ctx.resume().catch(() => {});
      if (wired.gainNode.gain.value !== targetGain) wired.gainNode.gain.value = targetGain;
      return;
    }

    // Sem alteração de ganho pedida: não mexe no pipeline de áudio nativo do vídeo.
    if (Math.abs(targetGain - 1) < 0.001) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaElementSource(video);
      const gainNode = ctx.createGain();
      gainNode.gain.value = targetGain;
      source.connect(gainNode).connect(ctx.destination);
      wiredVideos.set(video, { ctx, gainNode });
    } catch (err) {
      // vídeo de outra origem sem CORS liberado, DRM, ou já conectado a outro
      // grafo de áudio (ex: visualizador do próprio site) — mantém o áudio nativo.
    }
  }

  function applyAll(video) {
    applyToVideo(video);
    applyGainToVideo(video);
  }

  function applyToAllVideos() {
    document.querySelectorAll("video").forEach(applyAll);
  }

  function refresh() {
    active = computeActive();
    if (active) applyToAllVideos();
  }

  const observer = new MutationObserver((mutations) => {
    if (!active) return;
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.tagName === "VIDEO") applyAll(node);
        else node.querySelectorAll?.("video").forEach(applyAll);
      });
    }
  });

  function startObserving() {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  // Reaplica a velocidade/ganho quando o próprio site troca a taxa de reprodução
  // (comum em anúncios, trocas de faixa em SPAs, etc), e tenta retomar o
  // AudioContext no primeiro gesto de reprodução (política de autoplay dos navegadores).
  document.addEventListener(
    "play",
    (e) => {
      if (active && e.target instanceof HTMLVideoElement) applyAll(e.target);
    },
    true
  );
  document.addEventListener(
    "loadedmetadata",
    (e) => {
      if (active && e.target instanceof HTMLVideoElement) applyAll(e.target);
    },
    true
  );
  document.addEventListener(
    "ratechange",
    (e) => {
      if (active && e.target instanceof HTMLVideoElement) applyToVideo(e.target);
    },
    true
  );

  async function init() {
    try {
      const stored = await VF.storage.get("local", Object.keys(DEFAULTS));
      state = { ...DEFAULTS, ...stored };
    } catch (err) {
      state = { ...DEFAULTS };
    }
    refresh();
    startObserving();
  }

  VF.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    let relevant = false;
    for (const key of Object.keys(DEFAULTS)) {
      if (key in changes) {
        state[key] = changes[key].newValue;
        relevant = true;
      }
    }
    if (relevant) refresh();
  });

  init();
})();

/**
 * HyperFrames Render Contract + Lemo-Opuscar Virtual Clock Runtime
 * Ensures 100% deterministic frame seeking in Headless Chromium & live preview.
 */
(function initHyperRuntime() {
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Replace unseeded Math.random for deterministic motion rendering
  if (window.__HYPER_CAPTURE__) {
    Math.random = mulberry32(0x534f4e49);
  }

  window.__timelines = window.__timelines || {};
  window.__hyperReady = false;

  window.getHyperVars = function getHyperVars() {
    if (window.__HYPER_VARS__) return window.__HYPER_VARS__;
    const comp = document.querySelector('[data-composition-id]');
    const rawAttr = comp && comp.getAttribute('data-composition-variables');
    if (rawAttr) {
      try {
        return JSON.parse(rawAttr);
      } catch {
        // Fallback to script tag
      }
    }
    const scriptTag = document.getElementById('composition-vars');
    if (scriptTag && scriptTag.textContent) {
      try {
        return JSON.parse(scriptTag.textContent);
      } catch {
        return {};
      }
    }
    return {};
  };

  window.registerHyperComposition = function registerHyperComposition({ id, timeline, onFrame }) {
    if (timeline) {
      timeline.pause(0);
      window.__timelines[id || 'main'] = timeline;
    }

    window.__hyperSeek = function __hyperSeek(tSec) {
      const clamped = Math.max(0, Number(tSec) || 0);
      for (const tl of Object.values(window.__timelines)) {
        if (tl && typeof tl.seek === 'function') {
          tl.seek(clamped, false);
        }
      }
      if (typeof onFrame === 'function') {
        onFrame(clamped);
      }
    };

    // Render frame 0 immediately
    window.__hyperSeek(0);
    window.__hyperReady = true;
  };
})();

// small helpers
document.getElementById("year").textContent = new Date().getFullYear();

// gallery modal
document.querySelectorAll(".tile").forEach((tile) => {
  tile.addEventListener("click", () => {
    const img = tile.querySelector("img");
    const modal = document.getElementById("modal");
    const modalImg = document.getElementById("modalImg");
    modalImg.src = img.src;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  });
});
document.getElementById("modal").addEventListener("click", () => {
  document.getElementById("modal").classList.remove("open");
  document.getElementById("modal").setAttribute("aria-hidden", "true");
});

// simple contact form behaviour: prevents reload and shows a tiny toast
document.getElementById("noteForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const name = document.getElementById("name").value || "Someone";
  const message = document.getElementById("message").value || "";
  // here you'd send to your server or to an email API
  alert(
    "Thanks, " +
      name +
      "! Your note was received.\n\nPreview:\n" +
      (message.slice(0, 120) || "[empty message]")
  );
  this.reset();
});

// smooth scrolling for nav links (enhancement for older browsers)
document.querySelectorAll(".links a").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const id = a.getAttribute("href");
    document.querySelector(id).scrollIntoView({ behavior: "smooth" });
  });
});

// Background music autoplay + user-gesture fallback + UI control
(function backgroundMusic() {
  const audio = document.getElementById("bg-audio");
  const btn = document.getElementById("audio-control");
  if (!audio || !btn) return;

  // read persisted preference (optional)
  const saved = localStorage.getItem("bg-music-state"); // 'playing' | 'paused'
  if (saved === "paused") {
    // if user previously paused, respect that and mark UI
    btn.classList.remove("playing");
    btn.setAttribute("aria-pressed", "false");
    btn.textContent = "🔈";
  }

  // Try autoplay on load. Many browsers will reject the promise if blocked.
  async function tryAutoplay() {
    try {
      await audio.play();
      btn.classList.add("playing");
      btn.setAttribute("aria-pressed", "true");
      btn.textContent = "🔊";
      localStorage.setItem("bg-music-state", "playing");
      return true;
    } catch (err) {
      // autoplay blocked — show control and wait for user gesture
      btn.classList.add("needs-interaction");
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = "🔈";
      return false;
    }
  }

  // If autoplay blocked, attempt to resume on the first user gesture (click/touch)
  function resumeOnUserGesture() {
    audio
      .play()
      .then(() => {
        btn.classList.add("playing");
        btn.classList.remove("needs-interaction");
        btn.setAttribute("aria-pressed", "true");
        btn.textContent = "🔊";
        localStorage.setItem("bg-music-state", "playing");
        // after success remove listener
        document.removeEventListener("click", resumeOnUserGesture);
        document.removeEventListener("touchstart", resumeOnUserGesture);
      })
      .catch(() => {
        // still blocked — keep waiting
      });
  }

  // Toggle play/pause when user clicks the floating button
  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (audio.paused) {
      try {
        await audio.play();
        btn.classList.add("playing");
        btn.classList.remove("needs-interaction");
        btn.setAttribute("aria-pressed", "true");
        btn.textContent = "🔊";
        localStorage.setItem("bg-music-state", "playing");
      } catch (err) {
        // If browser still blocks, encourage user
        btn.classList.add("needs-interaction");
      }
    } else {
      audio.pause();
      btn.classList.remove("playing");
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = "🔈";
      localStorage.setItem("bg-music-state", "paused");
    }
  });

  // initial attempt
  tryAutoplay().then((started) => {
    if (!started) {
      // try again on any user interaction
      document.addEventListener("click", resumeOnUserGesture, {
        passive: true,
      });
      document.addEventListener("touchstart", resumeOnUserGesture, {
        passive: true,
      });
    }
  });

  // optional: if you want the audio to continue at the same spot across page loads,
  // you could persist currentTime periodically and restore it on load.
})();
// ---------- Robust timeline video manager (replace previous timelineVideoManager) ----------
(function timelineVideoManager_v2() {
  const timeline = document.getElementById("timeline");
  const tv = document.getElementById("timeline-video"); // timeline video element
  const playHint = document.getElementById("timeline-play-hint");
  if (!timeline || !tv) return;

  // debug toggle
  const DBG = false;
  function log(...s) {
    if (DBG) console.log("[TL]", ...s);
  }

  // pause every other audio/video element except `exceptEl`
  function pauseAllExcept(exceptEl) {
    document.querySelectorAll("audio, video").forEach((el) => {
      if (el === exceptEl) return;
      try {
        el.pause();
      } catch (e) {
        /* ignore */
      }
    });
  }

  // polite attempt to play (load() first, set a gentle default volume on first try)
  async function attemptPlay() {
    try {
      if (
        tv.tagName &&
        tv.tagName.toLowerCase() === "video" &&
        tv.dataset._volSet == null
      ) {
        tv.dataset._volSet = "1";
        tv.volume = 0.65;
      }
      try {
        tv.load();
      } catch (e) {
        /* ignore */
      }
      await tv.play();
      log("attemptPlay: succeeded");
      return true;
    } catch (err) {
      log("attemptPlay: blocked or failed", err && err.name);
      return false;
    }
  }

  // pause timeline and hide hint
  function pauseTimeline() {
    try {
      tv.pause();
    } catch (e) {}
    if (playHint) playHint.classList.remove("visible");
  }

  // A resume manager produced per blocked attempt. It installs gesture handlers that
  // try to play the timeline again and will remove themselves when that attempt succeeds.
  function makeResumeManager() {
    let active = true;

    async function onGesture() {
      if (!active) return;
      log("resumeManager: user gesture detected, trying play");
      const ok = await attemptPlay();
      if (ok) {
        // video started — cleanup and pause others
        pauseAllExcept(tv);
        cleanup();
      }
      // if still blocked, keep listening (don't auto-remove)
    }

    function add() {
      if (!active) {
        active = true;
      }
      document.addEventListener("click", onGesture, { passive: true });
      document.addEventListener("touchstart", onGesture, { passive: true });
      // also try on focus (some browsers resume when tab regains focus)
      window.addEventListener("focus", onGesture);
      log("resumeManager: handlers added");
    }

    function cleanup() {
      if (!active) return;
      active = false;
      document.removeEventListener("click", onGesture);
      document.removeEventListener("touchstart", onGesture);
      window.removeEventListener("focus", onGesture);
      log("resumeManager: handlers removed");
    }

    // return the manager so caller can remove it explicitly if needed
    return { add, cleanup };
  }

  // we store current resume manager (one at a time). Each blocked attempt creates a fresh manager.
  let currentResume = null;

  // Called when timeline is visible: try to start its video/audio
  async function onVisible() {
    // If video already playing, nothing to do
    if (!tv) return;
    if (!tv.paused && !tv.ended) {
      log("onVisible: already playing");
      return;
    }

    // Always cleanup previous resume manager — we will create a new one below if needed
    if (currentResume) {
      currentResume.cleanup();
      currentResume = null;
    }

    const started = await attemptPlay();
    if (started) {
      // success: hide hint, pause others
      if (playHint) playHint.classList.remove("visible");
      pauseAllExcept(tv);
      return;
    }

    // blocked: show play hint and attach a fresh resume manager
    if (playHint) playHint.classList.add("visible");
    currentResume = makeResumeManager();
    currentResume.add();
  }

  // Called when timeline leaves view
  function onHidden() {
    // pause the timeline; keep any resume handlers so a subsequent visible event can use them
    pauseTimeline();

    // we do NOT remove the resume manager here — because we want a fresh one to be created on next visible
    // however remove any existing as we'll create a new one on the next blocked attempt to avoid stale closures
    if (currentResume) {
      currentResume.cleanup();
      currentResume = null;
    }
  }

  // IntersectionObserver to detect visibility
  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.45) {
            log("IO: timeline visible");
            onVisible();
          } else {
            log("IO: timeline not visible");
            onHidden();
          }
        });
      },
      { threshold: [0, 0.45, 0.9] }
    );

    const elToObserve = timeline; // observe the section itself
    obs.observe(elToObserve);
  } else {
    // fallback on scroll/resize
    function check() {
      const r = timeline.getBoundingClientRect();
      const visible = r.top < window.innerHeight && r.bottom > 0;
      if (visible) onVisible();
      else onHidden();
    }
    window.addEventListener("scroll", throttle(check, 200), { passive: true });
    window.addEventListener("resize", throttle(check, 200));
    // also try on focus in case user switched tabs
    window.addEventListener("focus", check);
    check();
  }

  // clicking the hint tries to play immediately (explicit user gesture)
  if (playHint) {
    playHint.addEventListener("click", async (e) => {
      e.stopPropagation();
      // if a resume manager exists, let it handle the gesture — but also attempt directly
      const ok = await attemptPlay();
      if (ok) {
        if (currentResume) {
          currentResume.cleanup();
          currentResume = null;
        }
        pauseAllExcept(tv);
      } else {
        // still blocked — ensure we have a resume manager active so the next gesture will start it
        if (!currentResume) {
          currentResume = makeResumeManager();
          currentResume.add();
        }
      }
    });
  }

  // When the timeline video enters play state, make sure others are paused
  tv.addEventListener("play", () => {
    pauseAllExcept(tv);
    if (playHint) playHint.classList.remove("visible");
  });

  // When the timeline video is paused by code (not user), we don't force any action.
  // However, when the user explicitly pauses (if you expose controls), we might want to honor that.
  tv.addEventListener("pause", () => {
    // do nothing special here; onVisible will attempt again when section becomes visible
    log("timeline paused");
  });

  // Small throttle helper
  function throttle(fn, wait) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn.apply(this, args);
      }
    };
  }
})();

// ---------- Header video resume manager (drop-in) ----------
(function headerVideoResumeManager() {
  const headerEl = document.querySelector("header");
  const hv = document.querySelector(".madamji-video"); // your header video element
  if (!headerEl || !hv) return;

  // simple helpers
  const isMedia = (el) => el && typeof el.play === "function";
  async function tryPlay(media) {
    if (!isMedia(media)) return false;
    try {
      // polite default volume on first try
      if (
        media.tagName &&
        media.tagName.toLowerCase() === "video" &&
        media.dataset._volSet == null
      ) {
        media.dataset._volSet = "1";
        media.volume = 0.65;
      }
      try {
        media.load();
      } catch (e) {}
      await media.play();
      return true;
    } catch (err) {
      return false;
    }
  }
  function safePause(media) {
    if (isMedia(media)) {
      try {
        media.pause();
      } catch (e) {}
    }
  }

  function pauseAllExcept(exceptEl) {
    document.querySelectorAll("audio, video").forEach((el) => {
      if (el === exceptEl) return;
      try {
        el.pause();
      } catch (e) {}
    });
  }

  // create or get play hint button inside header
  let hint = document.getElementById("header-play-hint");
  if (!hint) {
    hint = document.createElement("button");
    hint.id = "header-play-hint";
    hint.className = "header-play-hint";
    hint.title = "Play header audio";
    hint.textContent = "▶";
    // keep pointer events enabled only on the button (header video is pointer-events none usually)
    hint.style.pointerEvents = "auto";
    headerEl.appendChild(hint);
  }

  // Each blocked attempt gets its own resume manager — removed when that attempt succeeds
  function makeResumeManagerFor(media) {
    let active = true;
    async function onGesture() {
      if (!active) return;
      const ok = await tryPlay(media);
      if (ok) {
        pauseAllExcept(media);
        cleanup();
      }
    }
    function add() {
      if (!active) active = true;
      document.addEventListener("click", onGesture, { passive: true });
      document.addEventListener("touchstart", onGesture, { passive: true });
      window.addEventListener("focus", onGesture);
    }
    function cleanup() {
      if (!active) return;
      active = false;
      document.removeEventListener("click", onGesture);
      document.removeEventListener("touchstart", onGesture);
      window.removeEventListener("focus", onGesture);
    }
    add();
    return { cleanup, onGesture };
  }

  let currentResume = null;

  async function onHeaderVisible() {
    // if already playing, nothing to do
    if (!hv.paused && !hv.ended) return;

    // remove any old resume manager (we'll create a fresh one if needed)
    if (currentResume) {
      currentResume.cleanup();
      currentResume = null;
    }

    const started = await tryPlay(hv);
    if (started) {
      hint.classList.remove("visible");
      pauseAllExcept(hv);
      return;
    }

    // blocked — show hint and create a fresh resume manager for this attempt
    hint.classList.add("visible");
    currentResume = makeResumeManagerFor(hv);
  }

  function onHeaderHidden() {
    // pause header video; remove hint; cleanup resume manager so next visible creates new manager
    safePause(hv);
    hint.classList.remove("visible");
    if (currentResume) {
      currentResume.cleanup();
      currentResume = null;
    }
  }

  // clicking hint tries to play immediately (explicit gesture)
  hint.addEventListener("click", async (e) => {
    e.stopPropagation();
    const ok = await tryPlay(hv);
    if (ok) {
      if (currentResume) {
        currentResume.cleanup();
        currentResume = null;
      }
      hint.classList.remove("visible");
      pauseAllExcept(hv);
    } else {
      // if still blocked ensure resume manager exists
      if (!currentResume) currentResume = makeResumeManagerFor(hv);
    }
  });

  // use IntersectionObserver for visibility
  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.45)
            onHeaderVisible();
          else onHeaderHidden();
        });
      },
      { threshold: [0, 0.45, 0.9] }
    );
    obs.observe(headerEl);
  } else {
    // fallback using scroll/resize
    function check() {
      const r = headerEl.getBoundingClientRect();
      const visible = r.top < window.innerHeight && r.bottom > 0;
      if (visible) onHeaderVisible();
      else onHeaderHidden();
    }
    window.addEventListener("scroll", throttle(check, 200), { passive: true });
    window.addEventListener("resize", throttle(check, 200));
    window.addEventListener("focus", check);
    check();
  }

  hv.addEventListener("play", () => {
    pauseAllExcept(hv);
    hint.classList.remove("visible");
  });

  hv.addEventListener("pause", () => {
    // do nothing — onHeaderVisible will try again next time it becomes visible
  });

  function throttle(fn, wait) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn.apply(this, args);
      }
    };
  }
})();

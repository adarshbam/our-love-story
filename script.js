// small helpers
document.getElementById("year").textContent = new Date().getFullYear();

// ----------------- Fade helpers -----------------
function fadeVolume(media, from, to, duration = 400) {
  return new Promise((resolve) => {
    if (!media || typeof media.volume !== "number") return resolve();
    const start = performance.now();
    media.volume = Math.max(0, Math.min(1, from));
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      media.volume = from + (to - from) * t;
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

async function fadeInAndPlay(media, targetVolume = 0.65, duration = 400) {
  if (!media) return false;
  try {
    // set volume to 0 before play to allow audible autoplay in some browsers after gesture
    media.volume = 0;
    try {
      media.load();
    } catch (e) {}
    await media.play();
    // fade up to target
    await fadeVolume(media, 0, targetVolume, duration);
    return true;
  } catch (e) {
    return false;
  }
}

async function fadeOutAndPause(media, duration = 300) {
  if (!media) return;
  try {
    // if already paused, ensure volume is restored to stored value and return
    if (media.paused || media.ended) {
      // optionally restore default volume property if you stored one
      return;
    }
    const current = typeof media.volume === "number" ? media.volume : 0.6;
    await fadeVolume(media, current, 0, duration);
    try {
      media.pause();
    } catch (e) {}
    // restore default volume for future plays (optional)
    media.volume = current;
  } catch (e) {
    try {
      media.pause();
    } catch (_) {}
  }
}

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
// ------- Timeline video manager with fades -------
(function timelineVideoManager_withFade() {
  const timeline = document.getElementById("timeline");
  const tv = document.getElementById("timeline-video");
  const playHint = document.getElementById("timeline-play-hint");
  if (!timeline || !tv) return;

  let currentResume = null;

  function pauseAllExcept(exceptEl) {
    document.querySelectorAll("audio, video").forEach((el) => {
      if (el === exceptEl) return;
      try {
        el.pause();
      } catch (e) {}
    });
  }

  function makeResumeManager(media) {
    let active = true;
    async function onGesture() {
      if (!active) return;
      const ok = await fadeInAndPlay(media, 0.65, 400);
      if (ok) {
        pauseAllExcept(media);
        cleanup();
      }
    }
    function add() {
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
    return { cleanup };
  }

  async function tryStartTimeline() {
    if (!tv.paused && !tv.ended) return;
    if (currentResume) {
      currentResume.cleanup();
      currentResume = null;
    }
    const ok = await fadeInAndPlay(tv, 0.65, 400);
    if (ok) {
      pauseAllExcept(tv);
      if (playHint) playHint.classList.remove("visible");
      return true;
    }
    if (playHint) playHint.classList.add("visible");
    currentResume = makeResumeManager(tv);
    return false;
  }

  async function stopTimeline() {
    await fadeOutAndPause(tv, 300);
    if (playHint) playHint.classList.remove("visible");
    if (currentResume) {
      currentResume.cleanup();
      currentResume = null;
    }
  }

  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.45)
            tryStartTimeline();
          else stopTimeline();
        });
      },
      { threshold: [0, 0.45, 0.9] }
    );
    obs.observe(timeline);
  } else {
    function check() {
      const r = timeline.getBoundingClientRect();
      r.top < window.innerHeight && r.bottom > 0
        ? tryStartTimeline()
        : stopTimeline();
    }
    window.addEventListener("scroll", throttle(check, 200), { passive: true });
    window.addEventListener("resize", throttle(check, 200));
    window.addEventListener("focus", check);
    check();
  }

  if (playHint) {
    playHint.addEventListener("click", async (e) => {
      e.stopPropagation();
      const ok = await fadeInAndPlay(tv, 0.65, 400);
      if (ok) {
        if (currentResume) {
          currentResume.cleanup();
          currentResume = null;
        }
        pauseAllExcept(tv);
      } else {
        if (!currentResume) {
          currentResume = makeResumeManager(tv);
        }
      }
    });
  }

  tv.addEventListener("play", () => pauseAllExcept(tv));
  tv.addEventListener("pause", () => {
    /* no-op */
  });

  function throttle(fn, wait) {
    let last = 0;
    return function (...a) {
      const now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn.apply(this, a);
      }
    };
  }
})();

// ------- Header video manager with fades -------
(function headerVideoManager_withFade() {
  const headerEl = document.querySelector("header");
  const hv = document.querySelector(".madamji-video"); // header video element
  if (!headerEl || !hv) return;

  let currentResume = null;

  function pauseAllExcept(exceptEl) {
    document.querySelectorAll("audio, video").forEach((el) => {
      if (el === exceptEl) return;
      try {
        el.pause();
      } catch (e) {}
    });
  }

  function makeResumeManager(media) {
    let active = true;
    async function onGesture() {
      if (!active) return;
      const ok = await fadeInAndPlay(media, 0.65, 400);
      if (ok) {
        pauseAllExcept(media);
        cleanup();
      }
    }
    function add() {
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
    return { cleanup };
  }

  async function tryStartHeader() {
    // try play with fade
    if (!hv.paused && !hv.ended) return;
    if (currentResume) {
      currentResume.cleanup();
      currentResume = null;
    }
    const ok = await fadeInAndPlay(hv, 0.65, 400);
    if (ok) {
      pauseAllExcept(hv);
      // hide hint if you have one
      const hint = document.getElementById("header-play-hint");
      if (hint) hint.classList.remove("visible");
      return true;
    }
    // blocked: make fresh resume manager and show hint
    if (currentResume) {
      currentResume.cleanup();
      currentResume = null;
    }
    currentResume = makeResumeManager(hv);
    const hint = document.getElementById("header-play-hint");
    if (hint) hint.classList.add("visible");
    return false;
  }

  async function stopHeader() {
    // fade out then pause
    await fadeOutAndPause(hv, 300);
    const hint = document.getElementById("header-play-hint");
    if (hint) hint.classList.remove("visible");
    if (currentResume) {
      currentResume.cleanup();
      currentResume = null;
    }
  }

  // observe visibility
  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.45)
            tryStartHeader();
          else stopHeader();
        });
      },
      { threshold: [0, 0.45, 0.9] }
    );
    obs.observe(headerEl);
  } else {
    function check() {
      const r = headerEl.getBoundingClientRect();
      r.top < window.innerHeight && r.bottom > 0
        ? tryStartHeader()
        : stopHeader();
    }
    window.addEventListener("scroll", throttle(check, 200), { passive: true });
    window.addEventListener("resize", throttle(check, 200));
    window.addEventListener("focus", check);
    check();
  }

  // ensure when user manually plays header we pause others
  hv.addEventListener("play", () => pauseAllExcept(hv));
  hv.addEventListener("pause", () => {
    /* nothing special — resumed later */
  });

  function throttle(fn, wait) {
    let last = 0;
    return function (...a) {
      const now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn.apply(this, a);
      }
    };
  }
})();

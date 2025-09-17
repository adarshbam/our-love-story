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

// Timeline video manager — plays audio only when timeline is visible
(function timelineVideoManager() {
  const timeline = document.getElementById("timeline");
  const tv = document.getElementById("timeline-video"); // timeline video element
  const playHint = document.getElementById("timeline-play-hint");

  if (!timeline || !tv) return;

  // helper: pause every other audio/video element except `exceptEl`
  function pauseAllExcept(exceptEl) {
    document.querySelectorAll("audio, video").forEach((el) => {
      if (el === exceptEl) return;
      try {
        el.pause();
      } catch (e) {}
    });
  }

  // Try to play the timeline video; returns true/false for success
  async function tryPlayTimeline() {
    try {
      // polite volume for timeline audio
      if (
        tv.tagName &&
        tv.tagName.toLowerCase() === "video" &&
        tv.dataset._volSet == null
      ) {
        tv.dataset._volSet = "1";
        tv.volume = 0.65;
      }
      // calling load helps with a few browser edge cases
      try {
        tv.load();
      } catch (e) {}
      await tv.play();
      // succeeded — hide play hint and pause others
      if (playHint) playHint.classList.remove("visible");
      pauseAllExcept(tv);
      return true;
    } catch (err) {
      // autoplay blocked — show play hint and attach a one-time resume on gesture
      if (playHint) playHint.classList.add("visible");
      const resume = async () => {
        const ok = await tryPlayTimeline();
        if (ok) {
          document.removeEventListener("click", resume);
          document.removeEventListener("touchstart", resume);
        }
      };
      // attach once; attempts will be retried each time section becomes visible
      document.addEventListener("click", resume, { passive: true, once: true });
      document.addEventListener("touchstart", resume, {
        passive: true,
        once: true,
      });
      return false;
    }
  }

  // Pause timeline video and remove visible hint
  function pauseTimeline() {
    try {
      tv.pause();
    } catch (e) {}
    if (playHint) playHint.classList.remove("visible");
  }

  // Observe visibility of timeline section
  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.45) {
            // timeline visible: play timeline video (with audio)
            tryPlayTimeline();
          } else {
            // timeline not visible: pause timeline video and allow other media to play
            pauseTimeline();
          }
        });
      },
      { threshold: [0, 0.45, 0.9] }
    );
    obs.observe(timeline);
  } else {
    // fallback: on scroll/resize check bounding rect
    function check() {
      const r = timeline.getBoundingClientRect();
      const visible = r.top < window.innerHeight && r.bottom > 0;
      if (visible) tryPlayTimeline();
      else pauseTimeline();
    }
    window.addEventListener("scroll", throttle(check, 200), { passive: true });
    window.addEventListener("resize", throttle(check, 200));
    check();
  }

  // clicking the play hint should start the video immediately (explicit user gesture)
  if (playHint) {
    playHint.addEventListener("click", async (e) => {
      e.stopPropagation();
      const ok = await tryPlayTimeline();
      if (!ok) {
        // still blocked — keep the hint visible (user must interact)
      }
    });
  }

  // When timeline video starts, pause other media (defense-in-depth)
  tv.addEventListener("play", () => pauseAllExcept(tv));
  tv.addEventListener("pause", () => {
    /* nothing extra needed */
  });

  // small throttle helper
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

(() => {
  "use strict";

  const CYCLE_MS = 32000;
  const RESTART_GRACE_MS = 250;
  const track = document.querySelector(".supporter-strip-track");
  if (!track) return;

  let fallbackTimer = 0;

  function startCycle() {
    window.clearTimeout(fallbackTimer);
    track.classList.remove("supporter-strip-track-running");
    void track.offsetWidth;
    track.classList.add("supporter-strip-track-running");
    fallbackTimer = window.setTimeout(startCycle, CYCLE_MS + RESTART_GRACE_MS);
  }

  track.addEventListener("animationend", (event) => {
    if (event.animationName === "supporter-strip-scroll") startCycle();
  });

  startCycle();
})();

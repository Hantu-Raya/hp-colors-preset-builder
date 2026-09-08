(() => {
  "use strict";

  const SPEED_PX_PER_SECOND = 36;
  const THANKS_HOLD_MS = 3000;
  const track = document.querySelector(".supporter-strip-track");
  if (!track) return;

  const cycle = track.querySelector(".supporter-strip-cycle");
  if (!cycle) return;
  const thanks = cycle.querySelector(".supporter-strip-thanks");
  if (!thanks) return;
  let animation = null;
  let measuredWidth = 0;
  let measuredViewport = 0;

  function measure() {
    const cycleBox = cycle.getBoundingClientRect();
    const width = cycleBox.width;
    const viewport = track.parentElement.clientWidth;
    if (!width || !viewport) return;
    if (width === measuredWidth && viewport === measuredViewport) return;
    measuredWidth = width;
    measuredViewport = viewport;
    const copies = Math.ceil(viewport / width) + 1;
    while (track.children.length < copies) {
      const duplicate = cycle.cloneNode(true);
      duplicate.dataset.cycle = "duplicate";
      track.appendChild(duplicate);
    }
    while (track.children.length > copies) track.lastElementChild.remove();
    const thanksBox = thanks.getBoundingClientRect();
    const holdDistance = thanksBox.left - cycleBox.left + (thanksBox.width - viewport) / 2;
    const holdStart = holdDistance / SPEED_PX_PER_SECOND * 1000;
    const duration = width / SPEED_PX_PER_SECOND * 1000 + THANKS_HOLD_MS;
    if (animation) animation.cancel();
    animation = null;
    const centered = `translate3d(${-holdDistance}px, 0, 0)`;
    animation = track.animate([
      { transform: "translate3d(0, 0, 0)", offset: 0 },
      { transform: centered, offset: holdStart / duration },
      { transform: centered, offset: (holdStart + THANKS_HOLD_MS) / duration },
      { transform: `translate3d(${-width}px, 0, 0)`, offset: 1 }
    ], { duration, iterations: Infinity, easing: "linear" });
  }

  measure();
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(measure);
    observer.observe(cycle);
    observer.observe(track.parentElement);
  } else {
    window.addEventListener("resize", measure);
  }
})();

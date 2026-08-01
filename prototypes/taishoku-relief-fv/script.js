const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-cta]").forEach((cta) => {
    cta.addEventListener("click", () => {
      window.dispatchEvent(
        new CustomEvent("retirement-relief:cta-click", {
          detail: { placement: cta.dataset.cta, reducedMotion: reduceMotion },
        }),
      );
    });
  });
});

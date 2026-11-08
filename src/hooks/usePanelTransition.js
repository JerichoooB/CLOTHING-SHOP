import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";

const timing = {
  duration: 560,
  easing: "cubic-bezier(.22, 1, .36, 1)",
  fill: "both",
};

// Animate the existing dialog into its next layout, rather than adding a
// loading screen between the two. Keep a WAAPI fallback for older browsers.
export default function usePanelTransition() {
  const stageRef = useRef(null);
  const mounted = useRef(true);
  const running = useRef(false);
  const cancelRef = useRef(() => {});
  useEffect(() => {
    mounted.current = true;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => cancelRef.current();
    const motionChanged = () => {
      if (media.matches) stop();
    };
    window.addEventListener("resize", stop);
    media.addEventListener("change", motionChanged);
    return () => {
      mounted.current = false;
      window.removeEventListener("resize", stop);
      media.removeEventListener("change", motionChanged);
      stop();
    };
  }, []);

  async function change(update) {
    if (!mounted.current || running.current) return;
    const stage = stageRef.current;
    const dialog = stage?.closest(".modal");
    const focusHeading = () => {
      if (!mounted.current) return;
      const heading = stageRef.current?.querySelector("h2");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: true });
    };
    if (
      !dialog ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      flushSync(update);
      if (dialog) dialog.scrollTop = 0;
      focusHeading();
      return;
    }

    running.current = true;
    // A fast click can arrive during the dialog's opening animation. Capture
    // its fully visible state rather than a partially transparent frame.
    for (const element of [dialog.parentElement, dialog]) {
      element.getAnimations().forEach((animation) => animation.finish());
    }
    stage.inert = true;
    stage.setAttribute("aria-busy", "true");
    // Focus remains in the dialog while the outgoing form becomes inactive.
    dialog.querySelector(".close")?.focus({ preventScroll: true });
    let committed = false;
    const commit = () => {
      if (committed) return;
      committed = true;
      // The server has already authenticated the request. Apply its result
      // exactly once even if the dialog closes before the visual update runs.
      flushSync(update);
      if (dialog.isConnected) dialog.scrollTop = 0;
    };
    let cleanup = () => {};
    try {
      if (document.startViewTransition) {
        const transition = document.startViewTransition(commit);
        // Closing the modal can skip the visual transition before it is ready.
        // That is expected and must not become an unhandled rejection.
        transition.ready.catch(() => {});
        cancelRef.current = () => transition.skipTransition();
        await transition.finished;
      } else {
        // Retain an inert visual copy while the live dialog changes size.
        const before = dialog.getBoundingClientRect();
        const snapshot = dialog.cloneNode(true);
        snapshot.removeAttribute("role");
        snapshot.removeAttribute("aria-modal");
        snapshot.setAttribute("aria-hidden", "true");
        snapshot.inert = true;
        snapshot.className = "modal account-transition-snapshot";
        snapshot
          .querySelectorAll("[id]")
          .forEach((node) => node.removeAttribute("id"));
        Object.assign(snapshot.style, {
          position: "fixed",
          left: `${before.left}px`,
          top: `${before.top}px`,
          width: `${before.width}px`,
          height: `${before.height}px`,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: "101",
          maxHeight: "none",
          padding: "0",
          animation: "none",
          viewTransitionName: "none",
        });
        document.body.append(snapshot);
        snapshot.scrollTop = dialog.scrollTop;
        commit();
        const after = dialog.getBoundingClientRect();
        const originalOverflow = dialog.style.overflow;
        dialog.style.overflow = "hidden";
        const animations = [
          snapshot.animate(
            [
              { opacity: 1, transform: "translateX(0)" },
              { opacity: 0, transform: "translateX(-24px)" },
            ],
            { ...timing, duration: 260 },
          ),
          dialog.animate(
            [
              { width: `${before.width}px`, height: `${before.height}px` },
              { width: `${after.width}px`, height: `${after.height}px` },
            ],
            timing,
          ),
          stage.animate(
            [
              { opacity: 0, transform: "translateX(24px)" },
              { opacity: 1, transform: "translateX(0)" },
            ],
            { ...timing, delay: 80, duration: 480 },
          ),
        ];
        cleanup = () => {
          animations.forEach((animation) => animation.cancel());
          snapshot.remove();
          dialog.style.overflow = originalOverflow;
        };
        cancelRef.current = cleanup;
        await Promise.allSettled(
          animations.map((animation) => animation.finished),
        );
      }
    } catch {
      // An unsupported/skipped visual effect must never fail a valid login.
      commit();
    } finally {
      commit();
      cleanup();
      cancelRef.current = () => {};
      running.current = false;
      stage.inert = false;
      stage.removeAttribute("aria-busy");
      focusHeading();
    }
  }
  return { stageRef, change, mounted };
}

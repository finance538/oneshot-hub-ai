import { useEffect } from "react";

export function useStudioReveal(path: string) {
  useEffect(() => {
    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const elements = document.querySelectorAll<HTMLElement>(
      ".store-section, .store-highlights, .store-document",
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08 },
    );
    for (const element of elements) {
      element.classList.add("studio-reveal");
      observer.observe(element);
    }
    return () => {
      observer.disconnect();
      for (const element of elements)
        element.classList.remove("studio-reveal", "is-revealed");
    };
  }, [path]);
}

"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/components/ui/icons";

// Toggles the `light` class on <html> and persists the choice. The initial
// theme is applied pre-paint by an inline script in the root layout, so this
// only mirrors and updates it.
export function ThemeToggle() {
  const [state, setState] = useState({ mounted: false, light: false });
  const { mounted, light } = state;

  useEffect(() => {
    // Reading the theme class is a browser-only external sync done once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({
      mounted: true,
      light: document.documentElement.classList.contains("light"),
    });
  }, []);

  function toggle() {
    const next = !light;
    setState({ mounted: true, light: next });
    const root = document.documentElement;
    root.classList.toggle("light", next);
    root.style.colorScheme = next ? "light" : "dark";
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {}
  }

  const Icon = light ? Icons.moon : Icons.sun;

  return (
    <button
      onClick={toggle}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
    >
      {/* avoid a mismatched icon flash before mount */}
      {mounted ? <Icon size={16} /> : <span className="h-4 w-4" />}
    </button>
  );
}

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("branding-ops-theme", theme);
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("branding-ops-theme") as Theme | null;
    const preferred: Theme = saved ?? "light";
    setTheme(preferred);
    applyTheme(preferred);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`theme-toggle inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[var(--role-border)] hover:text-[var(--role-accent)] ${compact ? "h-10 w-10" : "h-10 gap-2 px-3"}`}
      aria-label={theme === "dark" ? "Gunakan mode terang" : "Gunakan mode gelap"}
      title={theme === "dark" ? "Mode terang" : "Mode gelap"}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      {!compact && <span className="hidden text-sm font-semibold sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>}
    </button>
  );
}

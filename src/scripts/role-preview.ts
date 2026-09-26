const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  pic: "PIC",
  client: "Klien",
};

const VALID_ROLES = Object.keys(ROLE_LABELS);

function getRoleFromUrl() {
  const role = new URLSearchParams(window.location.search).get("role");
  return role && VALID_ROLES.includes(role) ? role : "super_admin";
}

function setText(id: string, value: string) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function applyRole(role: string, updateUrl = false) {
  if (!VALID_ROLES.includes(role)) role = "super_admin";

  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set("role", role);
    window.history.replaceState({}, "", url);
  }

  const label = ROLE_LABELS[role] ?? "Super Admin";
  setText("desktop-role-label", label);
  setText("mobile-role-label", label);
  setText("topbar-role-label", label);

  document.querySelectorAll<HTMLElement>("[data-role-nav]").forEach((node) => {
    const roles = (node.dataset.roles ?? "").split(",");
    node.classList.toggle("hidden", !roles.includes(role));
  });

  document.querySelectorAll<HTMLElement>("[data-role-panel]").forEach((node) => {
    const roles = (node.dataset.rolePanel ?? "").split(",");
    node.classList.toggle("hidden", !roles.includes(role));
  });

  document.querySelectorAll<HTMLButtonElement>("[data-role-button]").forEach((button) => {
    const active = button.dataset.roleButton === role;
    button.classList.toggle("bg-[#1565EF]", active);
    button.classList.toggle("border-[#1565EF]", active);
    button.classList.toggle("text-white", active);

    button.classList.toggle("bg-white", !active);
    button.classList.toggle("border-[#BEE6FF]", !active);
    button.classList.toggle("text-slate-500", !active);
  });

  setText("primary-chart-title", role === "pic" ? "Pekerjaan per Stockpoint" : "Pekerjaan per Branch");
  setText("recent-title", role === "pic" ? "Pekerjaan Saya Terbaru" : "Pekerjaan Terbaru");

  document.documentElement.dataset.previewRole = role;

  // keep role in app links
  document.querySelectorAll<HTMLAnchorElement>('a[href^="/app/"]').forEach((link) => {
    const url = new URL(link.href, window.location.origin);
    url.searchParams.set("role", role);
    link.href = url.pathname + url.search;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applyRole(getRoleFromUrl());

  // One delegated click handler prevents Astro partial/static quirks.
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>("[data-role-button]");
    if (!button) return;
    event.preventDefault();
    const role = button.dataset.roleButton;
    if (role) applyRole(role, true);
  });
});

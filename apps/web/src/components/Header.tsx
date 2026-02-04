"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Inicio" },
  { href: "/calendario", label: "Calendario" },
  { href: "/plan", label: "Plan" },
  { href: "/estadisticas", label: "Estadísticas" },
];

export default function Header() {
  const pathname = usePathname();
  return (
    <header
      className="rounded-xl px-4 py-2"
      style={{
        background:
          "linear-gradient(90deg, rgba(123,108,255,0.12), rgba(136,201,255,0.10))",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
      }}
    >
      <nav className="flex gap-2">
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className="nav-link"
              data-active={active ? "true" : "false"}
              aria-current={active ? "page" : undefined}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

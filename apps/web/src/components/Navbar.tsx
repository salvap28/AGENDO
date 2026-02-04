"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/calendario", label: "Calendario" },
  { href: "/plan", label: "Plan" },
  { href: "/estadisticas", label: "Estadísticas" },
];

export default function Navbar() {
  const path = usePathname();

  return (
    <nav className="navbar w-full panel px-3 py-2">
      <ul className="flex items-center gap-2">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? path === "/"
              : path.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="nav-link"
                data-active={active ? "true" : "false"}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

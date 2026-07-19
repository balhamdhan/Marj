"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const navItems = [
     { label: "Finances", href: "/finances" },
     { label: "Operations", href: "/operations" },
     // Forecast will be added in the next build step
   ];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-[220px] bg-surface border-r border-border p-5 flex flex-col min-h-screen">
      <div className="font-display text-2xl font-semibold text-ivory mb-1">Marj</div>
      <div className="text-xs text-muted mono-num mb-9">YOUR COMPANY</div>

      <nav className="flex-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2.5 rounded text-sm mb-1 transition-colors ${
                active
                  ? "bg-brass text-ink font-semibold"
                  : "text-muted hover:text-ivory hover:bg-surface2"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="text-muted text-sm text-left hover:text-ivory pt-4 border-t border-border"
      >
        Log out
      </button>
    </aside>
  );
}

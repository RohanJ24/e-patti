"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "@/lib/api";
import { Button, cn } from "./ui";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/games", label: "My games" },
  { href: "/profile", label: "Profile" }
];

function isTopLevel(pathname: string): boolean {
  return pathname === "/dashboard" || pathname === "/games" || pathname === "/profile";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api
      .me()
      .then((res) => setName(res.user.fullName))
      .catch(() => {
        setToken(null);
        router.replace("/login");
      });
  }, [router]);

  async function logout() {
    try {
      await api.logout();
    } catch {
      // client still clears the token
    }
    setToken(null);
    router.replace("/login");
  }

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className={cn("bg-forest-950 text-cream-100 lg:sticky lg:top-0 lg:h-screen lg:p-6", open ? "block p-6" : "hidden lg:block")}>
        <Link href="/dashboard" className="font-display text-2xl text-gold-400">
          E-Patti
        </Link>
        <p className="mt-1 text-xs text-cream-200/70">Score tracking only</p>
        <nav className="mt-8 flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                pathname === link.href ? "bg-forest-800 text-gold-300" : "hover:bg-forest-900"
              )}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div>
        <header className="flex items-center justify-between border-b border-cream-200 bg-white px-4 py-3 lg:px-8">
          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-cream-200 px-3 py-1 text-sm lg:hidden" onClick={() => setOpen((v) => !v)}>
              Menu
            </button>
            {!isTopLevel(pathname) ? (
              <button
                type="button"
                onClick={goBack}
                className="rounded-lg border border-cream-200 px-3 py-1 text-sm font-semibold text-forest-900"
              >
                Back
              </button>
            ) : null}
          </div>
          <p className="text-sm text-slate-600">{name ? `Signed in as ${name}` : "Loading profile…"}</p>
          <Button variant="ghost" onClick={logout}>
            Log out
          </Button>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

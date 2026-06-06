"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/lesson", label: "Learn", icon: "📖" },
  { href: "/quiz", label: "Quizzes", icon: "📝" },
  { href: "/library", label: "Library", icon: "📚" },
  { href: "/profile", label: "Profile", icon: "⚙️" }
];

export function AppNav({ name }: { name: string }) {
  const pathname = usePathname();

  return (
    <aside className="no-print lg:w-60 lg:shrink-0">
      <div className="lg:sticky lg:top-0 lg:h-screen flex flex-col gap-4 p-4 lg:py-6 bg-white border-b lg:border-b-0 lg:border-r border-slate-200">
        <Link href="/dashboard" className="px-2 font-bold text-lg text-brand-700">
          meTheTeacher
        </Link>

        <nav className="flex lg:flex-col gap-1 overflow-x-auto">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span aria-hidden>{l.icon}</span>
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="lg:mt-auto px-2 hidden lg:block">
          <p className="text-xs text-slate-500 truncate">Signed in as</p>
          <p className="text-sm font-medium text-slate-800 truncate">{name}</p>
          <form action={signOut}>
            <button
              type="submit"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

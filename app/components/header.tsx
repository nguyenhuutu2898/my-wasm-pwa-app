"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signIn, signOut, useSession } from "next-auth/react"

const navigation = [
  { href: "/google-sheet", label: "Bảng tính" },
  { href: "/google-sheet/raw", label: "Dữ liệu thô", disabled: true },
]

export default function Header() {
  const pathname = usePathname()
  const { data: session, status } = useSession()

  const initials = useMemo(() => {
    if (!session?.user?.name) return "?"
    return session.user.name
      .split(" ")
      .map((part) => part[0]?.toUpperCase())
      .join("")
      .slice(0, 2)
  }, [session?.user?.name])

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold text-indigo-700"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold">
            GS
          </span>
          <span>Google Sheet Hub</span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {navigation.map((item) => {
            const isActive = pathname?.startsWith(item.href) ?? false
            return (
              <span key={item.href}>
                {item.disabled ? (
                  <span className="cursor-not-allowed rounded-full px-3 py-1 text-sm text-slate-400">
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className={`rounded-full px-3 py-1 text-sm transition ${
                      isActive
                        ? "bg-indigo-600 text-white shadow"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                )}
              </span>
            )
          })}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {status === "loading" ? (
            <span className="text-slate-500">Đang tải…</span>
          ) : session ? (
            <>
              <div className="hidden text-right md:block">
                <p className="text-sm font-semibold text-slate-700">
                  {session.user?.name}
                </p>
                <p className="text-xs text-slate-500">{session.user?.email}</p>
              </div>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white md:hidden">
                {initials}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-full bg-slate-900 px-4 py-2 font-medium text-white shadow hover:bg-slate-700"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn("google", { callbackUrl: "/google-sheet" })}
              className="rounded-full bg-indigo-600 px-4 py-2 font-medium text-white shadow hover:bg-indigo-500"
            >
              Đăng nhập Google
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

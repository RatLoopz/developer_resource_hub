"use client"

import Link from "next/link"
import { UserMenu } from "@/components/auth/user-menu"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-105">
          <div className="size-8 rounded-xl bg-gradient-to-tr from-neutral-900 to-neutral-700 text-white grid place-items-center text-sm font-bold shadow-sm">
            {"AI"}
          </div>
          <span className="font-bold tracking-tight bg-gradient-to-r from-neutral-900 to-neutral-600 bg-clip-text text-transparent">{"Links Hub"}</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link className="text-neutral-600 transition-colors hover:text-black relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-black after:transition-transform after:duration-300 hover:after:origin-bottom-left hover:after:scale-x-100" href="/">
            {"Home"}
          </Link>
          <Link className="text-neutral-600 transition-colors hover:text-black relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-black after:transition-transform after:duration-300 hover:after:origin-bottom-left hover:after:scale-x-100" href="/reels">
            {"Reels Vault"}
          </Link>
          <div className="pl-2 border-l border-neutral-200">
            <UserMenu />
          </div>
        </nav>
      </div>
    </header>
  )
}

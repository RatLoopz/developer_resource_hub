"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, User, Mail, Shield, LogOut, CheckCircle2, AlertCircle } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push("/auth/login"); return }
        setUser(user)
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
        if (data) { setProfile(data); setFullName(data.full_name || "") }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    getUser()
  }, [supabase, router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setStatus(null)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq("id", user.id)
      if (error) throw error
      setStatus({ type: "success", msg: "Profile updated." })
    } catch (err: any) {
      setStatus({ type: "error", msg: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <SiteHeader />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
        </div>
      </main>
    )
  }

  const initials = (fullName || user?.email || "U")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <main className="min-h-screen bg-white">
      <SiteHeader />

      <section className="mx-auto max-w-2xl px-6 py-12">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-sm font-semibold text-neutral-950 tracking-widest uppercase">Account</h1>
            <p className="text-sm text-neutral-400 mt-0.5">Manage your profile information</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="h-8 px-3 text-xs text-neutral-500 hover:text-red-600 hover:bg-red-50 gap-1.5"
          >
            <LogOut className="size-3" />
            Sign out
          </Button>
        </div>

        {/* Avatar + identity */}
        <div className="flex items-center gap-5 mb-10 pb-10 border-b border-neutral-100">
          <div className="size-16 rounded-2xl bg-neutral-950 text-white flex items-center justify-center text-xl font-semibold tracking-tight select-none">
            {initials}
          </div>
          <div>
            <p className="text-base font-semibold text-neutral-900">{fullName || "No name set"}</p>
            <p className="text-sm text-neutral-400 mt-0.5">{user?.email}</p>
            <span className={`inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${
              profile?.role === "admin"
                ? "bg-amber-50 text-amber-700"
                : "bg-neutral-100 text-neutral-500"
            }`}>
              <Shield className="size-2.5" />
              {profile?.role === "admin" ? "Admin" : "Member"}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5 uppercase tracking-wide">
              Display Name
            </label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={saving}
              placeholder="Your name"
              className="h-9 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5 uppercase tracking-wide">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-neutral-300 pointer-events-none" />
              <Input
                type="email"
                value={user?.email}
                disabled
                className="h-9 rounded-md text-sm pl-8 bg-neutral-50 text-neutral-400 cursor-not-allowed"
              />
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">Email cannot be changed.</p>
          </div>

          {/* Status message */}
          {status && (
            <div className={`flex items-center gap-2 text-xs px-3 py-2.5 rounded-lg ${
              status.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}>
              {status.type === "success"
                ? <CheckCircle2 className="size-3.5 shrink-0" />
                : <AlertCircle className="size-3.5 shrink-0" />
              }
              {status.msg}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={saving}
              size="sm"
              className="h-8 px-5 rounded-md text-xs font-medium bg-neutral-950 text-white hover:bg-neutral-800"
            >
              {saving ? <><Loader2 className="size-3 mr-1.5 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          </div>
        </form>

        {/* Danger zone */}
        {profile?.role === "admin" && (
          <div className="mt-12 pt-8 border-t border-neutral-100">
            <p className="text-xs font-medium text-neutral-950 uppercase tracking-widest mb-3">Admin Tools</p>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-4 text-xs rounded-md text-neutral-600 border-neutral-200 hover:bg-neutral-50"
              onClick={() => router.push("/admin")}
            >
              Go to Admin Panel →
            </Button>
          </div>
        )}
      </section>
    </main>
  )
}

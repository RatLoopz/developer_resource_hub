"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { SiteHeader } from "@/components/site-header"
import { LinksProvider } from "@/components/links/links-provider"
import { LinksGrid } from "@/components/links/links-grid"
import { FiltersBar } from "@/components/filters-bar"
import { Button } from "@/components/ui/button"
import { Loader2, Plus } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error("Error fetching user:", error)
      } finally {
        setLoading(false)
      }
    }
    getUser()
  }, [supabase])

  return (
    <main className="min-h-screen bg-white">
      <SiteHeader />

      <LinksProvider>
        <section className="mx-auto max-w-7xl px-6 py-10">

          {/* Page header row */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-sm font-semibold text-neutral-950 tracking-widest uppercase">
                AI Resources
              </h1>
              <p className="text-sm text-neutral-400 mt-0.5">
                Curated tools and links for developers
              </p>
            </div>
            {user && (
              <Button
                onClick={() => router.push("/submit-link")}
                size="sm"
                className="h-8 px-4 rounded-md text-xs font-medium bg-neutral-950 text-white hover:bg-neutral-800 gap-1.5"
              >
                <Plus className="size-3" />
                Submit
              </Button>
            )}
          </div>

          <FiltersBar />

          <div className="mt-8">
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
              </div>
            ) : (
              <LinksGrid />
            )}
          </div>
        </section>
      </LinksProvider>
    </main>
  )
}

"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Play, Plus, Trash2 } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Reel = {
  id: string;
  original_url: string;
  thumbnail_url: string | null;
  title: string | null;
  notes: string | null;
  user_id: string;
  created_at: string;
};

export default function ReelsPage() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [meta, setMeta] = useState<{
    title: string;
    thumbnail_url: string;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    fetchSession();
    fetchReels();
  }, []);

  const fetchSession = async () => {
    // ✅ getUser() verifies with the Supabase server — never reads stale cache.
    // getSession() was the bug: it reads from cookie/localStorage before hydration,
    // returning null even when the user IS logged in → userId stayed null →
    // delete button never rendered (userId === reel.user_id was always false).
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const fetchReels = async () => {
    // Public fetch — no user filter, all reels visible
    const { data } = await supabase
      .from("reels")
      .select(
        "id, original_url, thumbnail_url, title, notes, user_id, created_at",
      )
      .order("created_at", { ascending: false });
    if (data) setReels(data);
  };

  const handleUrlBlur = async () => {
    if (!url) return;
    setFetchingMeta(true);
    try {
      const res = await fetch("/api/reels/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.thumbnail_url) {
        setMeta({ title: data.title, thumbnail_url: data.thumbnail_url });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingMeta(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !userId) return;
    setLoading(true);

    let finalMeta = meta;
    if (!finalMeta) {
      const res = await fetch("/api/reels/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.thumbnail_url) {
        finalMeta = { title: data.title, thumbnail_url: data.thumbnail_url };
      }
    }

    const { error } = await supabase.from("reels").insert({
      user_id: userId,
      original_url: url,
      thumbnail_url: finalMeta?.thumbnail_url ?? null,
      title: finalMeta?.title ?? "Saved Reel",
      notes: notes || null,
    });

    if (!error) {
      setOpen(false);
      setUrl("");
      setNotes("");
      setMeta(null);
      fetchReels();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this reel?")) return;
    try {
      const { error } = await supabase.from("reels").delete().eq("id", id);
      if (error) throw error;
      setReels(reels.filter((r) => r.id !== id));
    } catch (e: any) {
      alert("Error deleting reel: " + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* Page header row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-sm font-semibold text-neutral-950 tracking-widest uppercase">
              Reels Vault
            </h1>
            <p className="text-sm text-neutral-400 mt-0.5">
              {reels.length} reel{reels.length !== 1 ? "s" : ""} saved — click
              to watch on Instagram
            </p>
          </div>

          {/* Only logged-in users can save */}
          {userId ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="h-8 px-4 rounded-md text-xs font-medium bg-neutral-950 text-white hover:bg-neutral-800 gap-1.5"
                >
                  <Plus className="size-3" />
                  Save Reel
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Save a Reel</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    placeholder="Paste Instagram Reel link..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onBlur={handleUrlBlur}
                    required
                  />

                  {fetchingMeta && (
                    <p className="text-xs text-neutral-400 animate-pulse">
                      Fetching preview...
                    </p>
                  )}

                  {meta?.thumbnail_url && (
                    <div className="relative h-40 w-full overflow-hidden rounded-lg border border-neutral-200">
                      <img
                        src={meta.thumbnail_url}
                        alt="preview"
                        className="object-cover w-full h-full opacity-80"
                      />
                      <div className="absolute inset-0 grid place-items-center bg-black/20">
                        <Play className="text-white size-8" />
                      </div>
                    </div>
                  )}

                  <Textarea
                    placeholder="Optional note — why are you saving this?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />

                  <Button
                    type="submit"
                    className="w-full h-9 rounded-md text-sm font-medium"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save to Vault"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : (
            <p className="text-xs text-neutral-400">
              <a
                href="/auth/login"
                className="underline underline-offset-2 hover:text-neutral-700"
              >
                Log in
              </a>{" "}
              to save reels
            </p>
          )}
        </div>

        {/* REELS GRID */}
        {reels.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-neutral-200 rounded-xl">
            <p className="text-sm text-neutral-400">No reels saved yet.</p>
            {userId && (
              <p className="text-xs text-neutral-300 mt-1">
                Click &quot;Save Reel&quot; above to add the first one.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {reels.map((reel) => (
              <a
                key={reel.id}
                href={reel.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                {/* Card */}
                <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white hover:border-neutral-400 hover:shadow-md transition-all duration-150">
                  {/* Thumbnail */}
                  <div className="relative aspect-9/16 bg-neutral-100">
                    {reel.thumbnail_url ? (
                      <img
                        src={reel.thumbnail_url}
                        alt={reel.title ?? "Reel"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="size-8 text-neutral-300" />
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <div className="size-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                        <Play className="size-4 text-neutral-900 ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-2.5">
                    <h3
                      className="text-[11px] font-medium text-neutral-700 line-clamp-2 leading-snug"
                      title={reel.title ?? undefined}
                    >
                      {reel.title ?? "Instagram Reel"}
                    </h3>
                    {reel.notes && (
                      <p className="mt-1 text-[10px] text-neutral-400 line-clamp-1 italic">
                        {reel.notes}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className="bg-neutral-100 text-neutral-500 text-[9px] px-1.5 py-0 rounded border-0 font-normal"
                      >
                        Reel
                      </Badge>
                      <span className="text-[10px] text-neutral-400 tabular-nums">
                        {new Date(reel.created_at).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </span>
                    </div>

                    {/* Actions (Owner only) */}
                    {userId === reel.user_id && (
                      <div className="mt-3 pt-2 border-t border-neutral-100 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(reel.id);
                          }}
                          className="h-7 px-2 text-[10px] font-medium text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5 rounded-md"
                        >
                          <Trash2 className="size-3" />
                          Delete Reel
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

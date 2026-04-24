"use client"

import Link from "next/link"
import { useState } from "react"
import { ExternalLink, Trash2, Globe } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useLinks } from "./links-provider"
import { createClient } from "@/lib/supabase/client"
import type { LinkEntry } from "./links-provider"

type Props = {
  item?: LinkEntry
  isOwner?: boolean
  isAdmin?: boolean
}

export function LinkCard({ item, isOwner = false, isAdmin = false }: Props) {
  const supabase = createClient()
  const { deleteLink } = useLinks()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const entry: LinkEntry = item ?? {
    id: "demo",
    user_id: "demo",
    name: "Example Tool",
    url: "https://example.com",
    description: "A short description about this AI tool or useful website.",
    categories: ["AI Chat"],
    icon_url: "/placeholder.svg?height=64&width=64",
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const iconSrc = entry.icon_data_url || entry.icon_url || "/placeholder.svg?height=64&width=64"

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteLink(entry.id)
      setShowDeleteDialog(false)
    } catch (error) {
      console.error("Error deleting link:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Extract clean hostname for display
  let hostname = ""
  try {
    hostname = new URL(entry.url).hostname.replace("www.", "")
  } catch { }

  return (
    <>
      <div className="group relative flex flex-col bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-300 hover:shadow-sm transition-all duration-150">

        {/* Top row: icon + name */}
        <div className="flex items-center gap-3 mb-3">
          <div className="size-9 rounded-lg bg-neutral-100 overflow-hidden shrink-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={iconSrc}
              alt={`${entry.name} icon`}
              className="size-full object-contain p-0.5"
              crossOrigin="anonymous"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg"
              }}
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-neutral-900 truncate leading-tight">
              {entry.name}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <Globe className="size-3 text-neutral-300 shrink-0" />
              <span className="text-[11px] text-neutral-400 truncate">{hostname}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2 mb-4 flex-1">
          {entry.description}
        </p>

        {/* Bottom row: categories + visit link */}
        <div className="flex items-center justify-between gap-2 mt-auto">
          <div className="flex flex-wrap gap-1 min-w-0">
            {entry.categories.slice(0, 2).map((c) => (
              <Badge
                key={c}
                variant="secondary"
                className="bg-neutral-100 text-neutral-500 border-0 text-[10px] px-2 py-0 rounded font-normal leading-5"
              >
                {c}
              </Badge>
            ))}
            {entry.categories.length > 2 && (
              <Badge
                variant="secondary"
                className="bg-neutral-100 text-neutral-400 border-0 text-[10px] px-2 py-0 rounded font-normal leading-5"
              >
                +{entry.categories.length - 2}
              </Badge>
            )}
          </div>

          <Link
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Visit
            <ExternalLink className="size-3" />
          </Link>
        </div>

        {/* Actions (Owner/Admin only) */}
        {(isOwner || isAdmin) && (
          <div className="mt-4 pt-3 border-t border-neutral-100 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowDeleteDialog(true)
              }}
              disabled={isDeleting}
              className="h-7 px-2.5 text-[10px] font-medium text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5 rounded-md"
            >
              <Trash2 className="size-3.5" />
              Delete Listing
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete &quot;{entry.name}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

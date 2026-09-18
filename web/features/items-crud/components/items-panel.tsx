"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { CreateItemSchema } from "@/lib/schemas"

export function ItemsPanel() {
  const { items, itemsLoading, fetchItems, createItem, deleteItem, setNotification } =
    useAppStore()

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsedTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    const validation = CreateItemSchema.safeParse({
      title,
      content,
      tags: parsedTags,
    })

    if (!validation.success) {
      setNotification({
        message: validation.error.issues[0]?.message || "Invalid input",
        type: "error",
      })
      return
    }

    const success = await createItem(title, content, parsedTags)
    if (success) {
      setTitle("")
      setContent("")
      setTags("")
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">PostgreSQL CRUD</h2>
          <p className="text-xs text-muted-foreground">Relational persistence with SQLx</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchItems()}
          disabled={itemsLoading}
          className="h-7 text-xs"
        >
          {itemsLoading ? "Loading..." : "Reload"}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Record Title (e.g. Distributed Engine)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-xs outline-hidden focus:ring-2 focus:ring-primary/20"
        />
        <input
          type="text"
          placeholder="Optional description / metadata"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-xs outline-hidden focus:ring-2 focus:ring-primary/20"
        />
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Tags (comma-separated: rust, tokio, scale)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-xs outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <Button type="submit" size="sm" className="h-8.5 text-xs">
            Save Record
          </Button>
        </div>
      </form>

      <div className="mt-4 max-h-48 overflow-y-auto space-y-2 pr-1">
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No records in database</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border bg-muted/20 p-2.5 text-xs"
            >
              <div>
                <span className="font-medium text-foreground">{item.title}</span>
                {item.content && (
                  <p className="text-[11px] text-muted-foreground">{item.content}</p>
                )}
                <div className="mt-1 flex gap-1">
                  {item.tags?.map((t) => (
                    <span
                      key={t}
                      className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteItem(item.id)}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              >
                ✕
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

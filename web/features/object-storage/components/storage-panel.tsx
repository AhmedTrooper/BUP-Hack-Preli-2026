"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"

export function StoragePanel() {
  const { files, filesLoading, fetchFiles, deleteFile, setNotification } = useAppStore()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [presignedUrl, setPresignedUrl] = useState<{ key: string; url: string } | null>(null)

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    setUploading(true)
    const formData = new FormData()
    formData.append("file", selectedFile)

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
    try {
      const res = await fetch(`${apiBase}/api/v1/storage/upload`, {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        setNotification({ message: `Uploaded '${selectedFile.name}' to S3`, type: "success" })
        setSelectedFile(null)
        await fetchFiles()
      } else {
        setNotification({ message: "Upload failed", type: "error" })
      }
    } catch {
      setNotification({ message: "Upload network error", type: "error" })
    } finally {
      setUploading(false)
    }
  }

  const handleGetPresignedUrl = async (key: string) => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
    try {
      const res = await fetch(`${apiBase}/api/v1/storage/url/${encodeURIComponent(key)}`)
      if (res.ok) {
        const data = await res.json()
        setPresignedUrl({ key, url: data.url })
      }
    } catch {
      setNotification({ message: "Failed to generate presigned URL", type: "error" })
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">AWS S3 / MinIO Storage</h2>
          <p className="text-xs text-muted-foreground">
            Cloud object storage with presigned download URLs
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchFiles()}
          disabled={filesLoading}
          className="h-7 text-xs"
        >
          {filesLoading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <form onSubmit={handleUpload} className="flex gap-2">
        <input
          type="file"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-xs file:mr-2 file:border-0 file:bg-transparent file:text-xs file:font-semibold file:text-primary"
        />
        <Button
          type="submit"
          size="sm"
          disabled={uploading || !selectedFile}
          className="h-8.5 text-xs"
        >
          {uploading ? "Uploading..." : "Upload S3"}
        </Button>
      </form>

      {presignedUrl && (
        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs">
          <div className="font-semibold text-primary">Generated Presigned URL:</div>
          <a
            href={presignedUrl.url}
            target="_blank"
            rel="noreferrer"
            className="break-all text-[11px] text-muted-foreground underline hover:text-foreground"
          >
            {presignedUrl.url}
          </a>
        </div>
      )}

      <div className="mt-4 max-h-32 overflow-y-auto space-y-1.5">
        {files.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
            No objects currently stored in bucket
          </p>
        ) : (
          files.map((file) => (
            <div
              key={file}
              className="flex items-center justify-between rounded-lg border bg-muted/20 p-2 text-xs"
            >
              <span className="font-mono text-[11px] truncate max-w-[200px]">{file}</span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGetPresignedUrl(file)}
                  className="h-6 text-[10px] px-2"
                >
                  Presign URL
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteFile(file)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                >
                  ✕
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

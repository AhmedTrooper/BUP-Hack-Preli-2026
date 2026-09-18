"use client"

import { useId, useState } from "react"
import { useWebRTC } from "@/hooks/use-webrtc"
import { Button } from "@/components/ui/button"

export function RtcPanel() {
  const [roomId, setRoomId] = useState("main-room")
  const id = useId()
  const peerId = "peer-" + id.replace(/:/g, "")
  const [inputMsg, setInputMsg] = useState("")

  const rtc = useWebRTC(roomId, peerId)

  const handleSend = () => {
    if (inputMsg.trim()) {
      rtc.sendDataMessage(inputMsg)
      setInputMsg("")
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">WebRTC Live Signaling</h2>
          <p className="text-xs text-muted-foreground">
            Full-duplex WebSocket hub for peer-to-peer data channels
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              rtc.status === "connected"
                ? "bg-emerald-500 animate-pulse"
                : "bg-muted-foreground"
            }`}
          />
          <span className="capitalize">{rtc.status}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Room name"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          disabled={rtc.status === "connected"}
          className="w-1/2 rounded-lg border bg-background px-3 py-2 text-xs outline-hidden focus:ring-2 focus:ring-primary/20"
        />
        {rtc.status === "connected" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => rtc.disconnect()}
            className="flex-1 h-8.5 text-xs text-destructive border-destructive/30"
          >
            Leave Room
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => rtc.connect()}
            className="flex-1 h-8.5 text-xs"
          >
            Join Room ({peerId})
          </Button>
        )}
      </div>

      {rtc.status === "connected" && (
        <div className="mt-4 space-y-3">
          <div className="text-[11px] text-muted-foreground">
            Active Peers in Room:{" "}
            {rtc.peers.length === 0 ? "Awaiting peer connections..." : rtc.peers.join(", ")}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Send real-time peer message..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-xs outline-hidden focus:ring-2 focus:ring-primary/20"
            />
            <Button size="sm" onClick={handleSend} className="h-7 text-xs">
              Send
            </Button>
          </div>

          <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[11px]">
            {rtc.messages.map((m, idx) => (
              <div key={idx} className="flex justify-between text-muted-foreground">
                <span>
                  <strong className="text-foreground">{m.from}:</strong> {m.text}
                </span>
                <span className="text-[9px]">{m.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

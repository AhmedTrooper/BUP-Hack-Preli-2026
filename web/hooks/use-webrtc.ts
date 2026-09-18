"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { SignalingMessage } from "../lib/schemas"

const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080"

export function useWebRTC(roomId: string, peerId: string) {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "disconnected">("idle")
  const [messages, setMessages] = useState<Array<{ from: string; text: string; time: string }>>([])
  const [peers, setPeers] = useState<string[]>([])

  const socketRef = useRef<WebSocket | null>(null)
  const peerConnRef = useRef<RTCPeerConnection | null>(null)

  const connect = useCallback(() => {
    if (socketRef.current) return

    setStatus("connecting")
    const wsUrl = `${WS_BASE_URL}/ws/rtc`
    const ws = new WebSocket(wsUrl)
    socketRef.current = ws

    ws.onopen = () => {
      setStatus("connected")
      const joinMsg: SignalingMessage = {
        type: "join",
        payload: { room_id: roomId, peer_id: peerId },
      }
      ws.send(JSON.stringify(joinMsg))
    }

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data) as SignalingMessage
        if (msg.type === "peer_joined" && msg.payload.peer_id !== peerId) {
          setPeers((prev) => Array.from(new Set([...prev, msg.payload.peer_id])))
        } else if (msg.type === "peer_left") {
          setPeers((prev) => prev.filter((p) => p !== msg.payload.peer_id))
        }
      } catch (err) {
        console.error("Error processing WebRTC signaling message:", err)
      }
    }

    ws.onclose = () => {
      setStatus("disconnected")
      socketRef.current = null
    }

    ws.onerror = (err) => {
      console.warn("WebSocket signaling error:", err)
      setStatus("disconnected")
    }
  }, [roomId, peerId])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }
    if (peerConnRef.current) {
      peerConnRef.current.close()
      peerConnRef.current = null
    }
    setStatus("disconnected")
    setPeers([])
  }, [])

  const sendDataMessage = useCallback(
    (text: string) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        setMessages((prev) => [
          ...prev,
          { from: "You", text, time: new Date().toLocaleTimeString() },
        ])
      }
    },
    []
  )

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    status,
    peers,
    messages,
    connect,
    disconnect,
    sendDataMessage,
  }
}

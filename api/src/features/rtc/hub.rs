use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
};
use tokio::sync::{RwLock, broadcast};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", content = "payload")]
pub enum SignalingMessage {
    #[serde(rename = "join")]
    Join { room_id: String, peer_id: String },

    #[serde(rename = "leave")]
    Leave { room_id: String, peer_id: String },

    #[serde(rename = "offer")]
    Offer {
        room_id: String,
        from_peer: String,
        to_peer: Option<String>,
        sdp: String,
    },

    #[serde(rename = "answer")]
    Answer {
        room_id: String,
        from_peer: String,
        to_peer: Option<String>,
        sdp: String,
    },

    #[serde(rename = "candidate")]
    Candidate {
        room_id: String,
        from_peer: String,
        to_peer: Option<String>,
        candidate: String,
    },

    #[serde(rename = "peer_joined")]
    PeerJoined { room_id: String, peer_id: String },

    #[serde(rename = "peer_left")]
    PeerLeft { room_id: String, peer_id: String },

    #[serde(rename = "ping")]
    Ping,

    #[serde(rename = "pong")]
    Pong,
}

#[derive(Clone)]
pub struct RtcHub {
    rooms: Arc<RwLock<HashMap<String, HashSet<String>>>>,
    tx: broadcast::Sender<(String, SignalingMessage)>,
}

impl Default for RtcHub {
    fn default() -> Self {
        Self::new()
    }
}

impl RtcHub {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(1024);
        Self {
            rooms: Arc::new(RwLock::new(HashMap::new())),
            tx,
        }
    }

    pub async fn get_rooms_info(&self) -> HashMap<String, usize> {
        let rooms = self.rooms.read().await;
        rooms
            .iter()
            .map(|(room, peers)| (room.clone(), peers.len()))
            .collect()
    }

    pub async fn handle_socket(self: Arc<Self>, socket: WebSocket) {
        let (mut sender, mut receiver) = socket.split();
        let mut rx = self.tx.subscribe();

        let mut current_room: Option<String> = None;
        let mut current_peer: Option<String> = None;

        let hub_clone = self.clone();

        let send_task = tokio::spawn(async move {
            while let Ok((_room_id, msg)) = rx.recv().await {
                if let Ok(serialized) = serde_json::to_string(&msg) {
                    let text = Message::Text(serialized.into());
                    if sender.send(text).await.is_err() {
                        break;
                    }
                }
            }
        });

        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    if let Ok(parsed) = serde_json::from_str::<SignalingMessage>(&text) {
                        match &parsed {
                            SignalingMessage::Join { room_id, peer_id } => {
                                current_room = Some(room_id.clone());
                                current_peer = Some(peer_id.clone());

                                let mut rooms = self.rooms.write().await;
                                rooms
                                    .entry(room_id.clone())
                                    .or_default()
                                    .insert(peer_id.clone());

                                let _ = self.tx.send((
                                    room_id.clone(),
                                    SignalingMessage::PeerJoined {
                                        room_id: room_id.clone(),
                                        peer_id: peer_id.clone(),
                                    },
                                ));
                            }
                            SignalingMessage::Leave { room_id, peer_id } => {
                                let mut rooms = self.rooms.write().await;
                                if let Some(peers) = rooms.get_mut(room_id) {
                                    peers.remove(peer_id);
                                }
                                let _ = self.tx.send((
                                    room_id.clone(),
                                    SignalingMessage::PeerLeft {
                                        room_id: room_id.clone(),
                                        peer_id: peer_id.clone(),
                                    },
                                ));
                            }
                            SignalingMessage::Ping => {
                                let _ = self.tx.send(("".to_string(), SignalingMessage::Pong));
                            }
                            SignalingMessage::Offer { room_id, .. }
                            | SignalingMessage::Answer { room_id, .. }
                            | SignalingMessage::Candidate { room_id, .. } => {
                                let _ = self.tx.send((room_id.clone(), parsed));
                            }
                            _ => {}
                        }
                    }
                }
                Message::Close(_) => break,
                _ => {}
            }
        }

        send_task.abort();

        if let (Some(room_id), Some(peer_id)) = (current_room, current_peer) {
            let mut rooms = hub_clone.rooms.write().await;
            if let Some(peers) = rooms.get_mut(&room_id) {
                peers.remove(&peer_id);
            }
            let _ = hub_clone.tx.send((
                room_id.clone(),
                SignalingMessage::PeerLeft { room_id, peer_id },
            ));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_signaling_message_serialization() {
        let offer = SignalingMessage::Offer {
            room_id: "room-1".to_string(),
            from_peer: "peer-a".to_string(),
            to_peer: Some("peer-b".to_string()),
            sdp: "v=0...".to_string(),
        };

        let json = serde_json::to_string(&offer).unwrap();
        let parsed: SignalingMessage = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, offer);
    }
}

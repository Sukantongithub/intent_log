import json
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebRTC Signaling"])

class MeetingSignalingManager:
    def __init__(self):
        # room_code -> { peer_id: { "ws": WebSocket, "name": str, "is_host": bool, "media_state": dict } }
        self.rooms: Dict[str, Dict[str, Any]] = {}
        # Collaborative Whiteboard drawing stroke history: room_code -> [stroke_objects]
        self.whiteboards: Dict[str, list] = {}
        # Collaborative Notes scratchpad: room_code -> str
        self.notes: Dict[str, str] = {}

    async def connect(self, room_code: str, peer_id: str, name: str, ws: WebSocket) -> dict:
        await ws.accept()
        if room_code not in self.rooms:
            self.rooms[room_code] = {}

        # First to join is host, subsequent are guests
        is_host = len(self.rooms[room_code]) == 0

        self.rooms[room_code][peer_id] = {
            "ws": ws,
            "name": name,
            "is_host": is_host,
            "media_state": {"mic": False, "camera": False, "screen": False}
        }

        # Return info about existing peers in the room
        existing_peers = [
            {
                "peer_id": pid,
                "name": pdata["name"],
                "is_host": pdata["is_host"],
                "media_state": pdata["media_state"]
            }
            for pid, pdata in self.rooms[room_code].items()
            if pid != peer_id
        ]

        return {
            "is_host": is_host,
            "existing_peers": existing_peers
        }

    async def disconnect(self, room_code: str, peer_id: str):
        if room_code in self.rooms and peer_id in self.rooms[room_code]:
            pdata = self.rooms[room_code].pop(peer_id)
            if not self.rooms[room_code]:
                del self.rooms[room_code]
            else:
                # If host left, designate next oldest member as host
                has_host = any(p["is_host"] for p in self.rooms[room_code].values())
                if not has_host and self.rooms[room_code]:
                    first_peer = next(iter(self.rooms[room_code].values()))
                    first_peer["is_host"] = True

                # Notify remaining members
                await self.broadcast(room_code, {
                    "type": "peer_left",
                    "peer_id": peer_id,
                    "name": pdata["name"]
                })

    async def send_to_peer(self, room_code: str, target_peer_id: str, message: dict):
        if room_code in self.rooms and target_peer_id in self.rooms[room_code]:
            target_ws: WebSocket = self.rooms[room_code][target_peer_id]["ws"]
            try:
                await target_ws.send_json(message)
            except Exception as e:
                logger.warning(f"Error sending message to peer {target_peer_id}: {e}")

    async def broadcast(self, room_code: str, message: dict, exclude_peer_id: Optional[str] = None):
        if room_code in self.rooms:
            for pid, pdata in list(self.rooms[room_code].items()):
                if pid != exclude_peer_id:
                    try:
                        await pdata["ws"].send_json(message)
                    except Exception as e:
                        logger.warning(f"Error broadcasting to peer {pid}: {e}")

manager = MeetingSignalingManager()

@router.websocket("/ws/meeting/{room_code}")
async def meeting_signaling_endpoint(websocket: WebSocket, room_code: str):
    peer_id = None
    try:
        # Await the initial registration payload from the client
        await websocket.accept()
        init_data = await websocket.receive_json()
        
        peer_id = init_data.get("peer_id")
        peer_name = init_data.get("name", "Participant")
        media_state = init_data.get("media_state", {"mic": False, "camera": False, "screen": False})

        if not peer_id:
            await websocket.close(code=1008)
            return

        norm_room = room_code.strip().upper()
        if norm_room not in manager.rooms:
            manager.rooms[norm_room] = {}

        # First peer is designated host, others are guests
        is_host = len(manager.rooms[norm_room]) == 0

        # Assign clear role-based display names if user is guest or using default name
        if is_host:
            display_name = peer_name if (peer_name and peer_name not in ("Participant", "Application Super Admin")) else "Host"
        else:
            guest_num = len(manager.rooms[norm_room])
            display_name = peer_name if (peer_name and peer_name not in ("Participant", "Application Super Admin", "Host")) else f"Guest {guest_num}"

        manager.rooms[norm_room][peer_id] = {
            "ws": websocket,
            "name": display_name,
            "is_host": is_host,
            "media_state": media_state
        }

        # 1. Send room state back to the newly connected peer
        existing_peers = [
            {
                "peer_id": pid,
                "name": pdata["name"],
                "is_host": pdata["is_host"],
                "media_state": pdata["media_state"]
            }
            for pid, pdata in manager.rooms[norm_room].items()
            if pid != peer_id
        ]

        await websocket.send_json({
            "type": "room_state",
            "peer_id": peer_id,
            "is_host": is_host,
            "assigned_name": display_name,
            "existing_peers": existing_peers,
            "whiteboard_history": manager.whiteboards.get(norm_room, []),
            "meeting_notes": manager.notes.get(norm_room, "")
        })

        # 2. Broadcast to all existing peers that a new peer joined
        await manager.broadcast(norm_room, {
            "type": "peer_joined",
            "peer_id": peer_id,
            "name": display_name,
            "is_host": is_host,
            "media_state": media_state
        }, exclude_peer_id=peer_id)

        # 3. Main signaling message loop
        while True:
            msg = await websocket.receive_json()
            msg_type = msg.get("type")
            target_peer_id = msg.get("target_peer_id")

            if msg_type in ("offer", "answer", "ice_candidate"):
                # Forward WebRTC signaling to the specified peer
                if target_peer_id:
                    msg["sender_peer_id"] = peer_id
                    await manager.send_to_peer(norm_room, target_peer_id, msg)

            elif msg_type == "media_state":
                # Broadcast updated microphone, camera, or screen share status
                new_media = msg.get("media_state", {})
                if peer_id in manager.rooms.get(norm_room, {}):
                    manager.rooms[norm_room][peer_id]["media_state"].update(new_media)
                await manager.broadcast(norm_room, {
                    "type": "peer_media_updated",
                    "peer_id": peer_id,
                    "media_state": new_media
                }, exclude_peer_id=peer_id)

            elif msg_type == "chat_message":
                # Relay chat or transcript text across all participants
                await manager.broadcast(norm_room, {
                    "type": "chat_message",
                    "peer_id": peer_id,
                    "name": display_name,
                    "message": msg.get("message")
                })

            elif msg_type == "whiteboard_draw":
                # Broadcast real-time canvas drawing stroke & persist in room history
                stroke = msg.get("stroke")
                if stroke:
                    if norm_room not in manager.whiteboards:
                        manager.whiteboards[norm_room] = []
                    manager.whiteboards[norm_room].append(stroke)
                    if len(manager.whiteboards[norm_room]) > 2500:
                        manager.whiteboards[norm_room] = manager.whiteboards[norm_room][-2000:]

                await manager.broadcast(norm_room, {
                    "type": "whiteboard_draw",
                    "sender_peer_id": peer_id,
                    "sender_name": display_name,
                    "stroke": stroke
                }, exclude_peer_id=peer_id)

            elif msg_type == "whiteboard_clear":
                # Clear room whiteboard canvas for all participants
                manager.whiteboards[norm_room] = []
                await manager.broadcast(norm_room, {
                    "type": "whiteboard_clear",
                    "sender_peer_id": peer_id,
                    "sender_name": display_name
                })

            elif msg_type == "notes_update":
                # Sync shared meeting notes scratchpad across all peers
                notes_text = msg.get("notes", "")
                manager.notes[norm_room] = notes_text
                await manager.broadcast(norm_room, {
                    "type": "notes_update",
                    "sender_peer_id": peer_id,
                    "sender_name": display_name,
                    "notes": notes_text
                }, exclude_peer_id=peer_id)

            elif msg_type == "ping":
                # Heartbeat keepalive and round-trip latency probe
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": msg.get("timestamp")
                })

    except WebSocketDisconnect:
        if peer_id:
            await manager.disconnect(norm_room, peer_id)
    except Exception as e:
        logger.error(f"Signaling error for peer {peer_id} in room {norm_room}: {e}")
        if peer_id:
            await manager.disconnect(norm_room, peer_id)

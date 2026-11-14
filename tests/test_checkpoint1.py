import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_checkpoint1_test():
    print("==================================================")
    print("   IntenT_loG — CHECKPOINT 1 VERIFICATION TEST   ")
    print("==================================================")

    meeting_id = "MEETING_001"

    # Participant roster requested in Checkpoint 1 spec:
    target_names = [
        "Sujith",
        "Sukant",
        "Nithi",
        "Viswaa",
        "Member5",
        "Member6"
    ]

    print(f"\n[1] Registering {len(target_names)} Users & Generating Participant IDs...")
    registered_users = []
    for name in target_names:
        email = f"{name.lower()}@example.com"
        res = requests.post(f"{BASE_URL}/api/users/register", json={"name": name, "email": email})
        assert res.status_code == 201, f"Failed to register user {name}: {res.text}"
        user_data = res.json()
        print(f"  User: {user_data['name']} -> user_id: {user_data['user_id']} ({user_data['email']})")
        registered_users.append(user_data)

    assert len(registered_users) == 6, "Expected 6 registered users"

    print(f"\n[2] Joining {len(registered_users)} Participants to Meeting '{meeting_id}'...")
    joined_participants = []
    for user in registered_users:
        join_payload = {
            "user_id": user["user_id"],
            "display_name": user["name"],
            "mic_enabled": True
        }
        res = requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/join", json=join_payload)
        assert res.status_code == 201, f"Failed to join meeting for {user['name']}: {res.text}"
        p_data = res.json()
        print(f"  Joined: {p_data['display_name']} ({p_data['user_id']}) -> Mic Enabled: {p_data['mic_enabled']}")
        joined_participants.append(p_data)

    # 3. Verify Roster via GET /api/meetings/{meeting_id}/participants
    print(f"\n[3] Verifying Meeting Roster for '{meeting_id}'...")
    res = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}/participants")
    assert res.status_code == 200
    roster = res.json()
    print(f"  Total Active Participants in Roster: {len(roster)}")
    for p in roster:
        print(f"    - Participant ID: {p['user_id']} | Display Name: {p['display_name']} | Mic: {p['mic_enabled']}")

    assert len(roster) >= 6, "Expected at least 6 active meeting participants in roster"
    roster_user_ids = [p["user_id"] for p in roster]
    for u in registered_users:
        assert u["user_id"] in roster_user_ids, f"User ID {u['user_id']} missing from meeting roster"

    # 4. Verify Mic State Toggle for Participant (Nithi)
    print("\n[4] Testing Participant Microphone State Toggle (Mute/Unmute)...")
    nithi_user = next(u for u in registered_users if u["name"] == "Nithi")
    nithi_id = nithi_user["user_id"]

    # Toggle Mute
    res = requests.patch(
        f"{BASE_URL}/api/meetings/{meeting_id}/participants/{nithi_id}/mic",
        json={"mic_enabled": False}
    )
    assert res.status_code == 200
    assert res.json()["mic_enabled"] is False
    print(f"  Updated Nithi ({nithi_id}) Mic State -> Muted (mic_enabled = False)")

    # Toggle Unmute
    res = requests.patch(
        f"{BASE_URL}/api/meetings/{meeting_id}/participants/{nithi_id}/mic",
        json={"mic_enabled": True}
    )
    assert res.status_code == 200
    assert res.json()["mic_enabled"] is True
    print(f"  Updated Nithi ({nithi_id}) Mic State -> Unmuted (mic_enabled = True)")

    print("\n==================================================")
    print(" CHECKPOINT 1 VERIFICATION PASSED SUCCESSFULLY!   ")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = run_checkpoint1_test()
    if not success:
        sys.exit(1)

import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_checkpoint0_test():
    print("==================================================")
    print("   IntenT_loG — CHECKPOINT 0 VERIFICATION TEST   ")
    print("==================================================")

    print("\n[1] Testing GET /health endpoint...")
    try:
        res = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"  HTTP Status Code: {res.status_code}")
        print(f"  Response Body: {res.json()}")
        
        assert res.status_code == 200, f"Expected status 200, got {res.status_code}"
        data = res.json()
        assert data.get("status") == "ok", "Expected status 'ok'"
        assert data.get("database") == "connected", "Expected database 'connected'"
        
        print("-> Backend Service & MongoDB Connectivity PASSED")
    except Exception as e:
        print(f"-> CHECKPOINT 0 TEST FAILED: {e}")
        return False

    print("\n==================================================")
    print(" CHECKPOINT 0 VERIFICATION PASSED SUCCESSFULLY!   ")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = run_checkpoint0_test()
    if not success:
        sys.exit(1)

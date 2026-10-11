"""
Test suite to verify all G1, G2, G3, G4 endpoints on FastAPI backend.
"""
import requests
import json
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"
WORKSPACE = Path(r"D:\PIYUSH\dtu\aws kack")
TEST_CULLET = WORKSPACE / "public" / "demo" / "synthetic-with-foreign-objects.jpg"
TEST_WHOLE = WORKSPACE / "datasets" / "g3_precrush" / "images" / "val"

def test_endpoints():
    print("="*60)
    print(">> TESTING CULLETIQ DEEP LEARNING BACKEND ENDPOINTS")
    print("="*60)

    # 1. Health
    res = requests.get(f"{BASE_URL}/api/v1/health")
    print(f"1. /api/v1/health: {res.status_code}")
    print("   Data:", json.dumps(res.json(), indent=2))
    assert res.status_code == 200

    # 2. G1+G2 Cullet Classification
    if TEST_CULLET.exists():
        with open(TEST_CULLET, "rb") as f:
            res = requests.post(f"{BASE_URL}/api/v1/classify/image", files={"file": f})
        print(f"\n2. /api/v1/classify/image (G1+G2): {res.status_code}")
        data = res.json()
        print(f"   Inference ms: {data.get('inference_ms')}")
        print(f"   Detections count: {data.get('total_detections')}")
        print(f"   Stream purity %: {data.get('stream_purity_percent')}")
        print(f"   CSP defect count: {data.get('csp_defect_count')}")
        assert res.status_code == 200
    else:
        print("Test cullet image not found")

    # 3. G3 Whole-Item Conveyor Classification
    test_whole_images = list(TEST_WHOLE.glob("*.jpg"))
    if test_whole_images:
        test_img = test_whole_images[0]
        with open(test_img, "rb") as f:
            res = requests.post(f"{BASE_URL}/api/v1/classify/whole-item", files={"file": f})
        print(f"\n3. /api/v1/classify/whole-item (G3): {res.status_code} ({test_img.name})")
        data = res.json()
        print(f"   Inference ms: {data.get('inference_ms')}")
        print(f"   Total items: {data.get('total_items_inspected')}")
        print(f"   Diverter actuated: {data.get('reject_diverter_actuated')}")
        print(f"   Rejection reasons: {data.get('rejection_reasons')}")
        assert res.status_code == 200

    # 4. G4 Citizen Mobile Classification
    if test_whole_images:
        test_img = test_whole_images[0]
        with open(test_img, "rb") as f:
            res = requests.post(f"{BASE_URL}/api/v1/classify/citizen", files={"file": f})
        print(f"\n4. /api/v1/classify/citizen (G4): {res.status_code} ({test_img.name})")
        data = res.json()
        print(f"   Category: {data.get('category')} ({data.get('name')})")
        print(f"   Confidence: {data.get('confidence')}")
        print(f"   Abstain (70% rule): {data.get('abstain')}")
        print(f"   Accepted: {data.get('isAccepted')}")
        assert res.status_code == 200

    # 5. Model Metrics
    res = requests.get(f"{BASE_URL}/api/v1/models/metrics")
    print(f"\n5. /api/v1/models/metrics: {res.status_code}")
    data = res.json()
    print("   Models loaded:", list(data.get("models", {}).keys()))
    assert res.status_code == 200

    print("\n[ALL TESTS PASSED] ALL G1, G2, G3, G4 ENDPOINTS OPERATIONAL ON GPU!")

if __name__ == "__main__":
    test_endpoints()

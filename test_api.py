import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def post(endpoint, payload):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))
    except Exception as e:
        return 0, {"error": str(e)}

def get(endpoint):
    url = f"{BASE_URL}{endpoint}"
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))
    except Exception as e:
        return 0, {"error": str(e)}

DEMO_NODES = [
    "API_Gateway", "Auth_Service", "User_Service", 
    "Product_Service", "Order_Service", "Payment_Service", 
    "Notification_Service"
]

DEMO_EDGES = [
    {"from": "API_Gateway", "to": "Auth_Service", "cost": 2},
    {"from": "API_Gateway", "to": "Product_Service", "cost": 3},
    {"from": "Auth_Service", "to": "User_Service", "cost": 1},
    {"from": "Auth_Service", "to": "Order_Service", "cost": 5},
    {"from": "User_Service", "to": "Order_Service", "cost": 2},
    {"from": "Product_Service", "to": "Order_Service", "cost": 4},
    {"from": "Order_Service", "to": "Payment_Service", "cost": 6},
    {"from": "Order_Service", "to": "Notification_Service", "cost": 1},
    {"from": "Payment_Service", "to": "Notification_Service", "cost": 2},
    {"from": "API_Gateway", "to": "Payment_Service", "cost": 20}
]

def run_all_tests():
    passed = 0
    failed = 0

    print("=== RUNNING FASTAPI & C ENGINE INTEGRATION TESTS ===")

    # Test 1: Health endpoint
    status, data = get("/api/health")
    if status == 200 and data.get("status") == "ok" and data.get("c_engine") == "available":
        print("[PASS] Health Check: C engine available")
        passed += 1
    else:
        print(f"[FAIL] Health Check: status={status}, data={data}")
        failed += 1

    # Test 2: Dijkstra Optimal Route (API_Gateway -> Payment_Service)
    status, data = post("/api/optimize", {
        "algorithm": "Dijkstra",
        "source": "API_Gateway",
        "destination": "Payment_Service",
        "nodes": DEMO_NODES,
        "edges": DEMO_EDGES
    })
    expected_route = ["API_Gateway", "Auth_Service", "User_Service", "Order_Service", "Payment_Service"]
    if status == 200 and data.get("reachable") is True and data.get("totalCost") == 11 and data.get("route") == expected_route:
        print(f"[PASS] Dijkstra: Optimal cost 11, route: {' -> '.join(data.get('route'))}")
        passed += 1
    else:
        print(f"[FAIL] Dijkstra: status={status}, data={data}")
        failed += 1

    # Test 3: BFS Traversal
    status, data = post("/api/optimize", {
        "algorithm": "BFS",
        "source": "API_Gateway",
        "destination": "Payment_Service",
        "nodes": DEMO_NODES,
        "edges": DEMO_EDGES
    })
    if status == 200 and data.get("reachable") is True and data.get("totalCost") is None and len(data.get("route", [])) > 0:
        print(f"[PASS] BFS Traversal: route={' -> '.join(data.get('route'))}, totalCost=None")
        passed += 1
    else:
        print(f"[FAIL] BFS: status={status}, data={data}")
        failed += 1

    # Test 4: DFS Traversal
    status, data = post("/api/optimize", {
        "algorithm": "DFS",
        "source": "API_Gateway",
        "destination": "Payment_Service",
        "nodes": DEMO_NODES,
        "edges": DEMO_EDGES
    })
    if status == 200 and data.get("reachable") is True and data.get("totalCost") is None and len(data.get("route", [])) > 0:
        print(f"[PASS] DFS Traversal: route={' -> '.join(data.get('route'))}, totalCost=None")
        passed += 1
    else:
        print(f"[FAIL] DFS: status={status}, data={data}")
        failed += 1

    # Test 5: Unreachable Destination
    status, data = post("/api/optimize", {
        "algorithm": "Dijkstra",
        "source": "API_Gateway",
        "destination": "Isolated_Node",
        "nodes": DEMO_NODES + ["Isolated_Node"],
        "edges": DEMO_EDGES
    })
    if status == 200 and data.get("reachable") is False and data.get("totalCost") is None and data.get("route") == []:
        print("[PASS] Unreachable node: reachable=False, totalCost=None, route=[]")
        passed += 1
    else:
        print(f"[FAIL] Unreachable node: status={status}, data={data}")
        failed += 1

    # Test 6: Validation - Negative Edge Cost
    status, data = post("/api/optimize", {
        "algorithm": "Dijkstra",
        "source": "API_Gateway",
        "destination": "Auth_Service",
        "nodes": ["API_Gateway", "Auth_Service"],
        "edges": [{"from": "API_Gateway", "to": "Auth_Service", "cost": -10}]
    })
    if status == 422:
        print("[PASS] Validation: Negative edge cost rejected with 422")
        passed += 1
    else:
        print(f"[FAIL] Negative edge cost: expected 422, got {status}, data={data}")
        failed += 1

    # Test 7: Validation - Unknown Node in Edge
    status, data = post("/api/optimize", {
        "algorithm": "Dijkstra",
        "source": "API_Gateway",
        "destination": "Auth_Service",
        "nodes": ["API_Gateway", "Auth_Service"],
        "edges": [{"from": "API_Gateway", "to": "NonExistent", "cost": 5}]
    })
    if status == 422:
        print("[PASS] Validation: Unknown edge node reference rejected with 422")
        passed += 1
    else:
        print(f"[FAIL] Unknown edge node: expected 422, got {status}, data={data}")
        failed += 1

    # Test 8: Validation - Empty/Whitespace Node Name
    status, data = post("/api/optimize", {
        "algorithm": "Dijkstra",
        "source": "   ",
        "destination": "Auth_Service",
        "nodes": ["   ", "Auth_Service"],
        "edges": [{"from": "   ", "to": "Auth_Service", "cost": 5}]
    })
    if status == 422:
        print("[PASS] Validation: Whitespace node name rejected with 422")
        passed += 1
    else:
        print(f"[FAIL] Whitespace node name: expected 422, got {status}, data={data}")
        failed += 1

    # Test 9: Validation - Unsupported Algorithm
    status, data = post("/api/optimize", {
        "algorithm": "A_Star",
        "source": "API_Gateway",
        "destination": "Auth_Service",
        "nodes": ["API_Gateway", "Auth_Service"],
        "edges": [{"from": "API_Gateway", "to": "Auth_Service", "cost": 5}]
    })
    if status == 422:
        print("[PASS] Validation: Unsupported algorithm rejected with 422")
        passed += 1
    else:
        print(f"[FAIL] Unsupported algorithm: expected 422, got {status}, data={data}")
        failed += 1

    print(f"\nSummary: {passed} passed, {failed} failed out of {passed + failed} tests.")
    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_all_tests()

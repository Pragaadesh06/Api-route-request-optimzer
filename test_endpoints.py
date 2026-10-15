import requests

try:
    health = requests.get("http://127.0.0.1:8000/api/health", timeout=3)
    print("API Health:", health.json())
except Exception as e:
    print("API Error:", e)

try:
    frontend = requests.get("http://127.0.0.1:5500/", timeout=3)
    print("Frontend status code:", frontend.status_code)
except Exception as e:
    print("Frontend Error:", e)

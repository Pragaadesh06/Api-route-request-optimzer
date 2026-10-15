# Project Demonstration Guide

This guide provides a clean, 3–5 minute demonstration flow suitable for a college presentation or technical review.

## Step 1: Start the Project
Open a PowerShell terminal and run:
```powershell
.\start_project.ps1
```
This automatically verifies the C engine is built, sets up the Python virtual environment, installs dependencies, and launches the FastAPI backend. Once it is running, open `index.html` in your web browser.

## Step 2: Show the Graph & Verification
Scroll down to the **Visualizer** section.
- Point out the `C DSA ENGINE • ONLINE` status indicator, which proves the frontend is communicating with the Python backend and verifying the C executable.
- Show the visual graph, explaining that each node represents an API service (e.g., API Gateway, Auth Service) and edges represent the computational/network cost between them.

## Step 3: Select Source & Destination
In the main panel, select:
- **Source API:** `API_Gateway`
- **Destination API:** `Payment_Service`

## Step 4: Run Dijkstra
Select **Dijkstra** as the routing algorithm. Click **Find Optimal Route**.
- The result panel will instantly display the minimum-cost route.
- Point out the execution metrics showing `Total Cost: 11` (e.g., API_Gateway → Auth_Service → User_Service → Order_Service → Payment_Service).
- Explain that even though there's a direct edge `API_Gateway → Payment_Service` with cost `20`, the algorithm correctly determined the longer but cheaper path.

## Step 5: Explain the Algorithm (Dijkstra)
Scroll to the **Algorithm Implementations** and **Explain This Algorithm** sections.
- Discuss how the graph is represented internally as an **Adjacency List**.
- Mention that Dijkstra uses a **Binary Min-Heap** to extract the lowest-cost unvisited node in `O(log V)` time, optimizing the overall time complexity to `O((V + E) log V)`.

## Step 6: Run BFS
Scroll back up and change the algorithm to **BFS**. Click **Find Optimal Route**.
- The result will change. BFS finds the path with the fewest *number of edges*, ignoring weights.
- It will likely choose the direct edge `API_Gateway → Payment_Service`.
- Point out that the **Total Cost** metric is hidden, and the label changes to **TRAVERSAL ORDER** because BFS is an unweighted traversal algorithm using a **Queue**.

## Step 7: Run DFS
Change the algorithm to **DFS**. Click **Find Optimal Route**.
- The result will show a different traversal path as it explores deeply down one branch using a **Stack/Recursion** before backtracking.

## Step 8: Modify the Graph
Scroll to the **Graph Builder**.
- Add a new edge: `User_Service` → `Payment_Service` with cost `1`.
- Notice the UI immediately flags `GRAPH MODIFIED - READY TO RUN`. The previous routing visualization is cleared to prevent stale state presentation.

## Step 9: Re-run Dijkstra & Show Metrics
Select **Dijkstra** and run it again.
- The route will dynamically update to use the newly created, cheaper shortcut (`API_Gateway` → `Auth_Service` → `User_Service` → `Payment_Service`, total cost `4`).
- Highlight the **Execution Time** metric. It is generated natively by the C `<time.h>` clock and proves the backend routing speed (often `0.0000ms` for small graphs).

## Step 10: Explain Architecture
Scroll to the **System Architecture** section.
- Conclude by explaining the flow: the Frontend (HTML/JS) is purely visual. It sends a JSON payload to the FastAPI Bridge (Python), which delegates the actual complex graph traversal to the robust, memory-safe C DSA Engine. The C process outputs the result, which cascades back to the UI.

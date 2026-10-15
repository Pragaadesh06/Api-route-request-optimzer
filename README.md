# API Request Route Optimizer (RouteFlow)

## Overview
RouteFlow is an API Request Route Optimizer designed to model microservices and APIs as a weighted graph, calculating the most efficient request paths between them. It is built as a highly optimized, fully local academic project to demonstrate the practical application of fundamental Data Structures and Algorithms (DSA) in a system architecture context.

## Problem Statement
In modern distributed systems and microservice architectures, an initial API request often triggers a cascade of internal service calls (e.g., Gateway → Auth → User → Order → Payment). As these networks grow, identifying the most efficient request path—minimizing latency, computational overhead, or monetary cost—becomes a complex routing problem. 

## Objective
The primary objective of this project is to model API endpoints as nodes and their communication costs as directed edges, applying classical graph algorithms to programmatically discover both the minimum-cost routes and complete structural traversals. 

## Features
- **Interactive Graph Modeling**: Build, modify, and visualize directed graphs with custom edge weights.
- **Dijkstra's Algorithm**: Calculate the absolute minimum-cost route between any two services.
- **Breadth-First Search (BFS)**: Perform level-by-level structural traversal.
- **Depth-First Search (DFS)**: Perform deep exploratory traversal, properly handling cyclic dependencies.
- **Execution Metrics**: Live analysis of nodes visited, edges evaluated, and total execution time (often <1ms).
- **History Tracking**: Maintain a local log of prior optimization runs.
- **Robust C Engine**: High-performance, memory-safe backend routing engine built from scratch.

## Core Data Structures
- **Adjacency List**: Used to represent the sparse API graph efficiently, allowing fast neighbor lookup.
- **Binary Min-Heap (Priority Queue)**: Used by Dijkstra's algorithm to retrieve the next cheapest node in O(log V) time.
- **Queue**: Used by BFS to maintain strict level-order processing.
- **Stack / Recursion**: Used by DFS to explore deeply and automatically backtrack.

## Algorithms & Complexity
| Algorithm | Role | Time Complexity | Space Complexity |
|-----------|------|-----------------|------------------|
| **Dijkstra** | Minimum-cost weighted shortest path | `O((V + E) log V)` | `O(V)` |
| **BFS** | Unweighted shortest path / Traversal | `O(V + E)` | `O(V)` |
| **DFS** | Graph structural exploration | `O(V + E)` | `O(V)` (Call Stack) |

*Note: V = Vertices (Nodes), E = Edges*

## Architecture
The system follows a strict three-tier architecture:
1. **Frontend (HTML/CSS/JS)**: Provides the interactive graph builder and visualizations. It contains zero routing logic to prevent spoofing or stale states.
2. **FastAPI Bridge (Python)**: Acts as the intermediary REST API, securely validating payloads and managing the subprocess execution.
3. **C DSA Engine (engine.exe)**: The core executable written in C11. It parses the graph, executes the requested algorithm, and returns the strictly formatted computational result.

## Technologies Used
- **C11** (MinGW GCC Toolchain)
- **Python 3** (FastAPI, Uvicorn)
- **Vanilla HTML5, CSS3, JavaScript**

## How to Run (Windows Only)

### 1. Compile the C Engine
Ensure you have MinGW GCC installed and in your PATH.
```powershell
cd backend/c_engine
gcc -Wall -Wextra -Wpedantic -std=c11 -O2 -o engine.exe main.c graph.c priority_queue.c routing.c input_parser.c output.c
```

### 2. Start the Backend
From the root project directory, run the provided PowerShell script which will create a virtual environment, install requirements, and start the FastAPI server on port 8000:
```powershell
.\start_backend.ps1
```

### 3. Launch the Frontend
Simply open `index.html` in any modern web browser (e.g., via VS Code Live Server or by double-clicking the file).

## Example Execution
**Input Request (JSON):**
```json
{
  "algorithm": "Dijkstra",
  "source": "API_Gateway",
  "destination": "Payment_Service",
  "nodes": ["API_Gateway", "Payment_Service", "Auth_Service"],
  "edges": [
    {"from": "API_Gateway", "to": "Auth_Service", "cost": 2},
    {"from": "Auth_Service", "to": "Payment_Service", "cost": 5}
  ]
}
```
**C Engine Output:**
```
Algorithm: Dijkstra
Source: API_Gateway
Destination: Payment_Service
Reachable: true
TotalCost: 7
VisitedNodes: 3
EdgesEvaluated: 2
ExecutionTimeMs: 0.0000
Route: API_Gateway -> Auth_Service -> Payment_Service
```

## Limitations
- **Local Architecture**: The project runs exclusively as a local process. It is not currently deployed to the cloud.
- **Process-per-Request**: The C engine is executed as a fresh subprocess for every request. While incredibly fast for smaller graphs, a persistent daemonized C backend would be required for enterprise throughput.
- **No Persistent Database**: History and graph modifications are stored entirely in client-side memory and reset upon reload.
- **Input Constraints**: C input parser restricts node names to 63 characters max.

## Future Improvements
- Migration of the C Engine to a persistent C socket server or WebAssembly (Wasm) for elimination of subprocess startup overhead.
- Addition of Bellman-Ford to handle scenarios with negative edge weights.
- Client-side LocalStorage caching to persist graph layouts across sessions.

---

## Key Viva / Review Points

### Why use a Graph?
Microservices and APIs naturally form interconnected networks. Nodes represent the services, and directed edges represent the request paths.

### Why an Adjacency List?
API networks are typically sparse (not every service talks directly to every other service). An adjacency list consumes `O(V + E)` memory, which is vastly superior to an `O(V^2)` adjacency matrix for sparse graphs.

### Why Dijkstra?
Dijkstra's algorithm is mathematically proven to find the absolute minimum-cost path from a single source to all other nodes, provided there are no negative edge costs. 

### Why a Min-Heap?
Dijkstra requires repeatedly extracting the node with the lowest tentative distance. A standard array requires `O(V)` for this search, whereas a binary min-heap reduces extraction to `O(log V)`, drastically improving performance for large networks.

### Why C?
The routing engine was written from scratch in C to demonstrate a deep understanding of memory management, pointer arithmetic, manual data structure implementation, and high-performance execution, fulfilling core computer science academic requirements.

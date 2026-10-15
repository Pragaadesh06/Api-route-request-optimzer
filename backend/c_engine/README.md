# API Request Route Optimizer - C Routing Engine

This is the DSA core implementation for the API Request Route Optimizer. It models APIs as a directed, weighted graph and computes the optimal routing paths using standard graph algorithms implemented completely in standard C.

## Build Instructions (Windows)

To build the main engine and tests using GCC:

```powershell
gcc -Wall -O2 -o engine main.c graph.c priority_queue.c routing.c input_parser.c output.c
gcc -Wall -O2 -o test_engine test_engine.c graph.c priority_queue.c routing.c
```

## Running the Engine

Provide input via standard input. Example format:

```text
SOURCE API_Gateway
DESTINATION Payment
GRAPH:
API_Gateway Auth 4
API_Gateway User 8
Auth Orders 5
User Orders 2
Orders Payment 8
```

Usage:
```powershell
Get-Content sample_input.txt | .\engine.exe
```

## Running Tests

Execute the compiled test suite:

```powershell
.\test_engine.exe
```

## Data Structures & Algorithms Complexity

### Adjacency List (Graph Representation)
- **Space Complexity:** `O(V + E)` where V is the number of vertices (API nodes) and E is the number of directed edges. This allows optimal storage for sparse graphs typically found in microservice architectures.

### Binary Min-Heap (Priority Queue)
- Used in Dijkstra's algorithm to greedily pick the node with the lowest current path cost.
- **Space Complexity:** `O(V)` to store nodes in the heap.
- **Time Complexity:** Push `O(log V)`, Pop Min `O(log V)`.

### Dijkstra's Algorithm
Dijkstra's is the most appropriate algorithm here because API routing costs (latency, hops, processing overhead) are strictly non-negative.
- **Time Complexity:** `O((V + E) log V)` due to the binary min-heap implementation.
- **Space Complexity:** `O(V)` for distance arrays, predecessor arrays, and priority queue.

### Breadth-First Search (BFS)
- Traverses the API network layer by layer. Useful for finding the minimum number of hops if weights are unweighted (or ignored).
- **Time Complexity:** `O(V + E)`
- **Space Complexity:** `O(V)` for the queue and visited array.

### Depth-First Search (DFS)
- Traverses as far as possible along each API branch before backtracking. Useful for detecting cycles or exploring isolated components.
- **Time Complexity:** `O(V + E)`
- **Space Complexity:** `O(V)` for the recursion stack (worst case for a linear graph) and visited array.

*Note: BFS and DFS are traversal algorithms for structural analysis, they are not used as weighted shortest-path algorithms.*

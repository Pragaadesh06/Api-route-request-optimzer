#include "routing.h"
#include "priority_queue.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

void free_routing_result(RoutingResult* result) {
    if (result && result->route_indices) {
        free(result->route_indices);
        result->route_indices = NULL;
    }
}

static RoutingResult create_empty_result(const char* algo, const char* src, const char* dest) {
    RoutingResult r;
    strncpy(r.algorithm, algo, sizeof(r.algorithm) - 1);
    r.algorithm[sizeof(r.algorithm) - 1] = '\0';
    strncpy(r.source, src, sizeof(r.source) - 1);
    r.source[sizeof(r.source) - 1] = '\0';
    strncpy(r.destination, dest, sizeof(r.destination) - 1);
    r.destination[sizeof(r.destination) - 1] = '\0';
    
    r.route_indices = NULL;
    r.route_length = 0;
    r.total_cost = 0;
    r.visited_nodes = 0;
    r.edges_evaluated = 0;
    r.reachable = false;
    r.execution_time_ms = 0.0;
    return r;
}

RoutingResult dijkstra(Graph* g, const char* src_name, const char* dest_name) {
    clock_t start_time = clock();
    RoutingResult res = create_empty_result("Dijkstra", src_name, dest_name);
    
    int src_idx = find_node(g, src_name);
    int dest_idx = find_node(g, dest_name);
    
    if (src_idx == -1 || dest_idx == -1) {
        res.execution_time_ms = ((double)(clock() - start_time)) / CLOCKS_PER_SEC * 1000.0;
        return res;
    }

    int* dist = (int*)malloc(sizeof(int) * g->num_nodes);
    int* prev = (int*)malloc(sizeof(int) * g->num_nodes);
    
    if (!dist || !prev) {
        if (dist) free(dist);
        if (prev) free(prev);
        res.execution_time_ms = ((double)(clock() - start_time)) / CLOCKS_PER_SEC * 1000.0;
        return res;
    }
    
    for (int i = 0; i < g->num_nodes; i++) {
        dist[i] = INF;
        prev[i] = -1;
    }
    
    dist[src_idx] = 0;
    PriorityQueue* pq = pq_create();
    if (!pq) {
        free(dist);
        free(prev);
        res.execution_time_ms = ((double)(clock() - start_time)) / CLOCKS_PER_SEC * 1000.0;
        return res;
    }
    pq_push(pq, src_idx, 0);
    
    while (!pq_is_empty(pq)) {
        PQElement current = pq_pop(pq);
        int u = current.node_index;
        
        if (current.cost > dist[u]) {
            continue; // Stale element
        }
        
        res.visited_nodes++;
        
        if (u == dest_idx) {
            break; // Stop early if destination reached
        }
        
        Edge* edge = g->nodes[u].edges;
        while (edge != NULL) {
            res.edges_evaluated++;
            int v = edge->dest_index;
            int weight = edge->cost;
            
            if (dist[u] != INF && dist[u] + weight >= 0 && dist[u] + weight < dist[v]) {
                dist[v] = dist[u] + weight;
                prev[v] = u;
                pq_push(pq, v, dist[v]);
            }
            edge = edge->next;
        }
    }
    
    if (dist[dest_idx] != INF) {
        res.reachable = true;
        res.total_cost = dist[dest_idx];
        
        // Reconstruct path
        int path_cap = 16;
        int* temp_path = (int*)malloc(sizeof(int) * path_cap);
        if (temp_path) {
            int path_len = 0;
            int curr = dest_idx;
            
            while (curr != -1) {
                if (path_len >= path_cap) {
                    path_cap *= 2;
                    int* expanded = (int*)realloc(temp_path, sizeof(int) * path_cap);
                    if (!expanded) break;
                    temp_path = expanded;
                }
                temp_path[path_len++] = curr;
                curr = prev[curr];
            }
            
            // Reverse path
            res.route_indices = (int*)malloc(sizeof(int) * path_len);
            if (res.route_indices) {
                res.route_length = path_len;
                for (int i = 0; i < path_len; i++) {
                    res.route_indices[i] = temp_path[path_len - 1 - i];
                }
            }
            free(temp_path);
        }
    }
    
    pq_free(pq);
    free(dist);
    free(prev);
    
    res.execution_time_ms = ((double)(clock() - start_time)) / CLOCKS_PER_SEC * 1000.0;
    return res;
}

// Queue for BFS
typedef struct {
    int* data;
    int head;
    int tail;
    int size;
    int capacity;
} IntQueue;

static IntQueue* iq_create(int cap) {
    IntQueue* q = (IntQueue*)malloc(sizeof(IntQueue));
    if (!q) return NULL;
    q->data = (int*)malloc(sizeof(int) * cap);
    if (!q->data) {
        free(q);
        return NULL;
    }
    q->head = 0;
    q->tail = 0;
    q->size = 0;
    q->capacity = cap;
    return q;
}
static void iq_push(IntQueue* q, int val) {
    q->data[q->tail] = val;
    q->tail = (q->tail + 1) % q->capacity;
    q->size++;
}
static int iq_pop(IntQueue* q) {
    int val = q->data[q->head];
    q->head = (q->head + 1) % q->capacity;
    q->size--;
    return val;
}
static void iq_free(IntQueue* q) {
    if (!q) return;
    if (q->data) free(q->data);
    free(q);
}

RoutingResult bfs(Graph* g, const char* src_name, const char* dest_name) {
    clock_t start_time = clock();
    RoutingResult res = create_empty_result("BFS", src_name, dest_name);
    
    int src_idx = find_node(g, src_name);
    int dest_idx = find_node(g, dest_name);
    
    if (src_idx == -1) {
        res.execution_time_ms = ((double)(clock() - start_time)) / CLOCKS_PER_SEC * 1000.0;
        return res;
    }
    
    bool* visited = (bool*)calloc(g->num_nodes, sizeof(bool));
    if (!visited) return res;
    
    IntQueue* q = iq_create(g->num_nodes + 1);
    if (!q) {
        free(visited);
        return res;
    }
    
    int path_cap = 16;
    int* temp_path = (int*)malloc(sizeof(int) * path_cap);
    int path_len = 0;
    
    iq_push(q, src_idx);
    visited[src_idx] = true;
    
    while (q->size > 0) {
        int u = iq_pop(q);
        
        if (path_len >= path_cap) {
            path_cap *= 2;
            int* expanded = (int*)realloc(temp_path, sizeof(int) * path_cap);
            if (!expanded) break;
            temp_path = expanded;
        }
        temp_path[path_len++] = u;
        res.visited_nodes++;
        
        if (dest_idx != -1 && u == dest_idx) {
            res.reachable = true;
            break;
        }
        
        Edge* edge = g->nodes[u].edges;
        while (edge != NULL) {
            res.edges_evaluated++;
            int v = edge->dest_index;
            if (!visited[v]) {
                visited[v] = true;
                iq_push(q, v);
            }
            edge = edge->next;
        }
    }
    
    res.route_indices = (int*)malloc(sizeof(int) * path_len);
    if (res.route_indices) {
        res.route_length = path_len;
        for (int i = 0; i < path_len; i++) {
            res.route_indices[i] = temp_path[i];
        }
    }
    
    // Total cost isn't strictly defined for BFS, leave at 0 or unmeaningful
    res.execution_time_ms = ((double)(clock() - start_time)) / CLOCKS_PER_SEC * 1000.0;
    
    free(temp_path);
    iq_free(q);
    free(visited);
    return res;
}

static void dfs_recursive(Graph* g, int u, int dest_idx, bool* visited, int** path, int* path_len, int* path_cap, RoutingResult* res, bool* found) {
    if (*found) return;
    
    visited[u] = true;
    
    if (*path_len >= *path_cap) {
        *path_cap *= 2;
        int* expanded = (int*)realloc(*path, sizeof(int) * (*path_cap));
        if (!expanded) return;
        *path = expanded;
    }
    (*path)[(*path_len)++] = u;
    res->visited_nodes++;
    
    if (dest_idx != -1 && u == dest_idx) {
        res->reachable = true;
        *found = true;
        return;
    }
    
    Edge* edge = g->nodes[u].edges;
    while (edge != NULL) {
        res->edges_evaluated++;
        int v = edge->dest_index;
        if (!visited[v]) {
            dfs_recursive(g, v, dest_idx, visited, path, path_len, path_cap, res, found);
        }
        edge = edge->next;
    }
}

RoutingResult dfs(Graph* g, const char* src_name, const char* dest_name) {
    clock_t start_time = clock();
    RoutingResult res = create_empty_result("DFS", src_name, dest_name);
    
    int src_idx = find_node(g, src_name);
    int dest_idx = find_node(g, dest_name);
    
    if (src_idx == -1) {
        res.execution_time_ms = ((double)(clock() - start_time)) / CLOCKS_PER_SEC * 1000.0;
        return res;
    }
    
    bool* visited = (bool*)calloc(g->num_nodes, sizeof(bool));
    if (!visited) return res;
    
    int path_cap = 16;
    int* temp_path = (int*)malloc(sizeof(int) * path_cap);
    int path_len = 0;
    bool found = false;
    
    dfs_recursive(g, src_idx, dest_idx, visited, &temp_path, &path_len, &path_cap, &res, &found);
    
    res.route_indices = (int*)malloc(sizeof(int) * path_len);
    if (res.route_indices) {
        res.route_length = path_len;
        for (int i = 0; i < path_len; i++) {
            res.route_indices[i] = temp_path[i];
        }
    }
    
    res.execution_time_ms = ((double)(clock() - start_time)) / CLOCKS_PER_SEC * 1000.0;
    
    free(temp_path);
    free(visited);
    return res;
}

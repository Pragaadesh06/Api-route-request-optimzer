#ifndef ROUTING_H
#define ROUTING_H

#include "graph.h"
#include <stdbool.h>

#define INF 2147483647

typedef struct {
    char algorithm[32];
    char source[MAX_NAME_LEN];
    char destination[MAX_NAME_LEN];
    int* route_indices;
    int route_length;
    int total_cost;
    int visited_nodes;
    int edges_evaluated;
    bool reachable;
    double execution_time_ms;
} RoutingResult;

// Algorithms
RoutingResult dijkstra(Graph* g, const char* src_name, const char* dest_name);
RoutingResult bfs(Graph* g, const char* src_name, const char* dest_name);
RoutingResult dfs(Graph* g, const char* src_name, const char* dest_name);

// Utility to clean up result
void free_routing_result(RoutingResult* result);

#endif

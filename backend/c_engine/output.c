#include "output.h"
#include <stdio.h>

void print_routing_result(const RoutingResult* result, Graph* g) {
    if (!result || !g) return;
    
    printf("--- ROUTING RESULT ---\n");
    printf("Algorithm: %s\n", result->algorithm);
    printf("Source: %s\n", result->source);
    printf("Destination: %s\n", result->destination);
    
    if (result->reachable) {
        printf("Reachable: true\n");
        printf("TotalCost: %d\n", result->total_cost);
        printf("VisitedNodes: %d\n", result->visited_nodes);
        printf("EdgesEvaluated: %d\n", result->edges_evaluated);
        printf("ExecutionTimeMs: %.4f\n", result->execution_time_ms);
        
        printf("Route: ");
        for (int i = 0; i < result->route_length; i++) {
            printf("%s", g->nodes[result->route_indices[i]].name);
            if (i < result->route_length - 1) {
                printf(" -> ");
            }
        }
        printf("\n");
    } else {
        printf("Reachable: false\n");
        printf("VisitedNodes: %d\n", result->visited_nodes);
        printf("EdgesEvaluated: %d\n", result->edges_evaluated);
        printf("ExecutionTimeMs: %.4f\n", result->execution_time_ms);
        printf("Error: No path exists between source and destination.\n");
    }
    printf("----------------------\n");
}

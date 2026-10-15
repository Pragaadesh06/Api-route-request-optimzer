#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "graph.h"
#include "input_parser.h"
#include "routing.h"
#include "output.h"

int main() {
    Graph* g = create_graph();
    if (!g) {
        fprintf(stderr, "Error: Failed to allocate graph\n");
        return 1;
    }
    
    char algo_name[MAX_NAME_LEN] = {0};
    char src_name[MAX_NAME_LEN] = {0};
    char dest_name[MAX_NAME_LEN] = {0};
    
    // Read input format from stdin
    if (!parse_input(g, algo_name, src_name, dest_name)) {
        fprintf(stderr, "Error: Invalid input format or empty graph.\n");
        free_graph(g);
        return 1;
    }
    
    // Run selected algorithm
    RoutingResult result;
    if (strcmp(algo_name, "BFS") == 0) {
        result = bfs(g, src_name, dest_name);
    } else if (strcmp(algo_name, "DFS") == 0) {
        result = dfs(g, src_name, dest_name);
    } else {
        // Default to Dijkstra
        result = dijkstra(g, src_name, dest_name);
    }
    
    // Print machine-readable result
    print_routing_result(&result, g);
    
    // Cleanup
    free_routing_result(&result);
    free_graph(g);
    
    return 0;
}

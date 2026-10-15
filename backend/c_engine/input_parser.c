#include "input_parser.h"
#include <stdio.h>
#include <string.h>
#include <stdbool.h>

bool parse_input(Graph* g, char* algo_name, char* src_name, char* dest_name) {
    char line[256];
    bool src_found = false;
    bool dest_found = false;
    bool in_graph_section = false;
    bool in_nodes_section = false;
    
    // Set default algorithm just in case
    strcpy(algo_name, "Dijkstra");
    
    while (fgets(line, sizeof(line), stdin)) {
        // Strip newline
        line[strcspn(line, "\r\n")] = 0;
        if (strlen(line) == 0) continue;
        
        if (strncmp(line, "ALGORITHM ", 10) == 0) {
            strncpy(algo_name, line + 10, MAX_NAME_LEN - 1);
            algo_name[MAX_NAME_LEN - 1] = '\0';
        }
        else if (strncmp(line, "SOURCE ", 7) == 0) {
            strncpy(src_name, line + 7, MAX_NAME_LEN - 1);
            src_name[MAX_NAME_LEN - 1] = '\0';
            src_found = true;
            add_node(g, src_name);
        }
        else if (strncmp(line, "DESTINATION ", 12) == 0) {
            strncpy(dest_name, line + 12, MAX_NAME_LEN - 1);
            dest_name[MAX_NAME_LEN - 1] = '\0';
            dest_found = true;
            add_node(g, dest_name);
        }
        else if (strcmp(line, "NODES:") == 0) {
            in_nodes_section = true;
            in_graph_section = false;
        }
        else if (strcmp(line, "GRAPH:") == 0) {
            in_graph_section = true;
            in_nodes_section = false;
        }
        else if (in_nodes_section) {
            char name[MAX_NAME_LEN];
            if (sscanf(line, "%63s", name) == 1) {
                add_node(g, name);
            }
        }
        else if (in_graph_section) {
            char u[MAX_NAME_LEN], v[MAX_NAME_LEN];
            int cost;
            if (sscanf(line, "%63s %63s %d", u, v, &cost) == 3) {
                add_edge(g, u, v, cost);
            }
        }
    }
    
    return src_found && dest_found && g->num_nodes > 0;
}

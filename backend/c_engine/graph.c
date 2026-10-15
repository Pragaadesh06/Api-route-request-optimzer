#include "graph.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

Graph* create_graph() {
    Graph* g = (Graph*)malloc(sizeof(Graph));
    if (!g) return NULL;
    g->num_nodes = 0;
    g->max_nodes = INITIAL_MAX_NODES;
    g->nodes = (Node*)malloc(sizeof(Node) * g->max_nodes);
    if (!g->nodes) {
        free(g);
        return NULL;
    }
    return g;
}

void free_graph(Graph* g) {
    if (!g) return;
    for (int i = 0; i < g->num_nodes; i++) {
        Edge* curr = g->nodes[i].edges;
        while (curr != NULL) {
            Edge* temp = curr;
            curr = curr->next;
            free(temp);
        }
    }
    free(g->nodes);
    free(g);
}

int find_node(Graph* g, const char* name) {
    if (!g || !name) return -1;
    for (int i = 0; i < g->num_nodes; i++) {
        if (strcmp(g->nodes[i].name, name) == 0) {
            return i;
        }
    }
    return -1;
}

int add_node(Graph* g, const char* name) {
    if (!g || !name) return -1;
    
    int idx = find_node(g, name);
    if (idx != -1) return idx;
    
    if (g->num_nodes >= g->max_nodes) {
        g->max_nodes *= 2;
        Node* new_nodes = (Node*)realloc(g->nodes, sizeof(Node) * g->max_nodes);
        if (!new_nodes) return -1;
        g->nodes = new_nodes;
    }
    
    idx = g->num_nodes;
    strncpy(g->nodes[idx].name, name, MAX_NAME_LEN - 1);
    g->nodes[idx].name[MAX_NAME_LEN - 1] = '\0';
    g->nodes[idx].edges = NULL;
    
    g->num_nodes++;
    return idx;
}

void add_edge(Graph* g, const char* src, const char* dest, int cost) {
    if (!g || !src || !dest) return;
    
    int src_idx = add_node(g, src);
    int dest_idx = add_node(g, dest);
    
    if (src_idx == -1 || dest_idx == -1) return;
    
    Edge* new_edge = (Edge*)malloc(sizeof(Edge));
    if (!new_edge) return;
    
    new_edge->dest_index = dest_idx;
    new_edge->cost = cost;
    
    // Insert at beginning of adjacency list
    new_edge->next = g->nodes[src_idx].edges;
    g->nodes[src_idx].edges = new_edge;
}

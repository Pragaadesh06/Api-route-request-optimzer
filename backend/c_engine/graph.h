#ifndef GRAPH_H
#define GRAPH_H

#define MAX_NAME_LEN 64
#define INITIAL_MAX_NODES 16

typedef struct Edge {
    int dest_index;
    int cost;
    struct Edge* next;
} Edge;

typedef struct Node {
    char name[MAX_NAME_LEN];
    Edge* edges;
} Node;

typedef struct Graph {
    Node* nodes;
    int num_nodes;
    int max_nodes;
} Graph;

Graph* create_graph();
void free_graph(Graph* g);

// Returns node index, or -1 if not found
int find_node(Graph* g, const char* name);

// Adds a node and returns its index. If it exists, returns existing index.
int add_node(Graph* g, const char* name);

// Adds a directed edge from src to dest with given cost
void add_edge(Graph* g, const char* src, const char* dest, int cost);

#endif

#ifndef PRIORITY_QUEUE_H
#define PRIORITY_QUEUE_H

#define INITIAL_PQ_CAPACITY 32

typedef struct {
    int node_index;
    int cost;
} PQElement;

typedef struct {
    PQElement* data;
    int size;
    int capacity;
} PriorityQueue;

PriorityQueue* pq_create();
void pq_free(PriorityQueue* pq);

void pq_push(PriorityQueue* pq, int node_index, int cost);
PQElement pq_pop(PriorityQueue* pq);
int pq_is_empty(PriorityQueue* pq);

#endif

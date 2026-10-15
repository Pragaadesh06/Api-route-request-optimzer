#include "priority_queue.h"
#include <stdlib.h>

PriorityQueue* pq_create() {
    PriorityQueue* pq = (PriorityQueue*)malloc(sizeof(PriorityQueue));
    if (!pq) return NULL;
    pq->size = 0;
    pq->capacity = INITIAL_PQ_CAPACITY;
    pq->data = (PQElement*)malloc(sizeof(PQElement) * pq->capacity);
    if (!pq->data) {
        free(pq);
        return NULL;
    }
    return pq;
}

void pq_free(PriorityQueue* pq) {
    if (!pq) return;
    free(pq->data);
    free(pq);
}

static void swap(PQElement* a, PQElement* b) {
    PQElement temp = *a;
    *a = *b;
    *b = temp;
}

static void heapify_up(PriorityQueue* pq, int index) {
    while (index > 0) {
        int parent = (index - 1) / 2;
        if (pq->data[parent].cost > pq->data[index].cost) {
            swap(&pq->data[parent], &pq->data[index]);
            index = parent;
        } else {
            break;
        }
    }
}

static void heapify_down(PriorityQueue* pq, int index) {
    int smallest = index;
    int left = 2 * index + 1;
    int right = 2 * index + 2;

    if (left < pq->size && pq->data[left].cost < pq->data[smallest].cost) {
        smallest = left;
    }
    if (right < pq->size && pq->data[right].cost < pq->data[smallest].cost) {
        smallest = right;
    }

    if (smallest != index) {
        swap(&pq->data[index], &pq->data[smallest]);
        heapify_down(pq, smallest);
    }
}

void pq_push(PriorityQueue* pq, int node_index, int cost) {
    if (!pq) return;
    
    if (pq->size == pq->capacity) {
        pq->capacity *= 2;
        PQElement* new_data = (PQElement*)realloc(pq->data, sizeof(PQElement) * pq->capacity);
        if (!new_data) return;
        pq->data = new_data;
    }
    
    pq->data[pq->size].node_index = node_index;
    pq->data[pq->size].cost = cost;
    heapify_up(pq, pq->size);
    pq->size++;
}

PQElement pq_pop(PriorityQueue* pq) {
    PQElement empty = {-1, -1};
    if (!pq || pq->size == 0) return empty;
    
    PQElement min_element = pq->data[0];
    pq->data[0] = pq->data[pq->size - 1];
    pq->size--;
    heapify_down(pq, 0);
    
    return min_element;
}

int pq_is_empty(PriorityQueue* pq) {
    return (!pq || pq->size == 0);
}

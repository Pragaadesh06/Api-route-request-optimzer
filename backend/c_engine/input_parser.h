#ifndef INPUT_PARSER_H
#define INPUT_PARSER_H

#include "graph.h"
#include <stdbool.h>

// Parses input from stdin
// Format:
// ALGORITHM <name>
// SOURCE <node>
// DESTINATION <node>
// GRAPH:
// <src> <dest> <cost>
// ...
// Returns true if parsing succeeds.
// Populates algo_name, src_name, dest_name, and graph g.
bool parse_input(Graph* g, char* algo_name, char* src_name, char* dest_name);

#endif

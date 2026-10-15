from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator, model_validator
import subprocess
import os
import pathlib

app = FastAPI(title="RouteFlow API")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    error_msg = ", ".join([f"{e['loc'][-1]}: {e['msg']}" for e in errors])
    return JSONResponse(
        status_code=422,
        content={"success": False, "error": f"Validation Error - {error_msg}"},
    )

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ENGINE_PATH = pathlib.Path(__file__).parent.parent / "c_engine" / "engine.exe"

class Edge(BaseModel):
    from_: str = Field(alias="from")
    to: str
    cost: int

    @field_validator("cost")
    @classmethod
    def cost_must_be_non_negative(cls, v):
        if v < 0:
            raise ValueError("Cost must not be negative")
        return v
    
    @field_validator("from_", "to")
    @classmethod
    def node_must_not_be_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Node name cannot be empty")
        if len(v) > 63:
            raise ValueError("Node name cannot exceed 63 characters")
        if any(c.isspace() for c in v):
            raise ValueError("Node name cannot contain whitespace")
        return v

class RouteRequest(BaseModel):
    algorithm: str = "Dijkstra"
    source: str
    destination: str
    nodes: list[str]
    edges: list[Edge]

    @field_validator("algorithm")
    @classmethod
    def validate_algorithm(cls, v):
        allowed = ["Dijkstra", "BFS", "DFS"]
        if v not in allowed:
            raise ValueError(f"Unknown algorithm. Supported: {', '.join(allowed)}")
        return v

    @field_validator("nodes")
    @classmethod
    def validate_nodes_list(cls, v):
        if not v:
            raise ValueError("Nodes list cannot be empty")
        for node in v:
            node_clean = node.strip()
            if not node_clean:
                raise ValueError("Node name cannot be empty")
            if len(node_clean) > 63:
                raise ValueError(f"Node name '{node}' cannot exceed 63 characters")
            if any(c.isspace() for c in node_clean):
                raise ValueError(f"Node name '{node}' cannot contain whitespace")
        return [node.strip() for node in v]
        
    @field_validator("source", "destination")
    @classmethod
    def node_must_not_be_empty_str(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Node name cannot be empty")
        return v

    @model_validator(mode='after')
    def check_graph_references(self) -> 'RouteRequest':
        node_set = set(self.nodes)
        if self.source not in node_set:
            raise ValueError(f"Source '{self.source}' must belong to the graph nodes")
        if self.destination not in node_set:
            raise ValueError(f"Destination '{self.destination}' must belong to the graph nodes")
        for edge in self.edges:
            if edge.from_ not in node_set:
                raise ValueError(f"Edge source '{edge.from_}' is not in nodes list")
            if edge.to not in node_set:
                raise ValueError(f"Edge destination '{edge.to}' is not in nodes list")
        return self

@app.get("/api/health")
def health_check():
    engine_exists = ENGINE_PATH.exists()
    if engine_exists:
        return {
            "status": "ok",
            "service": "RouteFlow",
            "c_engine": "available"
        }
    else:
        return {
            "status": "degraded",
            "service": "RouteFlow",
            "c_engine": "unavailable"
        }

@app.post("/api/optimize")
def optimize_route(req: RouteRequest):
    if not ENGINE_PATH.exists():
        raise HTTPException(status_code=503, detail="C ROUTING ENGINE OFFLINE")
        
    # Generate C engine input
    lines = []
    lines.append(f"ALGORITHM {req.algorithm}")
    lines.append(f"SOURCE {req.source}")
    lines.append(f"DESTINATION {req.destination}")
    lines.append("NODES:")
    for node in req.nodes:
        lines.append(node)
    lines.append("GRAPH:")
    for edge in req.edges:
        lines.append(f"{edge.from_} {edge.to} {edge.cost}")
    
    input_data = "\n".join(lines) + "\n"
    
    try:
        # Run C engine
        result = subprocess.run(
            [str(ENGINE_PATH)],
            input=input_data,
            text=True,
            capture_output=True,
            timeout=5.0
        )
        
        if result.returncode != 0:
            err_msg = result.stderr.strip() if result.stderr else "Routing engine execution failed"
            print(f"C Engine Error: {err_msg}")
            raise HTTPException(status_code=400, detail=f"C Engine Error: {err_msg}")
            
        output = result.stdout
        
        # Parse output
        parsed = {
            "success": True,
            "algorithm": "",
            "source": "",
            "destination": "",
            "reachable": False,
            "totalCost": None,
            "visitedNodes": 0,
            "edgesEvaluated": 0,
            "executionTimeMs": 0.0,
            "route": []
        }
        
        for line in output.splitlines():
            line = line.strip()
            if line.startswith("Algorithm:"):
                parsed["algorithm"] = line.split(":", 1)[1].strip()
            elif line.startswith("Source:"):
                parsed["source"] = line.split(":", 1)[1].strip()
            elif line.startswith("Destination:"):
                parsed["destination"] = line.split(":", 1)[1].strip()
            elif line.startswith("Reachable:"):
                val = line.split(":", 1)[1].strip()
                parsed["reachable"] = (val == "true")
            elif line.startswith("TotalCost:"):
                parsed["totalCost"] = int(line.split(":", 1)[1].strip())
            elif line.startswith("VisitedNodes:"):
                parsed["visitedNodes"] = int(line.split(":", 1)[1].strip())
            elif line.startswith("EdgesEvaluated:"):
                parsed["edgesEvaluated"] = int(line.split(":", 1)[1].strip())
            elif line.startswith("ExecutionTimeMs:"):
                parsed["executionTimeMs"] = float(line.split(":", 1)[1].strip())
            elif line.startswith("Route:"):
                route_str = line.split(":", 1)[1].strip()
                if route_str:
                    parsed["route"] = [node.strip() for node in route_str.split("->")]
                    
        if parsed["algorithm"] in ["BFS", "DFS"]:
            parsed["totalCost"] = None
                    
        return parsed
        
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Routing engine timed out")
    except Exception as e:
        print(f"Error executing engine: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

document.addEventListener('DOMContentLoaded', () => {
    initHeadingAnimation();
    initGraphApp();
    initNetworkCanvas();
});

function initHeadingAnimation() {
    const heading = document.getElementById('heroHeading');
    if (!heading) return;
    const text = heading.textContent.trim();
    heading.textContent = '';
    const words = text.split(/\s+/);
    words.forEach((word, index) => {
        const span = document.createElement('span');
        span.textContent = word;
        span.style.animationDelay = `${index * 0.1}s`;
        heading.appendChild(span);
        if (index < words.length - 1) {
            heading.appendChild(document.createTextNode(' '));
        }
    });
}

function initGraphApp() {
    const API_BASE = 'http://127.0.0.1:8000/api';
    
    // ==========================================
    // 1. SINGLE SOURCE OF TRUTH GRAPH STATE
    // ==========================================
    const graph = {
        nodes: [
            "API_Gateway",
            "Auth_Service",
            "User_Service",
            "Product_Service",
            "Order_Service",
            "Payment_Service",
            "Notification_Service"
        ],
        edges: [
            { from: "API_Gateway", to: "Auth_Service", cost: 2 },
            { from: "API_Gateway", to: "Product_Service", cost: 3 },
            { from: "Auth_Service", to: "User_Service", cost: 1 },
            { from: "Auth_Service", to: "Order_Service", cost: 5 },
            { from: "User_Service", to: "Order_Service", cost: 2 },
            { from: "Product_Service", to: "Order_Service", cost: 4 },
            { from: "Order_Service", to: "Payment_Service", cost: 6 },
            { from: "Order_Service", to: "Notification_Service", cost: 1 },
            { from: "Payment_Service", to: "Notification_Service", cost: 2 },
            { from: "API_Gateway", to: "Payment_Service", cost: 20 }
        ],
        positions: {},
        activeResult: null,
        requestId: 0
    };

    // ==========================================
    // 2. DOM ELEMENTS
    // ==========================================
    const sourceSelect = document.getElementById('sourceNode');
    const destSelect = document.getElementById('destinationNode');
    const algoSelect = document.getElementById('algorithmSelect');
    const findRouteBtn = document.getElementById('findRouteBtn');
    const vizRunBtn = document.getElementById('vizRunBtn');
    
    const statusText = document.getElementById('engineStatus');
    const statusIndicator = document.querySelector('.status-indicator');
    const resultContainer = document.getElementById('routeResultContainer');
    const viewOnGraphBtn = document.getElementById('viewOnGraphBtn');
    const vizStatusNotice = document.getElementById('vizStatusNotice');
    
    const statNodeCount = document.getElementById('statNodeCount');
    const statEdgeCount = document.getElementById('statEdgeCount');
    const nodeTagList = document.getElementById('nodeTagList');
    const edgeListBox = document.getElementById('edgeListBox');
    
    const newNodeInput = document.getElementById('newNodeName');
    const addNodeBtn = document.getElementById('addNodeBtn');
    const newEdgeFrom = document.getElementById('newEdgeFrom');
    const newEdgeTo = document.getElementById('newEdgeTo');
    const newEdgeCost = document.getElementById('newEdgeCost');
    const addEdgeBtn = document.getElementById('addEdgeBtn');
    const removeNodeSelect = document.getElementById('removeNodeSelect');
    const removeNodeBtn = document.getElementById('removeNodeBtn');
    const removeEdgeSelect = document.getElementById('removeEdgeSelect');
    const removeEdgeBtn = document.getElementById('removeEdgeBtn');

    const resetLayoutBtn = document.getElementById('resetLayoutBtn');
    const clearRouteHighlightBtn = document.getElementById('clearRouteHighlightBtn');
    
    const insightAlgoName = document.getElementById('explainAlgoName');
    const insightAlgoSteps = document.getElementById('explainAlgoSteps');
    const toggleExplainBtn = document.getElementById('toggleExplainBtn');
    const explainContent = document.getElementById('explainContent');
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // ==========================================
    // 3. CANVAS SETUP & INTERACTIVE DRAGGING
    // ==========================================
    const fgCanvas = document.getElementById('foregroundCanvas');
    const fgCtx = fgCanvas.getContext('2d');
    const container = document.getElementById('fgCanvasContainer');
    
    const NODE_RADIUS = 20;
    let draggingNode = null;
    let dragOffset = { x: 0, y: 0 };
    let isHoveringNode = false;

    function getCanvasLogicalSize() {
        const rect = container.getBoundingClientRect();
        const w = rect.width > 0 ? rect.width : 800;
        const h = rect.height > 0 ? rect.height : 480;
        return { w, h };
    }

    function syncCanvasDimensions() {
        const { w, h } = getCanvasLogicalSize();
        const dpr = window.devicePixelRatio || 1;
        fgCanvas.width = Math.floor(w * dpr);
        fgCanvas.height = Math.floor(h * dpr);
        fgCanvas.style.width = `${w}px`;
        fgCanvas.style.height = `${h}px`;
        fgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function computeDefaultPositions(w, h) {
        const pos = {};
        const padX = 90;
        const padY = 75;
        const innerW = Math.max(w - padX * 2, 280);
        const innerH = Math.max(h - padY * 2, 240);

        // Architectural tiers for microservices demo
        const tiers = {
            "API_Gateway": { col: 0.04, row: 0.5 },
            "Auth_Service": { col: 0.28, row: 0.24 },
            "Product_Service": { col: 0.28, row: 0.76 },
            "User_Service": { col: 0.52, row: 0.24 },
            "Order_Service": { col: 0.70, row: 0.5 },
            "Payment_Service": { col: 0.88, row: 0.24 },
            "Notification_Service": { col: 0.88, row: 0.76 }
        };

        graph.nodes.forEach((node, i) => {
            if (tiers[node]) {
                pos[node] = {
                    x: padX + tiers[node].col * innerW,
                    y: padY + tiers[node].row * innerH
                };
            } else {
                // Dynamically added nodes positioned in open space
                const dynamicNodes = graph.nodes.filter(n => !tiers[n]);
                const dynIdx = dynamicNodes.indexOf(node);
                const count = dynamicNodes.length;
                const arcAngle = Math.PI * 0.25 + (dynIdx / Math.max(count, 1)) * (Math.PI * 0.5);
                pos[node] = {
                    x: padX + 0.40 * innerW + Math.cos(arcAngle) * (innerW * 0.18),
                    y: padY + 0.50 * innerH - Math.sin(arcAngle) * (innerH * 0.24)
                };
            }
        });
        return pos;
    }

    function initOrUpdatePositions(forceReset = false) {
        const { w, h } = getCanvasLogicalSize();
        if (forceReset || Object.keys(graph.positions).length === 0) {
            graph.positions = computeDefaultPositions(w, h);
            return;
        }

        // Ensure newly added nodes get a valid coordinate
        const defaults = computeDefaultPositions(w, h);
        graph.nodes.forEach(n => {
            if (!graph.positions[n]) {
                graph.positions[n] = defaults[n] || { x: w / 2 + (Math.random() * 80 - 40), y: h / 2 + (Math.random() * 80 - 40) };
            }
        });

        // Clean up removed nodes
        Object.keys(graph.positions).forEach(n => {
            if (!graph.nodes.includes(n)) {
                delete graph.positions[n];
            }
        });
    }

    // ==========================================
    // 4. GRAPH RENDERING ENGINE
    // ==========================================
    function renderGraph() {
        const { w, h } = getCanvasLogicalSize();
        fgCtx.clearRect(0, 0, w, h);

        initOrUpdatePositions(false);

        const activeResult = graph.activeResult;
        let activeEdgesSet = new Set();
        let activeNodesList = [];
        let traversalStepMap = {};

        if (activeResult && activeResult.reachable && Array.isArray(activeResult.route)) {
            activeNodesList = activeResult.route;
            activeNodesList.forEach((node, idx) => {
                traversalStepMap[node] = idx + 1;
            });

            if (activeResult.algorithm === 'Dijkstra') {
                for (let i = 0; i < activeResult.route.length - 1; i++) {
                    activeEdgesSet.add(`${activeResult.route[i]}->${activeResult.route[i+1]}`);
                }
            }
        }

        // Draw Edges
        graph.edges.forEach(edge => {
            const p1 = graph.positions[edge.from];
            const p2 = graph.positions[edge.to];
            if (!p1 || !p2) return;

            const isRouteEdge = activeEdgesSet.has(`${edge.from}->${edge.to}`);
            
            // Check if reverse edge exists or if it's the long bypass edge
            const hasReverse = graph.edges.some(e => e.from === edge.to && e.to === edge.from);
            const isBypass = (edge.from === 'API_Gateway' && edge.to === 'Payment_Service') || Math.abs(p2.x - p1.x) > w * 0.6;

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 1) return;

            // Unit direction vector
            const ux = dx / dist;
            const uy = dy / dist;

            // Start and end points stopping at node radius
            const startX = p1.x + ux * NODE_RADIUS;
            const startY = p1.y + uy * NODE_RADIUS;
            const endX = p2.x - ux * (NODE_RADIUS + 3);
            const endY = p2.y - uy * (NODE_RADIUS + 3);

            fgCtx.save();
            fgCtx.beginPath();

            let labelX, labelY, arrowAngle;

            if (hasReverse || isBypass) {
                // Curved quadratic bezier
                let ctrlX, ctrlY;
                if (isBypass) {
                    // Arch cleanly over top nodes (Auth_Service, User_Service)
                    ctrlX = (startX + endX) / 2;
                    ctrlY = -50;
                } else {
                    const perpX = -uy;
                    const perpY = ux;
                    const curveOffset = 32;
                    const midX = (startX + endX) / 2;
                    const midY = (startY + endY) / 2;
                    ctrlX = midX + perpX * curveOffset;
                    ctrlY = midY + perpY * curveOffset;
                }

                fgCtx.moveTo(startX, startY);
                fgCtx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);

                // Quadratic Bézier midpoint formula at t = 0.5
                labelX = 0.25 * startX + 0.5 * ctrlX + 0.25 * endX;
                labelY = 0.25 * startY + 0.5 * ctrlY + 0.25 * endY;

                // Tangent vector at t = 1.0 for arrowhead
                arrowAngle = Math.atan2(endY - ctrlY, endX - ctrlX);
            } else {
                // Straight line
                fgCtx.moveTo(startX, startY);
                fgCtx.lineTo(endX, endY);

                labelX = (startX + endX) / 2;
                labelY = (startY + endY) / 2;
                arrowAngle = Math.atan2(dy, dx);
            }

            if (isRouteEdge) {
                fgCtx.strokeStyle = '#10b981';
                fgCtx.lineWidth = 3.5;
                fgCtx.shadowColor = 'rgba(16, 185, 129, 0.6)';
                fgCtx.shadowBlur = 12;
            } else {
                fgCtx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
                fgCtx.lineWidth = 1.5;
                fgCtx.shadowBlur = 0;
            }
            fgCtx.stroke();
            fgCtx.restore();

            // Arrowhead
            const arrowLen = isRouteEdge ? 11 : 9;
            fgCtx.save();
            fgCtx.beginPath();
            fgCtx.moveTo(endX, endY);
            fgCtx.lineTo(
                endX - arrowLen * Math.cos(arrowAngle - Math.PI / 6),
                endY - arrowLen * Math.sin(arrowAngle - Math.PI / 6)
            );
            fgCtx.lineTo(
                endX - arrowLen * Math.cos(arrowAngle + Math.PI / 6),
                endY - arrowLen * Math.sin(arrowAngle + Math.PI / 6)
            );
            fgCtx.closePath();
            fgCtx.fillStyle = isRouteEdge ? '#10b981' : 'rgba(255, 255, 255, 0.45)';
            if (isRouteEdge) {
                fgCtx.shadowColor = '#10b981';
                fgCtx.shadowBlur = 8;
            }
            fgCtx.fill();
            fgCtx.restore();

            // Cost Badge
            const costText = `${edge.cost}`;
            fgCtx.font = '600 11px Inter, sans-serif';
            const textMetrics = fgCtx.measureText(costText);
            const badgeW = Math.max(textMetrics.width + 10, 20);
            const badgeH = 17;

            fgCtx.save();
            fgCtx.fillStyle = isRouteEdge ? 'rgba(6, 78, 59, 0.95)' : 'rgba(15, 23, 42, 0.92)';
            fgCtx.strokeStyle = isRouteEdge ? '#10b981' : 'rgba(255, 255, 255, 0.15)';
            fgCtx.lineWidth = 1;
            
            // Rounded rect for badge
            roundRect(fgCtx, labelX - badgeW / 2, labelY - badgeH / 2, badgeW, badgeH, 4);
            fgCtx.fill();
            fgCtx.stroke();

            fgCtx.fillStyle = isRouteEdge ? '#34d399' : '#e2e8f0';
            fgCtx.textAlign = 'center';
            fgCtx.textBaseline = 'middle';
            fgCtx.fillText(costText, labelX, labelY);
            fgCtx.restore();
        });

        // Draw Nodes
        graph.nodes.forEach(node => {
            const pos = graph.positions[node];
            if (!pos) return;

            const isSource = (activeResult && node === activeResult.source) || (sourceSelect && node === sourceSelect.value);
            const isDest = (activeResult && node === activeResult.destination) || (destSelect && node === destSelect.value);
            const isInRoute = activeNodesList.includes(node);
            const isDijkstraOptimal = isInRoute && activeResult && activeResult.algorithm === 'Dijkstra';
            const isTraversed = isInRoute && activeResult && (activeResult.algorithm === 'BFS' || activeResult.algorithm === 'DFS');

            fgCtx.save();
            
            // Outer glow pulse when active
            if (isDijkstraOptimal || isTraversed) {
                fgCtx.beginPath();
                fgCtx.arc(pos.x, pos.y, NODE_RADIUS + 5, 0, Math.PI * 2);
                fgCtx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
                fgCtx.lineWidth = 2.5;
                fgCtx.stroke();
            }

            // Node Circle
            fgCtx.beginPath();
            fgCtx.arc(pos.x, pos.y, NODE_RADIUS, 0, Math.PI * 2);

            let grad = fgCtx.createRadialGradient(pos.x - 4, pos.y - 4, 2, pos.x, pos.y, NODE_RADIUS);
            
            if (isSource) {
                grad.addColorStop(0, '#60a5fa');
                grad.addColorStop(1, '#2563eb');
                fgCtx.strokeStyle = '#93c5fd';
                fgCtx.shadowColor = '#3b82f6';
                fgCtx.shadowBlur = 16;
            } else if (isDest) {
                grad.addColorStop(0, '#c084fc');
                grad.addColorStop(1, '#7e22ce');
                fgCtx.strokeStyle = '#e9d5ff';
                fgCtx.shadowColor = '#a855f7';
                fgCtx.shadowBlur = 16;
            } else if (isDijkstraOptimal || isTraversed) {
                grad.addColorStop(0, '#34d399');
                grad.addColorStop(1, '#059669');
                fgCtx.strokeStyle = '#a7f3d0';
                fgCtx.shadowColor = '#10b981';
                fgCtx.shadowBlur = 16;
            } else {
                grad.addColorStop(0, '#1e293b');
                grad.addColorStop(1, '#0f172a');
                fgCtx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
                fgCtx.shadowColor = 'rgba(56, 189, 248, 0.2)';
                fgCtx.shadowBlur = 8;
            }

            fgCtx.fillStyle = grad;
            fgCtx.lineWidth = 2;
            fgCtx.fill();
            fgCtx.stroke();
            fgCtx.restore();

            // Inner icon or step badge for traversal
            if (isTraversed && traversalStepMap[node]) {
                fgCtx.save();
                fgCtx.fillStyle = '#ffffff';
                fgCtx.font = 'bold 11px Inter, sans-serif';
                fgCtx.textAlign = 'center';
                fgCtx.textBaseline = 'middle';
                fgCtx.fillText(`${traversalStepMap[node]}`, pos.x, pos.y);
                fgCtx.restore();
            } else {
                // Subtle inner core dot
                fgCtx.save();
                fgCtx.beginPath();
                fgCtx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
                fgCtx.fillStyle = isSource || isDest || isInRoute ? '#ffffff' : '#38bdf8';
                fgCtx.fill();
                fgCtx.restore();
            }

            // Node Label below or above marker based on vertical position
            fgCtx.save();
            fgCtx.font = '600 11.5px Inter, sans-serif';
            fgCtx.textAlign = 'center';
            
            // If node is in upper half of canvas, render label ABOVE the node marker;
            // if in lower half or middle, render BELOW the node marker.
            // This prevents labels of Auth_Service and User_Service from colliding with horizontal/cross edges.
            const isUpper = pos.y < h * 0.45;
            const labelY = isUpper ? (pos.y - NODE_RADIUS - 6) : (pos.y + NODE_RADIUS + 6);
            fgCtx.textBaseline = isUpper ? 'bottom' : 'top';

            // High-contrast halo outline so text is always crisp over any edge lines
            fgCtx.lineWidth = 3.5;
            fgCtx.strokeStyle = 'rgba(6, 8, 10, 0.95)';
            fgCtx.strokeText(node, pos.x, labelY);

            fgCtx.fillStyle = isInRoute ? '#34d399' : (isSource ? '#93c5fd' : (isDest ? '#e9d5ff' : '#f1f5f9'));
            fgCtx.fillText(node, pos.x, labelY);
            fgCtx.restore();
        });
    }

    function roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    // ==========================================
    // 5. MOUSE & DRAG EVENT HANDLERS
    // ==========================================
    function getPointerPos(e) {
        const rect = fgCanvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function findNodeAt(px, py) {
        for (let i = graph.nodes.length - 1; i >= 0; i--) {
            const node = graph.nodes[i];
            const pos = graph.positions[node];
            if (pos && Math.hypot(px - pos.x, py - pos.y) <= NODE_RADIUS + 4) {
                return node;
            }
        }
        return null;
    }

    fgCanvas.addEventListener('mousedown', (e) => {
        const { x, y } = getPointerPos(e);
        const hit = findNodeAt(x, y);
        if (hit) {
            draggingNode = hit;
            dragOffset.x = x - graph.positions[hit].x;
            dragOffset.y = y - graph.positions[hit].y;
            fgCanvas.style.cursor = 'grabbing';
        }
    });

    window.addEventListener('mousemove', (e) => {
        const { w, h } = getCanvasLogicalSize();
        if (draggingNode) {
            const { x, y } = getPointerPos(e);
            const nx = Math.max(NODE_RADIUS + 10, Math.min(w - NODE_RADIUS - 10, x - dragOffset.x));
            const ny = Math.max(NODE_RADIUS + 10, Math.min(h - NODE_RADIUS - 24, y - dragOffset.y));
            graph.positions[draggingNode] = { x: nx, y: ny };
            renderGraph();
        } else {
            const { x, y } = getPointerPos(e);
            const hit = findNodeAt(x, y);
            if (hit !== isHoveringNode) {
                isHoveringNode = !!hit;
                fgCanvas.style.cursor = hit ? 'grab' : 'default';
            }
        }
    });

    window.addEventListener('mouseup', () => {
        if (draggingNode) {
            draggingNode = null;
            fgCanvas.style.cursor = isHoveringNode ? 'grab' : 'default';
        }
    });

    // Touch support
    fgCanvas.addEventListener('touchstart', (e) => {
        const { x, y } = getPointerPos(e);
        const hit = findNodeAt(x, y);
        if (hit) {
            draggingNode = hit;
            dragOffset.x = x - graph.positions[hit].x;
            dragOffset.y = y - graph.positions[hit].y;
            e.preventDefault();
        }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (!draggingNode) return;
        const { w, h } = getCanvasLogicalSize();
        const { x, y } = getPointerPos(e);
        const nx = Math.max(NODE_RADIUS + 10, Math.min(w - NODE_RADIUS - 10, x - dragOffset.x));
        const ny = Math.max(NODE_RADIUS + 10, Math.min(h - NODE_RADIUS - 24, y - dragOffset.y));
        graph.positions[draggingNode] = { x: nx, y: ny };
        renderGraph();
    }, { passive: false });

    window.addEventListener('touchend', () => {
        draggingNode = null;
    });

    window.addEventListener('resize', () => {
        syncCanvasDimensions();
        renderGraph();
    });

    // ==========================================
    // 6. UI SYNCHRONIZATION (THE 7 TARGETS)
    // ==========================================
    function updateStats() {
        if (statNodeCount) statNodeCount.textContent = `Nodes: ${graph.nodes.length}`;
        if (statEdgeCount) statEdgeCount.textContent = `Edges: ${graph.edges.length}`;
        const nodeBadge = document.getElementById('nodeCountBadge');
        const edgeBadge = document.getElementById('edgeCountBadge');
        if (nodeBadge) nodeBadge.textContent = `${graph.nodes.length}`;
        if (edgeBadge) edgeBadge.textContent = `${graph.edges.length}`;
    }

    function updateSelects() {
        const prevSource = sourceSelect.value;
        const prevDest = destSelect.value;
        const prevEdgeFrom = newEdgeFrom.value;
        const prevEdgeTo = newEdgeTo.value;

        const nodeOptions = graph.nodes.map(n => `<option value="${n}">${n}</option>`).join('');

        sourceSelect.innerHTML = nodeOptions;
        destSelect.innerHTML = nodeOptions;
        newEdgeFrom.innerHTML = nodeOptions;
        newEdgeTo.innerHTML = nodeOptions;
        removeNodeSelect.innerHTML = nodeOptions;

        if (graph.nodes.includes(prevSource)) {
            sourceSelect.value = prevSource;
        } else if (graph.nodes.length > 0) {
            sourceSelect.value = graph.nodes[0];
        }

        if (graph.nodes.includes(prevDest)) {
            destSelect.value = prevDest;
        } else if (graph.nodes.length > 1) {
            destSelect.value = graph.nodes[graph.nodes.length - 2];
        } else if (graph.nodes.length > 0) {
            destSelect.value = graph.nodes[0];
        }

        if (graph.nodes.includes(prevEdgeFrom)) newEdgeFrom.value = prevEdgeFrom;
        if (graph.nodes.includes(prevEdgeTo)) newEdgeTo.value = prevEdgeTo;

        // Edge options for quick removal
        const edgeOptions = graph.edges.map(e => 
            `<option value="${e.from}->${e.to}">${e.from} → ${e.to} (cost ${e.cost})</option>`
        ).join('');
        removeEdgeSelect.innerHTML = edgeOptions;
    }

    function renderNodeList() {
        if (!nodeTagList) return;
        if (graph.nodes.length === 0) {
            nodeTagList.innerHTML = `<span class="hint-muted">No nodes yet.</span>`;
            return;
        }
        nodeTagList.innerHTML = graph.nodes.map(n => `
            <div class="node-chip" title="${n}">
                <span>${n}</span>
                <button class="chip-del-btn" data-node="${n}" aria-label="Delete ${n}">&times;</button>
            </div>
        `).join('');

        nodeTagList.querySelectorAll('.chip-del-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeNode(btn.dataset.node);
            });
        });
    }

    function renderEdgeList() {
        if (!edgeListBox) return;
        if (graph.edges.length === 0) {
            edgeListBox.innerHTML = `<span class="hint-muted">No edges yet.</span>`;
            return;
        }
        edgeListBox.innerHTML = graph.edges.map(e => `
            <div class="edge-item-row">
                <div class="edge-item-desc">
                    <span>${e.from}</span>
                    <span style="color:var(--text-muted)">→</span>
                    <span>${e.to}</span>
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span class="edge-cost-badge">cost: ${e.cost}</span>
                    <button class="chip-del-btn" data-edge="${e.from}->${e.to}" aria-label="Delete edge">&times;</button>
                </div>
            </div>
        `).join('');

        edgeListBox.querySelectorAll('.chip-del-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const [from, to] = btn.dataset.edge.split('->');
                removeEdge(from, to);
            });
        });
    }

    function invalidateOldResult() {
        graph.activeResult = null;
        graph.requestId++;
        if (resultContainer) {
            resultContainer.classList.add('hidden');
        }
        if (vizStatusNotice) {
            vizStatusNotice.textContent = 'Graph modified • Ready to run';
            vizStatusNotice.style.color = '#f59e0b';
        }
    }

    function fullStateSync(invalidateResult = true) {
        if (invalidateResult) {
            invalidateOldResult();
        }
        updateStats();
        updateSelects();
        renderNodeList();
        renderEdgeList();
        renderGraph();
    }

    // ==========================================
    // 7. GRAPH EDITING ACTIONS
    // ==========================================
    function addNode(rawName) {
        const name = (rawName || '').trim().replace(/\s+/g, '_');
        if (!name) {
            alert("Node name cannot be empty.");
            return false;
        }
        if (name.length > 63) {
            alert("Node name must be 63 characters or fewer.");
            return false;
        }
        if (graph.nodes.includes(name)) {
            alert(`Node "${name}" already exists.`);
            return false;
        }

        graph.nodes.push(name);
        initOrUpdatePositions(false);
        fullStateSync(true);
        return true;
    }

    function removeNode(name) {
        if (!name || !graph.nodes.includes(name)) return;
        graph.nodes = graph.nodes.filter(n => n !== name);
        graph.edges = graph.edges.filter(e => e.from !== name && e.to !== name);
        delete graph.positions[name];
        fullStateSync(true);
    }

    function addEdge(from, to, costVal) {
        if (!from || !to) {
            alert("Select valid source and destination nodes.");
            return false;
        }
        if (from === to) {
            alert("Self-loops are not allowed.");
            return false;
        }
        const cost = parseInt(costVal, 10);
        if (isNaN(cost) || cost < 0) {
            alert("Edge cost must be a non-negative integer.");
            return false;
        }
        if (graph.edges.some(e => e.from === from && e.to === to)) {
            alert(`Edge from ${from} to ${to} already exists. Remove it first to change cost.`);
            return false;
        }

        graph.edges.push({ from, to, cost });
        fullStateSync(true);
        return true;
    }

    function removeEdge(from, to) {
        if (!from || !to) return;
        graph.edges = graph.edges.filter(e => !(e.from === from && e.to === to));
        fullStateSync(true);
    }

    // Attach Event Listeners to Controls
    addNodeBtn.addEventListener('click', () => {
        if (addNode(newNodeInput.value)) {
            newNodeInput.value = '';
        }
    });

    newNodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (addNode(newNodeInput.value)) {
                newNodeInput.value = '';
            }
        }
    });

    addEdgeBtn.addEventListener('click', () => {
        if (addEdge(newEdgeFrom.value, newEdgeTo.value, newEdgeCost.value)) {
            newEdgeCost.value = '';
        }
    });

    removeNodeBtn.addEventListener('click', () => {
        removeNode(removeNodeSelect.value);
    });

    removeEdgeBtn.addEventListener('click', () => {
        const val = removeEdgeSelect.value;
        if (!val) return;
        const [from, to] = val.split('->');
        removeEdge(from, to);
    });

    resetLayoutBtn.addEventListener('click', () => {
        initOrUpdatePositions(true);
        renderGraph();
    });

    clearRouteHighlightBtn.addEventListener('click', () => {
        graph.activeResult = null;
        if (resultContainer) resultContainer.classList.add('hidden');
        if (vizStatusNotice) {
            vizStatusNotice.textContent = 'Highlight cleared';
            vizStatusNotice.style.color = 'var(--text-muted)';
        }
        renderGraph();
    });

    if (viewOnGraphBtn) {
        viewOnGraphBtn.addEventListener('click', () => {
            const section = document.getElementById('graph-builder-section');
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    sourceSelect.addEventListener('change', renderGraph);
    destSelect.addEventListener('change', renderGraph);

    // ==========================================
    // 8. HEALTH CHECK & MONITORING
    // ==========================================
    function setOnlineStatus() {
        if (!statusIndicator) return;
        statusIndicator.classList.remove('processing', 'error', 'offline', 'connecting');
        statusText.textContent = 'C DSA ENGINE • ONLINE';
        statusText.style.color = '#10b981';
    }

    function setOfflineStatus(msg = 'C ROUTING ENGINE OFFLINE') {
        if (!statusIndicator) return;
        statusIndicator.classList.remove('processing', 'connecting');
        statusIndicator.classList.add('offline');
        statusText.textContent = msg;
        statusText.style.color = '#ef4444';
    }

    function checkHealth() {
        fetch(`${API_BASE}/health`)
            .then(res => {
                if (!res.ok) throw new Error("HTTP error");
                return res.json();
            })
            .then(data => {
                if (data.status === 'ok' && data.c_engine === 'available') {
                    setOnlineStatus();
                } else {
                    setOfflineStatus('C ENGINE BINARY MISSING');
                }
            })
            .catch(() => {
                setOfflineStatus();
            });
    }

    checkHealth();
    setInterval(checkHealth, 5000);

    // ==========================================
    // 9. ROUTE EXECUTION & BACKEND BRIDGE
    // ==========================================
    function setButtonLoading(isLoading) {
        const btns = [findRouteBtn, vizRunBtn].filter(Boolean);
        btns.forEach(btn => {
            btn.disabled = isLoading;
            if (isLoading) {
                btn.innerHTML = `
                    <span>Running Engine...</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
                        <path d="M21 12a9 9 0 11-6.219-8.56"></path>
                    </svg>
                `;
                const svg = btn.querySelector('.spin');
                if (svg) svg.style.animation = 'spin 1s linear infinite';
            } else {
                btn.innerHTML = btn === findRouteBtn ? `
                    <span>Find Optimal Route</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                ` : `<span>Run Selected Algorithm</span>`;
            }
        });

        if (statusIndicator) {
            if (isLoading) {
                statusIndicator.classList.add('processing');
                statusText.textContent = 'OPTIMIZING VIA C ENGINE...';
                statusText.style.color = '#38bdf8';
            } else {
                statusIndicator.classList.remove('processing');
            }
        }
    }

    function executeRoute() {
        const source = sourceSelect.value;
        const dest = destSelect.value;
        const algorithm = algoSelect.value;

        if (!source || !dest) {
            alert("Please select both source and destination API nodes.");
            return;
        }
        if (graph.nodes.length === 0) {
            alert("The graph has no nodes.");
            return;
        }

        const currentRequestId = ++graph.requestId;
        setButtonLoading(true);

        const payload = {
            algorithm: algorithm,
            source: source,
            destination: dest,
            nodes: graph.nodes,
            edges: graph.edges
        };

        fetch(`${API_BASE}/optimize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(async (res) => {
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || data.detail || `Server error (${res.status})`);
            }
            return data;
        })
        .then(data => {
            // Guard against stale response race conditions
            if (currentRequestId !== graph.requestId) return;

            setButtonLoading(false);
            setOnlineStatus();

            graph.activeResult = data;
            displayResult(data);
            addToHistory(data);
            renderGraph();

            if (vizStatusNotice) {
                if (data.reachable) {
                    vizStatusNotice.textContent = data.algorithm === 'Dijkstra' 
                        ? `Optimal Route: cost ${data.totalCost} (${data.executionTimeMs.toFixed(3)}ms)`
                        : `${data.algorithm} Traversal: ${data.route.length} nodes visited`;
                    vizStatusNotice.style.color = '#10b981';
                } else {
                    vizStatusNotice.textContent = `Unreachable: No route from ${data.source} to ${data.destination}`;
                    vizStatusNotice.style.color = '#ef4444';
                }
            }
        })
        .catch(err => {
            if (currentRequestId !== graph.requestId) return;
            setButtonLoading(false);
            alert(`Optimization Failed: ${err.message}`);
            checkHealth();
        });
    }

    findRouteBtn.addEventListener('click', executeRoute);
    if (vizRunBtn) vizRunBtn.addEventListener('click', executeRoute);

    // ==========================================
    // 10. RESULT VISUALIZATION
    // ==========================================
    function displayResult(data) {
        if (!resultContainer) return;
        resultContainer.classList.remove('hidden');

        const pathContainer = document.getElementById('resRoutePath');
        const computedPathLabel = document.getElementById('computedPathLabel');
        const metricCostContainer = document.getElementById('metricCostContainer');
        const resVisited = document.getElementById('resVisited');
        const resEdges = document.getElementById('resEdges');
        const resTime = document.getElementById('resTime');
        const resCost = document.getElementById('resCost');
        const resultHeaderTitle = document.getElementById('resultHeaderTitle');

        if (resVisited) resVisited.textContent = data.visitedNodes ?? 0;
        if (resEdges) resEdges.textContent = data.edgesEvaluated ?? 0;
        if (resTime) resTime.textContent = data.executionTimeMs != null ? `${data.executionTimeMs.toFixed(4)} ms` : '0.0000 ms';

        if (resultHeaderTitle) {
            resultHeaderTitle.textContent = `${data.algorithm.toUpperCase()} RESULT`;
        }

        if (data.algorithm === 'BFS' || data.algorithm === 'DFS') {
            if (computedPathLabel) computedPathLabel.textContent = `${data.algorithm} TRAVERSAL SEQUENCE`;
            if (metricCostContainer) metricCostContainer.style.display = 'none';
        } else {
            if (computedPathLabel) computedPathLabel.textContent = 'MINIMUM-COST ROUTE';
            if (metricCostContainer) metricCostContainer.style.display = 'flex';
        }

        pathContainer.innerHTML = '';

        if (data.reachable && Array.isArray(data.route) && data.route.length > 0) {
            if (resCost && data.totalCost !== null) {
                resCost.textContent = `${data.totalCost}`;
            }

            data.route.forEach((node, idx) => {
                const nodeDiv = document.createElement('div');
                nodeDiv.className = 'route-node';
                nodeDiv.textContent = (data.algorithm === 'BFS' || data.algorithm === 'DFS')
                    ? `${idx + 1}. ${node}`
                    : node;
                pathContainer.appendChild(nodeDiv);

                if (idx < data.route.length - 1) {
                    const arrowDiv = document.createElement('div');
                    arrowDiv.className = 'route-arrow';
                    arrowDiv.textContent = '→';
                    pathContainer.appendChild(arrowDiv);
                }
            });
        } else {
            if (resCost) resCost.textContent = 'UNREACHABLE';
            pathContainer.innerHTML = `<div class="route-node" style="color:#ef4444; border-color:#ef4444; background:rgba(239,68,68,0.1);">No path exists between ${data.source} and ${data.destination}</div>`;
        }
    }

    function addToHistory(data) {
        if (!historyList) return;
        const item = document.createElement('div');
        item.className = 'history-item';

        const time = new Date().toLocaleTimeString();
        let costHtml = data.totalCost !== null ? `<div class="history-cost">${data.totalCost}</div>` : `<div class="history-cost" style="font-size:0.9rem; color:var(--text-muted)">N/A</div>`;
        if (!data.reachable) costHtml = `<div class="history-cost" style="color:#ef4444; font-size:0.85rem;">FAIL</div>`;

        item.innerHTML = `
            <div class="history-item-main">
                <div class="history-route"><span class="h-algo">${data.algorithm.toUpperCase()}</span> • ${data.source} → ${data.destination}</div>
                <div class="history-details">${time} | Visited: ${data.visitedNodes} | Evaluated: ${data.edgesEvaluated} | ${data.executionTimeMs.toFixed(2)}ms</div>
            </div>
            ${costHtml}
        `;

        const empty = historyList.querySelector('.empty-state');
        if (empty) empty.remove();
        historyList.prepend(item);
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            historyList.innerHTML = '<div class="empty-state">No requests yet.</div>';
        });
    }

    // ==========================================
    // 11. ALGORITHM EXPLANATION PANEL
    // ==========================================
    algoSelect.addEventListener('change', updateInsightPanel);

    function updateInsightPanel() {
        const algo = algoSelect.value;
        if (!insightAlgoName || !insightAlgoSteps) return;

        if (algo === 'Dijkstra') {
            insightAlgoName.textContent = 'Dijkstra';
            insightAlgoSteps.innerHTML = `
                <li>Start at the source node with distance 0; all other nodes have distance &infin;.</li>
                <li>Insert source into binary min-heap priority queue.</li>
                <li>Pop the lowest-cost unvisited node in O(log V) time.</li>
                <li>Relax outgoing edges: if distance through current node is cheaper, update distance and predecessor.</li>
                <li>Push updated neighbor into min-heap.</li>
                <li>Stop when the destination node is reached or min-heap becomes empty.</li>
                <li>Reconstruct the minimum-cost route by backtracking predecessors.</li>
            `;
        } else if (algo === 'BFS') {
            insightAlgoName.textContent = 'Breadth-First Search (BFS)';
            insightAlgoSteps.innerHTML = `
                <li>Enqueue the source node and mark it as visited.</li>
                <li>Dequeue a node and record it in the traversal sequence.</li>
                <li>If the dequeued node is the destination, terminate traversal.</li>
                <li>Examine all outgoing edges; for each unvisited neighbor, mark visited and enqueue.</li>
                <li>Continues level-by-level using a FIFO queue.</li>
                <li>Returns traversal order and finds unweighted shortest hops.</li>
            `;
        } else if (algo === 'DFS') {
            insightAlgoName.textContent = 'Depth-First Search (DFS)';
            insightAlgoSteps.innerHTML = `
                <li>Visit the current node and push to recursion stack / record in traversal sequence.</li>
                <li>If current node is the destination, flag reached and terminate.</li>
                <li>Recursively explore the first unvisited neighbor down the path.</li>
                <li>Backtrack automatically when a dead-end or cycle is encountered.</li>
                <li>Useful for topological ordering and deep service dependency inspection.</li>
            `;
        }
    }

    if (toggleExplainBtn && explainContent) {
        let explainVisible = true;
        toggleExplainBtn.addEventListener('click', () => {
            explainVisible = !explainVisible;
            explainContent.style.display = explainVisible ? 'block' : 'none';
            toggleExplainBtn.textContent = explainVisible ? 'Hide' : 'Show';
        });
    }

    // ==========================================
    // 12. INITIALIZATION
    // ==========================================
    syncCanvasDimensions();
    initOrUpdatePositions(true);
    fullStateSync(false);
    updateInsightPanel();
}

// Background network animation
function initNetworkCanvas() {
    const canvas = document.getElementById('networkCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); 
    let width, height;
    let nodes = [];
    let edges = [];
    let packets = [];
    const config = {
        nodeCount: Math.min(Math.floor(window.innerWidth / 15), 100),
        connectionRadius: 150,
        packetSpawnRate: 0.05,
        nodeSpeed: 0.2,
        colors: {
            bg: '#06080a',
            node: 'rgba(56, 189, 248, 0.4)',
            edge: 'rgba(255, 255, 255, 0.05)',
            edgeActive: 'rgba(56, 189, 248, 0.15)',
            packet: '#38bdf8'
        }
    };
    let mouse = { x: -1000, y: -1000, radius: 200 };
    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', () => { resize(); initNodes(); });
    window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('mouseout', () => { mouse.x = -1000; mouse.y = -1000; });
    class Node {
        constructor() {
            this.x = Math.random() * width; this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * config.nodeSpeed; this.vy = (Math.random() - 0.5) * config.nodeSpeed;
            this.radius = Math.random() * 2 + 1;
        }
        update() {
            this.x += this.vx; this.y += this.vy;
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
            const dx = mouse.x - this.x; const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < mouse.radius) {
                const force = (mouse.radius - distance) / mouse.radius;
                this.x -= dx * force * 0.02; this.y -= dy * force * 0.02;
            }
        }
        draw() {
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = config.colors.node; ctx.fill();
        }
    }
    class Packet {
        constructor(startNode, endNode) {
            this.startNode = startNode; this.endNode = endNode;
            this.progress = 0; this.speed = Math.random() * 0.01 + 0.01;
            this.active = true;
        }
        update() {
            this.progress += this.speed;
            if (this.progress >= 1) this.active = false;
        }
        draw() {
            const x = this.startNode.x + (this.endNode.x - this.startNode.x) * this.progress;
            const y = this.startNode.y + (this.endNode.y - this.startNode.y) * this.progress;
            ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fillStyle = config.colors.packet; ctx.fill();
            ctx.shadowBlur = 10; ctx.shadowColor = config.colors.packet;
            ctx.fill(); ctx.shadowBlur = 0;
        }
    }
    function initNodes() {
        nodes = []; edges = []; packets = [];
        config.nodeCount = Math.min(Math.floor(window.innerWidth / 15), 100);
        for (let i = 0; i < config.nodeCount; i++) nodes.push(new Node());
    }
    function updateEdges() {
        edges = [];
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x; const dy = nodes[i].y - nodes[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < config.connectionRadius) {
                    const alpha = 1 - (distance / config.connectionRadius);
                    edges.push({ n1: nodes[i], n2: nodes[j], alpha: alpha, distance: distance });
                    if (Math.random() < config.packetSpawnRate * alpha * 0.1) packets.push(new Packet(nodes[i], nodes[j]));
                }
            }
        }
    }
    function animate() {
        ctx.fillStyle = config.colors.bg; ctx.fillRect(0, 0, width, height);
        nodes.forEach(node => { node.update(); node.draw(); });
        updateEdges();
        edges.forEach(edge => {
            ctx.beginPath(); ctx.moveTo(edge.n1.x, edge.n1.y); ctx.lineTo(edge.n2.x, edge.n2.y);
            const hasPacket = packets.some(p => (p.startNode === edge.n1 && p.endNode === edge.n2) || (p.startNode === edge.n2 && p.endNode === edge.n1));
            if (hasPacket) { ctx.strokeStyle = `rgba(56, 189, 248, ${edge.alpha * 0.5})`; ctx.lineWidth = 1.5; } 
            else { ctx.strokeStyle = `rgba(255, 255, 255, ${edge.alpha * 0.05})`; ctx.lineWidth = 1; }
            ctx.stroke();
        });
        for (let i = packets.length - 1; i >= 0; i--) {
            packets[i].update();
            if (!packets[i].active) packets.splice(i, 1);
            else packets[i].draw();
        }
        requestAnimationFrame(animate);
    }
    resize(); initNodes(); animate();
}

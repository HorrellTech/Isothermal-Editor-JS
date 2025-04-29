function create_pathfinding_module() {
    return engine.module("pathfinding", {
        // Pathfinding properties
        grid: null,                 // Navigation grid
        grid_width: 0,              // Grid width in cells
        grid_height: 0,             // Grid height in cells
        cell_size: 32,              // Size of each grid cell
        path: [],                   // Current path (array of {x,y} points)
        target_x: null,             // Target X position
        target_y: null,             // Target Y position
        current_node: 0,            // Current node in path
        auto_repath: true,          // Automatically recalculate path when blocked
        repath_interval: 1,         // Seconds between path recalculations
        repath_timer: 0,            // Current repath timer
        path_smoothing: true,       // Whether to smooth paths
        diagonal_movement: true,    // Allow diagonal movement
        move_speed: 2,              // Movement speed
        debug_draw: false,          // Draw debug visualization
        
        // Cache for obstacle data
        obstacles: [],              // List of obstacle objects
        obstacle_types: [],         // Types of objects to consider obstacles
        
        // Pathfinding state
        is_moving: false,           // Currently moving to target
        arrived: false,             // Arrived at destination
        
        _init: function() {
            this.path = [];
            this.obstacles = [];
        },
        
        // Set up the grid based on room dimensions
        setup_grid: function(cellSize = 32) {
            this.cell_size = cellSize;
            this.grid_width = Math.ceil(engine.room_width / cellSize);
            this.grid_height = Math.ceil(engine.room_height / cellSize);
            
            // Create empty grid
            this.grid = new Array(this.grid_width);
            for (let x = 0; x < this.grid_width; x++) {
                this.grid[x] = new Array(this.grid_height).fill(0); // 0 = walkable
            }
            
            return this;
        },
        
        // Register obstacle types
        register_obstacle_types: function(...types) {
            this.obstacle_types = types;
            return this;
        },
        
        // Update the navigation grid
        update_grid: function() {
            // Reset grid
            for (let x = 0; x < this.grid_width; x++) {
                for (let y = 0; y < this.grid_height; y++) {
                    this.grid[x][y] = 0;
                }
            }
            
            // Get all objects to check for collisions
            this.obstacles = [];
            for (let i = 0; i < engine.gameObjects.length; i++) {
                const obj = engine.gameObjects[i];
                
                // Skip if not an obstacle type
                if (!this.obstacle_types.includes(obj)) continue;
                
                // Add all instances to obstacle list
                for (let j = 0; j < obj.instances.length; j++) {
                    const inst = obj.instances[j];
                    if (inst.active) {
                        this.obstacles.push(inst);
                    }
                }
            }
            
            // Mark grid cells with obstacles
            for (let i = 0; i < this.obstacles.length; i++) {
                const obstacle = this.obstacles[i];
                
                // Skip if this is the parent object
                if (obstacle === this.parent) continue;
                
                // Convert object bounds to grid cells
                const left = Math.floor(obstacle.x / this.cell_size);
                const top = Math.floor(obstacle.y / this.cell_size);
                const right = Math.floor((obstacle.x + obstacle.width) / this.cell_size);
                const bottom = Math.floor((obstacle.y + obstacle.height) / this.cell_size);
                
                // Mark cells as blocked
                for (let x = left; x <= right; x++) {
                    for (let y = top; y <= bottom; y++) {
                        if (x >= 0 && x < this.grid_width && y >= 0 && y < this.grid_height) {
                            this.grid[x][y] = 1; // 1 = blocked
                        }
                    }
                }
            }
            
            return this;
        },
        
        // Find path to target using A* algorithm
        find_path: function(target_x, target_y) {
            // Convert target to grid coordinates
            const targetGridX = Math.floor(target_x / this.cell_size);
            const targetGridY = Math.floor(target_y / this.cell_size);
            
            // Convert start to grid coordinates
            const startGridX = Math.floor(this.parent.x / this.cell_size);
            const startGridY = Math.floor(this.parent.y / this.cell_size);
            
            // Handle invalid coordinates
            if (targetGridX < 0 || targetGridX >= this.grid_width || 
                targetGridY < 0 || targetGridY >= this.grid_height ||
                startGridX < 0 || startGridX >= this.grid_width || 
                startGridY < 0 || startGridY >= this.grid_height) {
                this.path = [];
                return false;
            }
            
            // Don't pathfind if target is blocked
            if (this.grid[targetGridX][targetGridY] === 1) {
                this.path = [];
                return false;
            }
            
            // A* algorithm
            const openList = [];
            const closedList = new Set();
            const gScore = {};
            const fScore = {};
            const cameFrom = {};
            
            // Initialize start node
            const startKey = `${startGridX},${startGridY}`;
            gScore[startKey] = 0;
            fScore[startKey] = this.heuristic(startGridX, startGridY, targetGridX, targetGridY);
            openList.push({
                x: startGridX,
                y: startGridY,
                f: fScore[startKey]
            });
            
            while (openList.length > 0) {
                // Find lowest fScore in open list
                let lowestIndex = 0;
                for (let i = 1; i < openList.length; i++) {
                    if (openList[i].f < openList[lowestIndex].f) {
                        lowestIndex = i;
                    }
                }
                
                const current = openList[lowestIndex];
                
                // Check if we reached the target
                if (current.x === targetGridX && current.y === targetGridY) {
                    // Reconstruct the path
                    const path = [];
                    let curr = `${current.x},${current.y}`;
                    
                    while (cameFrom[curr]) {
                        const [x, y] = curr.split(',').map(Number);
                        // Convert back to world coordinates (center of cell)
                        path.push({
                            x: x * this.cell_size + this.cell_size / 2,
                            y: y * this.cell_size + this.cell_size / 2
                        });
                        curr = cameFrom[curr];
                    }
                    
                    // Add start position
                    path.push({
                        x: startGridX * this.cell_size + this.cell_size / 2,
                        y: startGridY * this.cell_size + this.cell_size / 2
                    });
                    
                    // Reverse path so start is first
                    path.reverse();
                    
                    // Smooth path if enabled
                    this.path = this.path_smoothing ? this.smooth_path(path) : path;
                    this.target_x = target_x;
                    this.target_y = target_y;
                    this.current_node = 0;
                    this.arrived = false;
                    this.is_moving = true;
                    
                    return true;
                }
                
                // Move current from open to closed list
                openList.splice(lowestIndex, 1);
                closedList.add(`${current.x},${current.y}`);
                
                // Get neighbors
                const neighbors = this.get_neighbors(current.x, current.y);
                
                for (let i = 0; i < neighbors.length; i++) {
                    const neighbor = neighbors[i];
                    const neighborKey = `${neighbor.x},${neighbor.y}`;
                    
                    // Skip if in closed list
                    if (closedList.has(neighborKey)) continue;
                    
                    // Calculate g score for this path
                    const tentativeGScore = gScore[`${current.x},${current.y}`] + neighbor.cost;
                    
                    // Check if this path is better
                    let inOpenList = false;
                    for (let j = 0; j < openList.length; j++) {
                        if (openList[j].x === neighbor.x && openList[j].y === neighbor.y) {
                            inOpenList = true;
                            break;
                        }
                    }
                    
                    if (!inOpenList || tentativeGScore < gScore[neighborKey]) {
                        // Record this path
                        cameFrom[neighborKey] = `${current.x},${current.y}`;
                        gScore[neighborKey] = tentativeGScore;
                        fScore[neighborKey] = tentativeGScore + 
                            this.heuristic(neighbor.x, neighbor.y, targetGridX, targetGridY);
                        
                        if (!inOpenList) {
                            openList.push({
                                x: neighbor.x,
                                y: neighbor.y,
                                f: fScore[neighborKey]
                            });
                        }
                    }
                }
            }
            
            // No path found
            this.path = [];
            return false;
        },
        
        // Get valid neighbors for a grid cell
        get_neighbors: function(x, y) {
            const neighbors = [];
            const directions = [
                { x: 0, y: -1, cost: 1 },   // Up
                { x: 1, y: 0, cost: 1 },    // Right
                { x: 0, y: 1, cost: 1 },    // Down
                { x: -1, y: 0, cost: 1 },   // Left
            ];
            
            // Add diagonal directions if enabled
            if (this.diagonal_movement) {
                directions.push(
                    { x: 1, y: -1, cost: 1.4 },  // Up-Right
                    { x: 1, y: 1, cost: 1.4 },   // Down-Right
                    { x: -1, y: 1, cost: 1.4 },  // Down-Left
                    { x: -1, y: -1, cost: 1.4 }  // Up-Left
                );
            }
            
            // Check each direction
            for (let i = 0; i < directions.length; i++) {
                const newX = x + directions[i].x;
                const newY = y + directions[i].y;
                
                // Check bounds
                if (newX >= 0 && newX < this.grid_width && newY >= 0 && newY < this.grid_height) {
                    // Check if walkable
                    if (this.grid[newX][newY] === 0) {
                        // For diagonal movement, make sure adjacent cells are walkable too
                        if (directions[i].cost === 1.4) {
                            const dx = directions[i].x;
                            const dy = directions[i].y;
                            
                            // Check orthogonal neighbors
                            if (this.grid[x + dx][y] === 1 || this.grid[x][y + dy] === 1) {
                                continue; // Can't cut corners
                            }
                        }
                        
                        neighbors.push({
                            x: newX,
                            y: newY,
                            cost: directions[i].cost
                        });
                    }
                }
            }
            
            return neighbors;
        },
        
        // Smooth the path to remove unnecessary nodes
        smooth_path: function(path) {
            if (path.length <= 2) return path;
            
            const smoothed = [path[0]];
            let current = 0;
            
            while (current < path.length - 1) {
                // Find furthest visible node
                let furthest = current + 1;
                for (let i = current + 2; i < path.length; i++) {
                    if (this.line_of_sight(path[current], path[i])) {
                        furthest = i;
                    }
                }
                
                // Add the furthest visible node
                smoothed.push(path[furthest]);
                current = furthest;
            }
            
            return smoothed;
        },
        
        // Check if there's a clear line of sight between two points
        line_of_sight: function(a, b) {
            // Bresenham's line algorithm
            let x0 = Math.floor(a.x / this.cell_size);
            let y0 = Math.floor(a.y / this.cell_size);
            let x1 = Math.floor(b.x / this.cell_size);
            let y1 = Math.floor(b.y / this.cell_size);
            
            const dx = Math.abs(x1 - x0);
            const dy = Math.abs(y1 - y0);
            const sx = x0 < x1 ? 1 : -1;
            const sy = y0 < y1 ? 1 : -1;
            let err = dx - dy;
            
            while (x0 !== x1 || y0 !== y1) {
                // Check if current cell is blocked
                if (x0 >= 0 && x0 < this.grid_width && y0 >= 0 && y0 < this.grid_height) {
                    if (this.grid[x0][y0] === 1) {
                        return false; // Path is blocked
                    }
                } else {
                    return false; // Out of bounds
                }
                
                const e2 = 2 * err;
                if (e2 > -dy) {
                    err -= dy;
                    x0 += sx;
                }
                if (e2 < dx) {
                    err += dx;
                    y0 += sy;
                }
            }
            
            return true;
        },
        
        // Set target and find path
        move_to: function(x, y) {
            // Update grid before finding path
            this.update_grid();
            
            const success = this.find_path(x, y);
            
            if (success) {
                this.is_moving = true;
                this.arrived = false;
            } else {
                this.is_moving = false;
            }
            
            return success;
        },
        
        // Stop movement
        stop: function() {
            this.is_moving = false;
            this.path = [];
            return this;
        },
        
        // Manhattan distance heuristic
        heuristic: function(x1, y1, x2, y2) {
            return Math.abs(x1 - x2) + Math.abs(y1 - y2);
        },
        
        // Update pathfinding and movement
        loop: function() {
            const dt = engine.dt;
            
            // Check for repath if moving
            if (this.is_moving && this.auto_repath) {
                this.repath_timer -= dt;
                if (this.repath_timer <= 0) {
                    this.repath_timer = this.repath_interval;
                    
                    // Check if target is still valid
                    if (this.target_x !== null && this.target_y !== null) {
                        this.update_grid();
                        this.find_path(this.target_x, this.target_y);
                    }
                }
            }
            
            // Move along path
            if (this.is_moving && this.path.length > 0 && this.current_node < this.path.length) {
                // Get current target node
                const target = this.path[this.current_node];
                
                // Calculate direction to target
                const dx = target.x - this.parent.x;
                const dy = target.y - this.parent.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // Check if arrived at node
                if (dist < this.move_speed * dt) {
                    // Arrived at current node
                    this.parent.x = target.x;
                    this.parent.y = target.y;
                    
                    // Move to next node
                    this.current_node++;
                    
                    // Check if arrived at final destination
                    if (this.current_node >= this.path.length) {
                        this.arrived = true;
                        this.is_moving = false;
                        this.on_path_complete();
                    }
                } else {
                    // Move towards node
                    const speed = this.move_speed * dt;
                    const angle = Math.atan2(dy, dx);
                    
                    this.parent.x += Math.cos(angle) * speed;
                    this.parent.y += Math.sin(angle) * speed;
                }
            }
        },
        
        // Draw debug visualization
        draw: function() {
            if (!this.debug_draw) return;
            
            const ctx = engine.surfaceTarget;
            
            // Save context state
            ctx.save();
            
            // Draw grid
            if (this.grid) {
                for (let x = 0; x < this.grid_width; x++) {
                    for (let y = 0; y < this.grid_height; y++) {
                        const cellX = x * this.cell_size - engine.view_xview;
                        const cellY = y * this.cell_size - engine.view_yview;
                        
                        // Draw blocked cells with red overlay
                        if (this.grid[x][y] === 1) {
                            ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
                            ctx.fillRect(cellX, cellY, this.cell_size, this.cell_size);
                        }
                        
                        // Draw grid lines
                        ctx.strokeStyle = "rgba(100, 100, 100, 0.2)";
                        ctx.strokeRect(cellX, cellY, this.cell_size, this.cell_size);
                    }
                }
            }
            
            // Draw path
            if (this.path.length > 0) {
                // Draw path lines
                ctx.beginPath();
                ctx.moveTo(
                    this.path[0].x - engine.view_xview, 
                    this.path[0].y - engine.view_yview
                );
                
                for (let i = 1; i < this.path.length; i++) {
                    ctx.lineTo(
                        this.path[i].x - engine.view_xview, 
                        this.path[i].y - engine.view_yview
                    );
                }
                
                ctx.strokeStyle = "rgba(0, 255, 0, 0.6)";
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Draw nodes
                for (let i = 0; i < this.path.length; i++) {
                    const node = this.path[i];
                    
                    // Highlight current node
                    if (i === this.current_node) {
                        ctx.fillStyle = "rgba(255, 255, 0, 0.8)";
                        ctx.beginPath();
                        ctx.arc(
                            node.x - engine.view_xview, 
                            node.y - engine.view_yview,
                            5, 0, Math.PI * 2
                        );
                        ctx.fill();
                    } else {
                        ctx.fillStyle = "rgba(0, 0, 255, 0.5)";
                        ctx.beginPath();
                        ctx.arc(
                            node.x - engine.view_xview, 
                            node.y - engine.view_yview,
                            3, 0, Math.PI * 2
                        );
                        ctx.fill();
                    }
                }
            }
            
            // Restore context
            ctx.restore();
        },
        
        // Event callback when path is complete
        on_path_complete: function() {
            // Override this in the game object
        },
        
        // Check if destination has been reached
        has_arrived: function() {
            return this.arrived;
        },
        
        // Check if currently moving
        is_path_active: function() {
            return this.is_moving;
        }
    });
}

window.registerModule('create_pathfinding_module', create_pathfinding_module);
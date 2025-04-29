function create_tilemap_module() {
    return engine.module("tilemap", {
        // Tilemap properties
        tile_size: 32,             // Size of each tile
        width: 0,                  // Width in tiles
        height: 0,                 // Height in tiles
        tileset: null,             // Tileset image
        tileset_url: "",           // URL of tileset image
        tileset_width: 0,          // Width of tileset in tiles
        tileset_height: 0,         // Height of tileset in tiles
        
        // Tilemap data
        layers: [],                // Array of tile layers
        collision_layer: 0,        // Which layer to use for collision
        collision_tiles: [],       // Array of tile indices that cause collision
        
        // Additional properties
        auto_culling: true,        // Only render visible tiles
        iso_mode: false,           // Use isometric rendering
        
        _init: function() {
            this.layers = [];
            this.collision_tiles = [];
            
            // Load tileset if URL provided
            if (this.tileset_url) {
                this.load_tileset(this.tileset_url);
            }
        },
        
        // Load tileset image
        load_tileset: function(url) {
            this.tileset_url = url;
            this.tileset = new Image();
            this.tileset.src = url;
            
            return this;
        },
        
        // Set tilemap size
        set_size: function(width, height) {
            this.width = width;
            this.height = height;
            return this;
        },
        
        // Set tileset properties
        set_tileset: function(tileset_width, tileset_height) {
            this.tileset_width = tileset_width;
            this.tileset_height = tileset_height;
            return this;
        },
        
        // Create a new layer
        create_layer: function(name, z_index = 0) {
            // Initialize empty layer
            const layer = {
                name: name,
                z_index: z_index,
                visible: true,
                data: new Array(this.width * this.height).fill(-1), // -1 = empty tile
                alpha: 1.0
            };
            
            this.layers.push(layer);
            
            // Sort layers by z-index
            this.layers.sort((a, b) => a.z_index - b.z_index);
            
            return this;
        },
        
        // Set tile at position
        set_tile: function(layer_name, x, y, tile_index) {
            const layer = this.get_layer(layer_name);
            if (!layer || x < 0 || x >= this.width || y < 0 || y >= this.height) return this;
            
            layer.data[y * this.width + x] = tile_index;
            return this;
        },
        
        // Get tile at position
        get_tile: function(layer_name, x, y) {
            const layer = this.get_layer(layer_name);
            if (!layer || x < 0 || x >= this.width || y < 0 || y >= this.height) return -1;
            
            return layer.data[y * this.width + x];
        },
        
        // Get layer by name
        get_layer: function(name) {
            return this.layers.find(layer => layer.name === name);
        },
        
        // Fill a layer with a specific tile
        fill_layer: function(layer_name, tile_index) {
            const layer = this.get_layer(layer_name);
            if (!layer) return this;
            
            layer.data.fill(tile_index);
            return this;
        },
        
        // Set collision tiles
        set_collision_tiles: function(tile_indices, layer_name = null) {
            this.collision_tiles = tile_indices;
            
            if (layer_name) {
                const layer_index = this.layers.findIndex(layer => layer.name === layer_name);
                if (layer_index !== -1) {
                    this.collision_layer = layer_index;
                }
            }
            
            return this;
        },
        
        // Check if a position has a collision
        has_collision: function(x, y) {
            // Convert world position to tile coordinates
            const tile_x = Math.floor(x / this.tile_size);
            const tile_y = Math.floor(y / this.tile_size);
            
            // Check if out of bounds
            if (tile_x < 0 || tile_x >= this.width || tile_y < 0 || tile_y >= this.height) {
                return true; // Consider out of bounds as collision
            }
            
            // Get collision layer
            const layer = this.layers[this.collision_layer];
            if (!layer) return false;
            
            // Get tile index at position
            const tile_index = layer.data[tile_y * this.width + tile_x];
            
            // Check if this tile causes collision
            return this.collision_tiles.includes(tile_index);
        },
        
        // Draw the tilemap
        draw: function() {
            if (!this.tileset || !this.tileset.complete) return;
            
            const ctx = engine.surfaceTarget;
            
            // Calculate visible area
            let startX = 0;
            let startY = 0;
            let endX = this.width;
            let endY = this.height;
            
            // Apply culling if enabled
            if (this.auto_culling) {
                startX = Math.floor(engine.view_xview / this.tile_size);
                startY = Math.floor(engine.view_yview / this.tile_size);
                endX = Math.ceil((engine.view_xview + engine.view_wview) / this.tile_size) + 1;
                endY = Math.ceil((engine.view_yview + engine.view_hview) / this.tile_size) + 1;
                
                // Clamp to map boundaries
                startX = Math.max(0, Math.min(startX, this.width));
                startY = Math.max(0, Math.min(startY, this.height));
                endX = Math.max(0, Math.min(endX, this.width));
                endY = Math.max(0, Math.min(endY, this.height));
            }
            
            // Draw each visible layer
            for (const layer of this.layers) {
                if (!layer.visible) continue;
                
                // Set layer opacity
                const oldAlpha = ctx.globalAlpha;
                ctx.globalAlpha = layer.alpha;
                
                // Draw tiles in this layer
                for (let y = startY; y < endY; y++) {
                    for (let x = startX; x < endX; x++) {
                        const tile_index = layer.data[y * this.width + x];
                        
                        // Skip empty tiles
                        if (tile_index < 0) continue;
                        
                        // Calculate tile position in tileset
                        const tile_x = (tile_index % this.tileset_width) * this.tile_size;
                        const tile_y = Math.floor(tile_index / this.tileset_width) * this.tile_size;
                        
                        // Calculate world position
                        let world_x, world_y;
                        
                        if (this.iso_mode) {
                            // Isometric projection
                            world_x = (x - y) * this.tile_size / 2;
                            world_y = (x + y) * this.tile_size / 4;
                        } else {
                            // Orthographic projection
                            world_x = x * this.tile_size;
                            world_y = y * this.tile_size;
                        }
                        
                        // Draw the tile
                        ctx.drawImage(
                            this.tileset,
                            tile_x, tile_y,
                            this.tile_size, this.tile_size,
                            world_x - engine.view_xview, world_y - engine.view_yview,
                            this.tile_size, this.tile_size
                        );
                    }
                }
                
                // Restore opacity
                ctx.globalAlpha = oldAlpha;
            }
        },
        
        // Load tilemap from a 2D array
        load_from_array: function(data, layer_name) {
            const layer = this.get_layer(layer_name);
            if (!layer) return this;
            
            // Set tilemap size if not already set
            if (this.width === 0 || this.height === 0) {
                this.height = data.length;
                this.width = data[0].length;
                layer.data = new Array(this.width * this.height).fill(-1);
            }
            
            // Copy data
            for (let y = 0; y < Math.min(this.height, data.length); y++) {
                const row = data[y];
                for (let x = 0; x < Math.min(this.width, row.length); x++) {
                    layer.data[y * this.width + x] = row[x];
                }
            }
            
            return this;
        },
        
        // Load tilemap from a JSON object
        load_from_json: function(json) {
            if (!json) return this;
            
            // Set map properties
            if (json.width) this.width = json.width;
            if (json.height) this.height = json.height;
            if (json.tileSize) this.tile_size = json.tileSize;
            if (json.tilesetWidth) this.tileset_width = json.tilesetWidth;
            if (json.tilesetHeight) this.tileset_height = json.tilesetHeight;
            if (json.tilesetUrl) this.load_tileset(json.tilesetUrl);
            
            // Load layers
            if (json.layers && Array.isArray(json.layers)) {
                this.layers = [];
                
                for (const layerData of json.layers) {
                    const layer = {
                        name: layerData.name || "unnamed",
                        z_index: layerData.zIndex || 0,
                        visible: layerData.visible !== undefined ? layerData.visible : true,
                        data: layerData.data || new Array(this.width * this.height).fill(-1),
                        alpha: layerData.alpha !== undefined ? layerData.alpha : 1.0
                    };
                    
                    this.layers.push(layer);
                }
                
                // Sort layers by z-index
                this.layers.sort((a, b) => a.z_index - b.z_index);
            }
            
            // Load collision data
            if (json.collision) {
                if (json.collision.tiles) this.collision_tiles = json.collision.tiles;
                if (json.collision.layer !== undefined) this.collision_layer = json.collision.layer;
            }
            
            return this;
        },
        
        // Convert world position to tile coordinates
        world_to_tile: function(x, y) {
            if (this.iso_mode) {
                // Isometric conversion
                const tile_x = Math.floor((x / (this.tile_size / 2) + y / (this.tile_size / 4)) / 2);
                const tile_y = Math.floor((y / (this.tile_size / 4) - x / (this.tile_size / 2)) / 2);
                return { x: tile_x, y: tile_y };
            } else {
                // Orthographic conversion
                return {
                    x: Math.floor(x / this.tile_size),
                    y: Math.floor(y / this.tile_size)
                };
            }
        },
        
        // Convert tile coordinates to world position
        tile_to_world: function(tile_x, tile_y) {
            if (this.iso_mode) {
                // Isometric conversion
                return {
                    x: (tile_x - tile_y) * this.tile_size / 2,
                    y: (tile_x + tile_y) * this.tile_size / 4
                };
            } else {
                // Orthographic conversion
                return {
                    x: tile_x * this.tile_size,
                    y: tile_y * this.tile_size
                };
            }
        }
    });
}

window.registerModule('create_tilemap_module', create_tilemap_module);
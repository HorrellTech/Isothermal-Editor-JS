function create_camera_module() {
    return engine.module("camera", {
        // Camera properties
        target: null,              // Target object to follow
        width: 640,                // Camera width
        height: 480,               // Camera height
        smooth_factor: 0.1,        // Camera smoothing (0 = no smoothing, 1 = instant)
        zoom: 1,                   // Camera zoom level
        target_zoom: 1,            // Target zoom level
        zoom_speed: 0.05,          // Zoom transition speed
        bounds: {                  // Camera movement boundaries
            left: 0,
            right: null,
            top: 0, 
            bottom: null
        },
        offset_x: 0,               // Horizontal offset from target
        offset_y: 0,               // Vertical offset from target
        shake_amount: 0,           // Current shake intensity
        shake_time: 0,             // Remaining shake time
        shake_frequency: 0.05,     // Shake frequency
        shake_timer: 0,            // Shake timer
        lead_factor: 0,            // Look-ahead based on target velocity
        
        _init: function() {
            // Initialize bounds with room size if not specified
            if (this.bounds.right === null) {
                this.bounds.right = engine.room_width;
            }
            if (this.bounds.bottom === null) {
                this.bounds.bottom = engine.room_height;
            }
            
            // Set initial view size
            engine.view_wview = this.width;
            engine.view_hview = this.height;
        },
        
        loop_begin: function() {
            // Update view size if changed
            if (engine.view_wview !== this.width * this.zoom || 
                engine.view_hview !== this.height * this.zoom) {
                
                engine.view_wview = this.width * this.zoom;
                engine.view_hview = this.height * this.zoom;
            }
            
            // Update zoom if needed
            if (this.zoom !== this.target_zoom) {
                this.zoom += (this.target_zoom - this.zoom) * this.zoom_speed;
                
                // Snap to target if very close
                if (Math.abs(this.zoom - this.target_zoom) < 0.01) {
                    this.zoom = this.target_zoom;
                }
            }
            
            // If no target, don't update camera position
            if (!this.target) return;
            
            // Get target position
            let targetX, targetY;
            
            // If target is a game object
            if (typeof this.target === 'object') {
                targetX = this.target.x + this.target.width / 2;
                targetY = this.target.y + this.target.height / 2;
                
                // Apply look-ahead based on velocity if target has physics
                const phys = this.target.module_get ? this.target.module_get("physics") : null;
                if (phys && this.lead_factor > 0) {
                    targetX += phys.vx * this.lead_factor;
                    targetY += phys.vy * this.lead_factor;
                }
            } 
            // If target is a position array [x, y]
            else if (Array.isArray(this.target) && this.target.length >= 2) {
                targetX = this.target[0];
                targetY = this.target[1];
            } 
            // Otherwise, don't move
            else {
                return;
            }
            
            // Add offset
            targetX += this.offset_x;
            targetY += this.offset_y;
            
            // Calculate camera center position (taking zoom into account)
            const cameraHalfWidth = engine.view_wview / 2;
            const cameraHalfHeight = engine.view_hview / 2;
            
            // Calculate target view position
            let targetViewX = targetX - cameraHalfWidth;
            let targetViewY = targetY - cameraHalfHeight;
            
            // Apply camera bounds
            targetViewX = Math.max(this.bounds.left, Math.min(targetViewX, this.bounds.right - engine.view_wview));
            targetViewY = Math.max(this.bounds.top, Math.min(targetViewY, this.bounds.bottom - engine.view_hview));
            
            // Apply smoothing
            let newX = engine.view_xview;
            let newY = engine.view_yview;
            
            if (this.smooth_factor < 1) {
                // Smooth camera movement
                newX += (targetViewX - engine.view_xview) * this.smooth_factor;
                newY += (targetViewY - engine.view_yview) * this.smooth_factor;
            } else {
                // Instant camera movement
                newX = targetViewX;
                newY = targetViewY;
            }
            
            // Apply camera shake
            if (this.shake_time > 0) {
                this.shake_time -= engine.dt;
                this.shake_timer -= engine.dt;
                
                // Generate new offsets at the shake frequency
                if (this.shake_timer <= 0) {
                    this.shake_timer = this.shake_frequency;
                    
                    // Calculate shake intensity (fade out over time)
                    const intensity = this.shake_amount * (this.shake_time / this.shake_duration);
                    
                    // Apply random offsets
                    newX += (Math.random() * 2 - 1) * intensity;
                    newY += (Math.random() * 2 - 1) * intensity;
                }
                
                // Reset shake when done
                if (this.shake_time <= 0) {
                    this.shake_time = 0;
                    this.shake_amount = 0;
                }
            }
            
            // Update engine view position
            engine.view_xview = Math.round(newX);
            engine.view_yview = Math.round(newY);
        },
        
        // Set the camera target
        set_target: function(target) {
            this.target = target;
            return this;
        },
        
        // Set camera size
        set_size: function(width, height) {
            this.width = width;
            this.height = height;
            return this;
        },
        
        // Set camera bounds
        set_bounds: function(left, top, right, bottom) {
            this.bounds.left = left;
            this.bounds.top = top;
            this.bounds.right = right !== undefined ? right : engine.room_width;
            this.bounds.bottom = bottom !== undefined ? bottom : engine.room_height;
            return this;
        },
        
        // Set camera zoom
        set_zoom: function(zoom, instant = false) {
            this.target_zoom = Math.max(0.1, zoom);
            if (instant) {
                this.zoom = this.target_zoom;
            }
            return this;
        },
        
        // Set camera offset
        set_offset: function(x, y) {
            this.offset_x = x;
            this.offset_y = y;
            return this;
        },
        
        // Start camera shake effect
        shake: function(amount, duration) {
            this.shake_amount = amount;
            this.shake_time = duration;
            this.shake_duration = duration;
            this.shake_timer = 0;
            return this;
        },
        
        // Set camera smoothing
        set_smooth: function(factor) {
            this.smooth_factor = Math.max(0, Math.min(1, factor));
            return this;
        },
        
        // Set look-ahead factor
        set_lead: function(factor) {
            this.lead_factor = factor;
            return this;
        },
        
        // Move camera to specific position
        move_to: function(x, y, instant = false) {
            const targetX = x - engine.view_wview / 2;
            const targetY = y - engine.view_hview / 2;
            
            if (instant) {
                engine.view_xview = Math.round(targetX);
                engine.view_yview = Math.round(targetY);
            } else {
                // Create temporary position target
                this.target = [x, y];
            }
            
            return this;
        }
    });
}

window.registerModule('create_camera_module', create_camera_module);
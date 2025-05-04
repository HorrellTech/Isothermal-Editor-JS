// Physics module for the game engine

function create_physics_module() {
    return engine.module("physics", {
        // Physics properties
        static: false,           // If true, object won't move
        vx: 0,                   // Horizontal velocity
        vy: 0,                   // Vertical velocity
        speed: 0,                // Speed magnitude
        direction: 0,            // Direction in degrees
        max_speed: 5,             // Maximum speed limit
        acceleration: 0.2,       // How fast the object gains speed
        deceleration: 0.2,       // How fast the object loses speed
        friction: 0.1,           // Friction coefficient
        mass: 1,                 // Object mass for physics calculations
        gravity: 0,              // Gravity strength
        max_gravity_speed: 6,      // Maximum gravity-induced speed
        gravity_direction: 270,   // Direction gravity pulls (270 = down)
        gravity_factor: 0.4,      // Gravitational constant
        gravity_field_range: 0,    // Range to attract other objects
        gravity_field_strength: 0, // Strength of gravity field
        headedx: 0,              // Predicted X position
        headedy: 0,              // Predicted Y position
        
        // Custom initialization
        _init: function() {
            // Make sure we have valid mass
            if (this.mass <= 0) {
                this.mass = 0.0000001;
            }
        },
        
        // Event methods
        loop_begin: function() {
            // Apply friction
            if (!this.static) {
                this.updateFriction();
            }
        },
        
        loop: function() {
            if (!this.static) {
                const dt = Math.min(engine.dt || 0.016, 0.1);
                
                if (this.speed !== 0) {
                    // Update velocity based on direction and speed
                    this.vx = engine.lengthdir_x(this.speed, this.direction);
                    this.vy = engine.lengthdir_y(this.speed, this.direction);
                }
                
                // Apply gravity if enabled
                if (this.gravity > 0) {
                    this.apply_force_direction(this.gravity, this.gravity_direction);
                }
                
                // Update position
                this.parent.x += this.vx * dt;
                this.parent.y += this.vy * dt;
                
                // Calculate predicted position
                this.headedx = this.parent.x + (this.vx * 2);
                this.headedy = this.parent.y + (this.vy * 2);
            }
            
            // Process gravity field if enabled
            if (this.gravity_field_range > 0) {
                this.apply_gravity_field();
            }
            
            // Keep direction normalized to 0-360 range
            this.direction = (this.direction + 360) % 360;
            this.gravity_direction = (this.gravity_direction + 360) % 360;
        },
        
        // Physics methods
        updateFriction: function() {
            const dt = Math.min(engine.dt || 0.016, 0.1);
            this.vx -= this.vx * (this.friction / this.mass) * dt;
            this.vy -= this.vy * (this.friction / this.mass) * dt;
            this.speed -= this.speed * (this.friction / this.mass) * dt;
        },
        
        calculate_speed: function() {
            return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        },
        
        calculate_angle: function() {
            return Math.atan2(this.vy, this.vx);
        },
        
        stop: function() {
            this.vx = 0;
            this.vy = 0;
            this.speed = 0;
            return this;
        },
        
        accelerate: function() {
            const dt = Math.min(engine.dt || 0.016, 0.1);
            this.speed += (this.acceleration / this.mass) * dt;
            this.speed = Math.min(this.speed, this.max_speed);
            return this;
        },
        
        decelerate: function() {
            const dt = Math.min(engine.dt || 0.016, 0.1);
            this.speed -= (this.deceleration / this.mass) * dt;
            this.speed = Math.max(this.speed, -this.max_speed);
            return this;
        },
        
        apply_force: function(forceX, forceY, max = this.max_speed) {
            const dt = Math.min(engine.dt || 0.016, 0.1);
            
            // F = ma (Newton's second law)
            const accelerationX = forceX / this.mass;
            const accelerationY = forceY / this.mass;
            
            this.vx += accelerationX * dt;
            this.vy += accelerationY * dt;
            
            // Apply speed limits
            const maxSpeedToUse = this.gravity > 0 ? this.max_gravity_speed : max;
            this.vx = Math.max(Math.min(this.vx, maxSpeedToUse), -maxSpeedToUse);
            this.vy = Math.max(Math.min(this.vy, maxSpeedToUse), -maxSpeedToUse);
            
            return this;
        },
        
        apply_force_direction: function(force, direction, max = this.max_speed) {
            const dx = engine.lengthdir_x(force, direction);
            const dy = engine.lengthdir_y(force, direction);
            
            // Clamp values if they exceed max
            const dxClamped = dx > 0 ? Math.min(dx, max) : Math.max(dx, -max);
            const dyClamped = dy > 0 ? Math.min(dy, max) : Math.max(dy, -max);
            
            return this.apply_force(dxClamped, dyClamped, max);
        },
        
        setDirection: function(direction) {
            this.direction = direction;
            return this;
        },
        
        reverse_velocity_x: function() {
            this.vx *= -1;
            return this;
        },
        
        reverse_velocity_y: function() {
            this.vy *= -1;
            return this;
        },
        
        reverse_velocity: function() {
            this.reverse_velocity_x();
            this.reverse_velocity_y();
            return this;
        },
        
        apply_gravity: function(x, y, target_mass) {
            const dt = Math.min(engine.dt || 0.016, 0.1);
            const dir = engine.point_direction(this.parent.x, this.parent.y, x, y);
            let dis = engine.point_distance(this.parent.x, this.parent.y, x, y);
            
            if (dis === 0) dis = 1;
            
            this.gravity = (this.gravity_factor * (((this.mass * target_mass)) / dis)) * dt;
            this.gravity_direction = -dir;
            
            return this;
        },

        // Additional physics methods can be added here
        // ...
        
        // Advanced collision methods from your BasicMovement class
        move_contact: function(other, step = 0.1) {
            // Simplified implementation
            const dt = Math.min(engine.dt || 0.016, 0.1);
            const obj1 = this.parent;
            const obj2 = other;
            
            const dx = obj1.x - obj2.x;
            const dy = obj1.y - obj2.y;
            
            // Calculate collision angle
            const collisionAngle = Math.atan2(dy, dx);
            
            // Calculate magnitudes
            const speed1 = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            const speed2 = Math.sqrt(other.module_get("physics").vx * other.module_get("physics").vx + 
                         other.module_get("physics").vy * other.module_get("physics").vy);
            
            // Apply collision response
            if (!this.static) {
                const dir = engine.point_direction(obj2.x, obj2.y, obj1.x, obj1.y);
                const dist = engine.point_distance(obj1.x, obj1.y, obj2.x, obj2.y);
                
                // Simple elastic collision
                this.vx = -this.vx * 0.8;
                this.vy = -this.vy * 0.8;
                
                // Move away from collision point slightly
                obj1.x += (Math.sign(dx) * step) * dt;
                obj1.y += (Math.sign(dy) * step) * dt;
            }
            
            return this;
        },
        
        bounce_object: function(otherObject) {
            const dt = Math.min(engine.dt || 0.016, 0.1);
            
            // Get the other object's physics module
            const otherPhysics = otherObject.module_get("physics");
            
            // Calculate relative velocity
            const relVelX = this.vx - otherPhysics.vx;
            const relVelY = this.vy - otherPhysics.vy;
            
            // Calculate collision normal
            const normalX = otherObject.x - this.parent.x;
            const normalY = otherObject.y - this.parent.y;
            
            const normalLength = Math.sqrt(normalX * normalX + normalY * normalY);
            
            if (normalLength === 0) return this; // Avoid division by zero
            
            const normX = normalX / normalLength;
            const normY = normalY / normalLength;
            
            // Calculate dot product
            const dotProduct = relVelX * normX + relVelY * normY;
            
            // Apply reflection
            this.vx -= 2 * dotProduct * normX * dt;
            this.vy -= 2 * dotProduct * normY * dt;
            
            // Apply restitution
            const restitution = 0.8;
            this.vx *= restitution;
            this.vy *= restitution;
            
            return this;
        }
    });
}

// Add the function to the engine
(function() {
    // Create a more reliable registration function
    function ensureModuleRegistered() {
        // Direct assignment to window
        window.create_physics_module = create_physics_module;
        
        // Try to register with the engine directly
        if (window.engine) {
            window.engine.create_physics_module = create_physics_module;
            console.log('Physics module registered directly to engine');
        }
        
        // Try the register helper function
        if (typeof window.registerModule === 'function') {
            window.registerModule('create_physics_module', create_physics_module);
            console.log('Physics module registered via helper function');
        }
        
        // Signal that this module has loaded
        if (window.moduleRegistry && window.moduleRegistry.loaded) {
            window.moduleRegistry.loaded.create_physics_module = true;
        }
    }
    
    // Try immediately
    ensureModuleRegistered();
    
    // Also try after a short delay to catch race conditions
    setTimeout(ensureModuleRegistered, 100);
})();
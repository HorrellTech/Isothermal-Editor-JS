function create_platformer_module() {
    return engine.module("platformer", {
        // Movement properties
        max_speed: 5,              // Maximum horizontal speed
        acceleration: 0.5,         // Horizontal acceleration
        deceleration: 0.6,         // Horizontal deceleration when stopping
        ground_friction: 0.2,      // Friction when on ground
        air_friction: 0.05,        // Friction when in air
        
        // Jumping properties
        jump_force: 10,            // Initial jump velocity
        jump_hold_time: 0.25,      // How long jump button can be held for higher jumps
        jump_timer: 0,             // Current jump timer
        jump_buffer_time: 0.15,    // Time to buffer a jump input before landing
        jump_buffer_timer: 0,      // Current jump buffer timer
        coyote_time: 0.1,          // Time player can still jump after leaving platform
        coyote_timer: 0,           // Current coyote time timer
        max_jumps: 1,              // Maximum number of jumps (2 for double jump)
        jumps_left: 1,             // Current jumps remaining
        variable_jump: true,       // Whether to allow variable height jumps
        
        // Gravity properties
        gravity: 0.6,              // Gravity force
        fall_gravity_mult: 1.5,    // Gravity multiplier when falling
        max_fall_speed: 12,        // Maximum fall speed
        
        // Ground detection
        on_ground: false,          // Whether player is on ground
        was_on_ground: false,      // Whether player was on ground last frame
        ground_check_dist: 5,      // Distance to check for ground below
        
        // Wall properties
        wall_slide: true,          // Whether to enable wall sliding
        wall_slide_speed: 2,       // Maximum wall slide speed
        wall_jump_force: 8,        // Wall jump force
        wall_jump_dir_force: 8,    // Horizontal force from wall jump
        on_wall: false,            // Whether player is on wall
        wall_check_dist: 5,        // Distance to check for walls
        wall_slide_gravity: 0.2,   // Gravity when wall sliding
        
        // State flags
        is_jumping: false,         // Whether player is jumping
        is_falling: false,         // Whether player is falling
        is_wall_sliding: false,    // Whether player is wall sliding
        is_wall_jumping: false,    // Whether player is wall jumping
        can_move: true,            // Whether player can move horizontally
        
        // Input tracking
        move_input: 0,             // Current movement input (-1 to 1)
        jump_input: false,         // Current jump input
        jump_released: true,       // Whether jump button was released
        facing_right: true,        // Whether player is facing right
        
        _init: function() {
            this.jumps_left = this.max_jumps;
        },
        
        loop_begin: function() {
            // Get physics module
            const phys = this.parent.module_get("physics");
            if (!phys) return;
            
            // Store previous ground state
            this.was_on_ground = this.on_ground;
            
            // Check if on ground
            this.check_ground();
            
            // Check if on wall
            this.check_walls();
            
            // Reset jumps when landing
            if (this.on_ground && !this.was_on_ground) {
                this.jumps_left = this.max_jumps;
                this.is_jumping = false;
                this.is_falling = false;
                this.is_wall_jumping = false;
            }
            
            // Apply coyote time
            if (this.was_on_ground && !this.on_ground) {
                this.coyote_timer = this.coyote_time;
            } else if (!this.on_ground) {
                this.coyote_timer -= engine.dt;
            }
            
            // Update jump buffer timer
            if (this.jump_buffer_timer > 0) {
                this.jump_buffer_timer -= engine.dt;
            }
            
            // Update jump timer
            if (this.jump_timer > 0) {
                this.jump_timer -= engine.dt;
            }
            
            // Determine if falling
            this.is_falling = phys.vy > 0 && !this.on_ground;
            
            // Apply wall slide
            if (this.wall_slide && this.on_wall && !this.on_ground && phys.vy > 0) {
                this.is_wall_sliding = true;
                // Limit fall speed during wall slide
                phys.vy = Math.min(phys.vy, this.wall_slide_speed);
                // Apply reduced gravity
                phys.apply_force(0, this.wall_slide_gravity);
            } else {
                this.is_wall_sliding = false;
            }
        },
        
        loop: function() {
            // Get physics module
            const phys = this.parent.module_get("physics");
            if (!phys) return;
            
            // Apply appropriate friction
            const friction = this.on_ground ? this.ground_friction : this.air_friction;
            phys.vx *= (1 - friction);
            
            // Apply horizontal movement
            this.apply_movement();
            
            // Apply variable gravity based on state
            if (this.is_falling) {
                // Apply increased gravity when falling
                phys.apply_force(0, this.gravity * this.fall_gravity_mult);
            } else {
                // Apply normal gravity
                phys.apply_force(0, this.gravity);
            }
            
            // Cap fall speed
            if (phys.vy > this.max_fall_speed) {
                phys.vy = this.max_fall_speed;
            }
            
            // Process jump input
            this.process_jump();
        },
        
        // Check if player is on ground
        check_ground: function() {
            // Simple ground check based on position
            const obj = this.parent;
            if (obj.y + obj.height >= engine.room_height - this.ground_check_dist) {
                this.on_ground = true;
                // Snap to ground
                obj.y = engine.room_height - obj.height;
                return true;
            }
            
            // Advanced check would use collision with platforms
            // TODO: Add platform collision check
            
            this.on_ground = false;
            return false;
        },
        
        // Check if player is on a wall
        check_walls: function() {
            const obj = this.parent;
            
            // Check left wall
            if (obj.x <= this.wall_check_dist) {
                this.on_wall = true;
                this.wall_dir = 1; // Right wall jump
                return true;
            }
            
            // Check right wall
            if (obj.x + obj.width >= engine.room_width - this.wall_check_dist) {
                this.on_wall = true;
                this.wall_dir = -1; // Left wall jump
                return true;
            }
            
            // Advanced check would use collision with platforms
            // TODO: Add platform collision check
            
            this.on_wall = false;
            return false;
        },
        
        // Apply horizontal movement
        apply_movement: function() {
            if (!this.can_move) return;
            
            const phys = this.parent.module_get("physics");
            if (!phys) return;
            
            // During wall jump, limit horizontal control
            if (this.is_wall_jumping) {
                // Apply reduced horizontal control during wall jump
                phys.vx += this.move_input * this.acceleration * 0.5;
            } else {
                // Apply normal movement
                if (Math.abs(this.move_input) > 0.1) {
                    // Accelerate in input direction
                    phys.vx += this.move_input * this.acceleration;
                } else if (Math.abs(phys.vx) > 0.1) {
                    // Decelerate when no input
                    const dir = Math.sign(phys.vx);
                    phys.vx -= dir * this.deceleration;
                    // Prevent changing direction when decelerating
                    if (Math.sign(phys.vx) !== dir) {
                        phys.vx = 0;
                    }
                } else {
                    phys.vx = 0;
                }
            }
            
            // Cap horizontal speed
            phys.vx = Math.max(-this.max_speed, Math.min(this.max_speed, phys.vx));
            
            // Update facing direction
            if (this.move_input > 0.1) {
                this.facing_right = true;
            } else if (this.move_input < -0.1) {
                this.facing_right = false;
            }
        },
        
        // Process jump input
        process_jump: function() {
            const phys = this.parent.module_get("physics");
            if (!phys) return;
            
            // Jump case 1: Initial jump with jump buffer
            if ((this.on_ground || this.coyote_timer > 0) && 
                (this.jump_input || this.jump_buffer_timer > 0) && 
                this.jumps_left > 0) {
                
                // Perform jump
                this.do_jump();
                
                // Reset buffer
                this.jump_buffer_timer = 0;
                this.coyote_timer = 0;
            }
            // Jump case 2: Wall jump
            else if (this.on_wall && !this.on_ground && this.jump_input && this.wall_slide) {
                this.do_wall_jump();
            }
            // Jump case 3: Double jump (air jump)
            else if (!this.on_ground && this.jump_input && this.jumps_left > 0 && this.max_jumps > 1 && this.jump_released) {
                this.do_jump();
            }
            
            // Variable jump height
            if (this.is_jumping && !this.jump_input && this.variable_jump) {
                if (phys.vy < 0) {
                    // Reduce upward velocity when button released
                    phys.vy *= 0.5;
                }
                this.is_jumping = false;
            }
            
            // Update jump released state
            if (!this.jump_input) {
                this.jump_released = true;
            }
        },
        
        // Perform a normal jump
        do_jump: function() {
            const phys = this.parent.module_get("physics");
            if (!phys) return;
            
            // Apply jump velocity
            phys.vy = -this.jump_force;
            
            // Set state flags
            this.is_jumping = true;
            this.is_falling = false;
            this.jump_timer = this.jump_hold_time;
            this.jumps_left--;
            this.jump_released = false;
            
            // Call the jump event
            if (typeof this.on_jump === 'function') {
                this.on_jump();
            }
        },
        
        // Perform a wall jump
        do_wall_jump: function() {
            const phys = this.parent.module_get("physics");
            if (!phys) return;
            
            // Apply wall jump velocities
            phys.vy = -this.wall_jump_force;
            phys.vx = this.wall_dir * this.wall_jump_dir_force;
            
            // Set state flags
            this.is_wall_jumping = true;
            this.is_jumping = true;
            this.is_falling = false;
            this.jump_timer = this.jump_hold_time;
            this.jump_released = false;
            
            // Reset jumps if configured to allow air jump after wall jump
            if (this.max_jumps > 1) {
                this.jumps_left = this.max_jumps - 1;
            }
            
            // Call the wall jump event
            if (typeof this.on_wall_jump === 'function') {
                this.on_wall_jump(this.wall_dir);
            }
            
            // Clear wall jump state after a short delay
            setTimeout(() => {
                this.is_wall_jumping = false;
            }, 200);
        },
        
        // Set horizontal movement input (-1 to 1)
        set_move_input: function(value) {
            this.move_input = Math.max(-1, Math.min(1, value));
            return this;
        },
        
        // Set jump input state
        set_jump_input: function(pressed) {
            // If jump was just pressed
            if (pressed && !this.jump_input) {
                this.jump_buffer_timer = this.jump_buffer_time;
            }
            
            this.jump_input = pressed;
            return this;
        },
        
        // Event hooks - can be overridden by the user
        on_jump: function() {},
        on_land: function() {},
        on_wall_jump: function(direction) {}
    });
}

window.registerModule('create_platformer_module', create_platformer_module);
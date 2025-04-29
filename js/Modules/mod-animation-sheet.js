function create_animation_module() {
    return engine.module("animation", {
        // Sprite sheet properties
        sprite_sheet: null,           // Image object for the sprite sheet
        sprite_url: "",               // URL of the sprite sheet
        
        // Frame dimensions
        frame_width: 32,              // Width of a single frame
        frame_height: 32,             // Height of a single frame
        
        // Animation properties
        animations: {},               // Named animations with their row indices
        current_animation: "",        // Current animation name
        current_frame: 0,             // Current frame index within animation
        frame_count: 0,               // Number of frames in current animation
        frame_speed: 0.1,             // Animation speed (frames per step)
        frame_timer: 0,               // Current fractional frame
        
        // Animation state
        playing: true,                // Whether animation is currently playing
        loop: true,                   // Whether animation should loop
        finished: false,              // Whether animation has finished playing
        
        // Visual properties
        flip_h: false,                // Horizontal flip
        flip_v: false,                // Vertical flip
        scale_x: 1,                   // Horizontal scale
        scale_y: 1,                   // Vertical scale
        rotation: 0,                  // Rotation in degrees
        alpha: 1,                     // Transparency
        offset_x: 0,                  // X offset for drawing
        offset_y: 0,                  // Y offset for drawing
        
        // Optional color overlay effects
        color_overlay: null,          // Color to overlay (null for no overlay)
        overlay_strength: 0.5,        // Strength of color overlay (0-1)
        
        _init: function() {
            if (this.sprite_url) {
                this.load_sprite_sheet(this.sprite_url);
            }
        },
        
        // Load sprite sheet from URL
        load_sprite_sheet: function(url) {
            this.sprite_url = url;
            this.sprite_sheet = new Image();
            this.sprite_sheet.src = url;
            return this;
        },
        
        // Add a new animation by specifying its row in the sprite sheet
        add_animation: function(name, row, frame_count, frame_speed = null) {
            this.animations[name] = {
                row: row,
                frame_count: frame_count,
                speed: frame_speed !== null ? frame_speed : this.frame_speed
            };
            return this;
        },
        
        // Play a named animation
        play: function(name, loop = true) {
            // Check if animation exists
            if (!this.animations[name]) {
                console.error(`Animation '${name}' not found`);
                return this;
            }
            
            // If already playing this animation, do nothing
            if (this.current_animation === name && this.playing) {
                return this;
            }
            
            // Set current animation
            this.current_animation = name;
            this.frame_count = this.animations[name].frame_count;
            
            // Use animation-specific speed if available
            if (this.animations[name].speed !== null) {
                this.frame_speed = this.animations[name].speed;
            }
            
            // Reset animation state
            this.current_frame = 0;
            this.frame_timer = 0;
            this.playing = true;
            this.loop = loop;
            this.finished = false;
            
            return this;
        },
        
        // Stop animation
        stop: function() {
            this.playing = false;
            return this;
        },
        
        // Resume animation
        resume: function() {
            this.playing = true;
            return this;
        },
        
        // Reset animation to first frame
        reset: function() {
            this.current_frame = 0;
            this.frame_timer = 0;
            this.finished = false;
            return this;
        },
        
        // Set specific frame
        set_frame: function(frame) {
            if (frame >= 0 && frame < this.frame_count) {
                this.current_frame = frame;
                this.frame_timer = 0;
            }
            return this;
        },
        
        // Check if animation has finished
        is_finished: function() {
            return this.finished;
        },
        
        // Update animation state
        loop: function() {
            if (!this.playing || !this.current_animation || !this.animations[this.current_animation]) {
                return;
            }
            
            const dt = engine.dt;
            
            // Advance frame timer
            this.frame_timer += this.frame_speed * dt;
            
            // Check if it's time for next frame
            if (this.frame_timer >= 1) {
                // Add whole frames, keep fractional part
                const framesToAdd = Math.floor(this.frame_timer);
                this.current_frame += framesToAdd;
                this.frame_timer -= framesToAdd;
                
                // Handle reaching the end of animation
                if (this.current_frame >= this.frame_count) {
                    if (this.loop) {
                        // Loop back to beginning
                        this.current_frame %= this.frame_count;
                    } else {
                        // Stop at last frame
                        this.current_frame = this.frame_count - 1;
                        this.playing = false;
                        this.finished = true;
                    }
                }
            }
        },
        
        // Draw the current animation frame
        draw: function() {
            if (!this.sprite_sheet || !this.sprite_sheet.complete || !this.current_animation) {
                return;
            }
            
            const anim = this.animations[this.current_animation];
            if (!anim) return;
            
            // Get the row for this animation
            const row = anim.row;
            
            // Calculate source rectangle in sprite sheet
            const srcX = this.current_frame * this.frame_width;
            const srcY = row * this.frame_height;
            
            // Save current context state
            engine.surfaceTarget.save();
            
            // Apply transformations
            const centerX = this.parent.x + this.parent.width / 2;
            const centerY = this.parent.y + this.parent.height / 2;
            
            // Translate to center for rotation and scaling
            engine.surfaceTarget.translate(
                centerX - engine.view_xview,
                centerY - engine.view_yview
            );
            
            // Apply rotation if needed
            if (this.rotation !== 0) {
                engine.surfaceTarget.rotate(this.rotation * Math.PI / 180);
            }
            
            // Apply scale and flip
            const scaleX = this.flip_h ? -this.scale_x : this.scale_x;
            const scaleY = this.flip_v ? -this.scale_y : this.scale_y;
            
            if (scaleX !== 1 || scaleY !== 1) {
                engine.surfaceTarget.scale(scaleX, scaleY);
            }
            
            // Apply transparency
            const oldAlpha = engine.surfaceTarget.globalAlpha;
            engine.surfaceTarget.globalAlpha = this.alpha;
            
            // Calculate drawing position (centered on parent)
            const drawX = -this.parent.width / 2 + this.offset_x;
            const drawY = -this.parent.height / 2 + this.offset_y;
            
            // Draw the sprite
            engine.surfaceTarget.drawImage(
                this.sprite_sheet,
                srcX, srcY, 
                this.frame_width, this.frame_height,
                drawX, drawY, 
                this.parent.width, this.parent.height
            );
            
            // Apply color overlay effect if specified
            if (this.color_overlay) {
                engine.surfaceTarget.globalAlpha = this.overlay_strength * this.alpha;
                engine.surfaceTarget.fillStyle = this.color_overlay;
                engine.surfaceTarget.fillRect(
                    drawX, drawY,
                    this.parent.width, this.parent.height
                );
            }
            
            // Restore context state
            engine.surfaceTarget.globalAlpha = oldAlpha;
            engine.surfaceTarget.restore();
        },
        
        // Get current animation info
        get_current_animation: function() {
            return {
                name: this.current_animation,
                frame: this.current_frame,
                total_frames: this.frame_count,
                progress: this.frame_count > 0 ? this.current_frame / this.frame_count : 0
            };
        },
        
        // Set color overlay effect
        set_overlay: function(color, strength = 0.5) {
            this.color_overlay = color;
            this.overlay_strength = Math.max(0, Math.min(1, strength));
            return this;
        },
        
        // Clear color overlay
        clear_overlay: function() {
            this.color_overlay = null;
            return this;
        },
        
        // Flash the sprite briefly (useful for damage effects)
        flash: function(color = "#FFFFFF", duration = 0.2, strength = 0.8) {
            const oldColor = this.color_overlay;
            const oldStrength = this.overlay_strength;
            
            this.set_overlay(color, strength);
            
            setTimeout(() => {
                if (oldColor) {
                    this.set_overlay(oldColor, oldStrength);
                } else {
                    this.clear_overlay();
                }
            }, duration * 1000);
            
            return this;
        }
    });
}

// Register the module with the engine
window.registerModule('create_animation_module', create_animation_module);

/*
    // Create player object
    const player = engine.object_add();
    player.width = 64;
    player.height = 64;

    // Add animation module
    const anim = player.module_add(create_animation_module());

    // Configure the animation module
    anim.load_sprite_sheet("assets/player_spritesheet.png");
    anim.frame_width = 32;
    anim.frame_height = 32;

    // Add animations from the sprite sheet (name, row, frame count, optional speed)
    anim.add_animation("idle", 0, 4, 0.08);      // Row 0: Idle animation, 4 frames
    anim.add_animation("walk", 1, 8, 0.12);      // Row 1: Walk animation, 8 frames
    anim.add_animation("run", 2, 6, 0.15);       // Row 2: Run animation, 6 frames
    anim.add_animation("jump", 3, 5, 0.1);       // Row 3: Jump animation, 5 frames
    anim.add_animation("attack", 4, 6, 0.2);     // Row 4: Attack animation, 6 frames
    anim.add_animation("die", 5, 10, 0.1);       // Row 5: Death animation, 10 frames

    // Set a default animation
    anim.play("idle");

    // Player logic
    player.awake = function() {
        this.facing_right = true;
        this.is_jumping = false;
        this.is_attacking = false;
    };

    player.loop = function() {
        const phys = this.module_get("physics");
        
        // Handle movement animations
        if (!this.is_attacking && !this.is_jumping) {
            if (Math.abs(phys.vx) > 3) {
                anim.play("run");
            } else if (Math.abs(phys.vx) > 0.5) {
                anim.play("walk");
            } else {
                anim.play("idle");
            }
        }
        
        // Handle facing direction
        if (phys.vx > 0 && !this.facing_right) {
            this.facing_right = true;
            anim.flip_h = false;
        } else if (phys.vx < 0 && this.facing_right) {
            this.facing_right = false;
            anim.flip_h = true;
        }
        
        // Handle attack input
        if (engine.keyboard_check_pressed(engine.vk_z) && !this.is_attacking) {
            this.is_attacking = true;
            anim.play("attack", false);
        }
        
        // Attack finished
        if (this.is_attacking && anim.is_finished()) {
            this.is_attacking = false;
        }
        
        // Handle jump input
        if (engine.keyboard_check_pressed(engine.vk_space) && !this.is_jumping) {
            this.is_jumping = true;
            phys.vy = -10;
            anim.play("jump", false);
        }
        
        // Jump finished
        if (this.is_jumping && this.y + this.height >= engine.room_height) {
            this.is_jumping = false;
            phys.vy = 0;
        }
    };

    // Create instance
    const playerInst = engine.instance_create(400, 300, player);
*/
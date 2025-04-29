function create_particle_system_module() {
    return engine.module("particle_system", {
        // Particle system properties
        particles: [],             // Active particles
        max_particles: 100,        // Maximum particles
        emission_rate: 10,         // Particles per second
        emission_timer: 0,         // Current emission timer
        auto_emit: false,          // Emit particles automatically
        
        // Default particle properties
        particle_life: 2,          // How long particles live in seconds
        particle_size: 5,          // Size of particles
        particle_size_end: 2,      // Size at end of life
        particle_color: "#FFFFFF", // Color of particles
        particle_color_end: null,  // Color at end of life
        particle_alpha: 1,         // Alpha of particles
        particle_alpha_end: 0,     // Alpha at end of life
        
        // Particle movement properties
        particle_speed: 2,         // Speed of particles
        particle_direction: 0,     // Direction of particles (degrees)
        particle_direction_var: 360, // Direction variation (degrees)
        particle_speed_var: 1,     // Speed variation
        particle_gravity: 0,       // Gravity affecting particles
        particle_friction: 0,      // Friction affecting particles
        
        _init: function() {
            this.particles = [];
        },
        
        loop: function() {
            const dt = engine.dt;
            
            // Update existing particles
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.life -= dt;
                
                if (p.life <= 0) {
                    // Remove dead particles
                    this.particles.splice(i, 1);
                } else {
                    // Update particle position
                    p.vx *= (1 - p.friction * dt);
                    p.vy *= (1 - p.friction * dt);
                    p.vy += p.gravity * dt;
                    
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    
                    // Update interpolated properties
                    const lifePercent = p.life / p.totalLife;
                    p.size = this.lerp(p.size_end, p.size_start, lifePercent);
                    p.alpha = this.lerp(p.alpha_end, p.alpha_start, lifePercent);
                    
                    if (p.color_end) {
                        p.color = this.lerpColor(p.color_end, p.color_start, lifePercent);
                    }
                }
            }
            
            // Emit new particles if automatic emission is enabled
            if (this.auto_emit) {
                this.emission_timer += dt;
                const rate = 1 / this.emission_rate;
                
                while (this.emission_timer >= rate) {
                    this.emit_particle();
                    this.emission_timer -= rate;
                }
            }
        },
        
        draw: function() {
            // Draw all particles
            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                
                engine.draw_set_alpha(p.alpha);
                engine.draw_set_color(p.color);
                
                if (p.type === 'circle') {
                    engine.draw_circle(p.x, p.y, p.size, false);
                } else if (p.type === 'rect') {
                    const halfSize = p.size / 2;
                    engine.draw_rectangle(
                        p.x - halfSize, p.y - halfSize,
                        p.x + halfSize, p.y + halfSize,
                        false
                    );
                }
            }
            
            // Reset alpha
            engine.draw_set_alpha(1);
        },
        
        // Emit a single particle
        emit_particle: function(options = {}) {
            if (this.particles.length >= this.max_particles) return null;
            
            const parent = this.parent;
            
            // Base position (center of parent by default)
            const baseX = options.x !== undefined ? options.x : parent.x + parent.width / 2;
            const baseY = options.y !== undefined ? options.y : parent.y + parent.height / 2;
            
            // Direction and speed
            const dir = (options.direction !== undefined ? options.direction : this.particle_direction) + 
                      (Math.random() - 0.5) * 2 * (options.direction_var !== undefined ? options.direction_var : this.particle_direction_var);
            
            const speed = (options.speed !== undefined ? options.speed : this.particle_speed) + 
                        (Math.random() - 0.5) * 2 * (options.speed_var !== undefined ? options.speed_var : this.particle_speed_var);
            
            // Create the particle
            const particle = {
                x: baseX + (options.offset_x || 0),
                y: baseY + (options.offset_y || 0),
                vx: engine.lengthdir_x(speed, dir),
                vy: engine.lengthdir_y(speed, dir),
                life: options.life || this.particle_life,
                totalLife: options.life || this.particle_life,
                size_start: options.size || this.particle_size,
                size_end: options.size_end !== undefined ? options.size_end : this.particle_size_end,
                size: options.size || this.particle_size,
                color_start: options.color || this.particle_color,
                color_end: options.color_end || this.particle_color_end,
                color: options.color || this.particle_color,
                alpha_start: options.alpha !== undefined ? options.alpha : this.particle_alpha,
                alpha_end: options.alpha_end !== undefined ? options.alpha_end : this.particle_alpha_end,
                alpha: options.alpha !== undefined ? options.alpha : this.particle_alpha,
                gravity: options.gravity !== undefined ? options.gravity : this.particle_gravity,
                friction: options.friction !== undefined ? options.friction : this.particle_friction,
                type: options.type || 'circle'
            };
            
            this.particles.push(particle);
            return particle;
        },
        
        // Emit multiple particles at once
        emit_burst: function(count, options = {}) {
            for (let i = 0; i < count; i++) {
                this.emit_particle(options);
            }
            return this;
        },
        
        // Clear all particles
        clear: function() {
            this.particles = [];
            return this;
        },
        
        // Linear interpolation helper
        lerp: function(v1, v2, t) {
            return v1 + (v2 - v1) * t;
        },
        
        // Color interpolation helper
        lerpColor: function(c1, c2, t) {
            // Parse color strings to RGB values
            function parseColor(color) {
                if (color.startsWith('#')) {
                    // Hex format
                    const r = parseInt(color.substring(1, 3), 16);
                    const g = parseInt(color.substring(3, 5), 16);
                    const b = parseInt(color.substring(5, 7), 16);
                    return { r, g, b };
                } else if (color.startsWith('rgb')) {
                    // RGB format
                    const parts = color.match(/\d+/g);
                    return {
                        r: parseInt(parts[0]),
                        g: parseInt(parts[1]),
                        b: parseInt(parts[2])
                    };
                }
                return { r: 255, g: 255, b: 255 };
            }
            
            const color1 = parseColor(c1);
            const color2 = parseColor(c2);
            
            const r = Math.floor(this.lerp(color1.r, color2.r, t));
            const g = Math.floor(this.lerp(color1.g, color2.g, t));
            const b = Math.floor(this.lerp(color1.b, color2.b, t));
            
            return `rgb(${r}, ${g}, ${b})`;
        }
    });
}

window.registerModule('create_particle_system_module', create_particle_system_module);
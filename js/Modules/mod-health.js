function create_health_module() {
    return engine.module("health", {
        // Health properties
        max_health: 100,             // Maximum health
        current_health: 100,         // Current health
        invulnerable: false,         // Invulnerability flag
        invulnerable_time: 0,        // Current invulnerability time
        invulnerable_duration: 1,    // How long invulnerability lasts
        regeneration: 0,             // Health regenerated per second
        shield: 0,                   // Shield points (absorbs damage first)
        max_shield: 0,               // Maximum shield
        shield_regen: 0,             // Shield regen per second
        shield_delay: 3,             // Seconds before shield starts regenerating
        shield_timer: 0,             // Current shield delay timer
        damage_fx_duration: 0.2,     // Duration of damage visual effect
        damage_fx_timer: 0,          // Current damage effect timer
        
        _init: function() {
            this.current_health = this.max_health;
            this.shield = this.max_shield;
        },
        
        loop: function() {
            const dt = engine.dt;
            
            // Handle health regeneration
            if (this.regeneration > 0 && this.current_health < this.max_health) {
                this.current_health = Math.min(
                    this.current_health + this.regeneration * dt,
                    this.max_health
                );
            }
            
            // Handle invulnerability timer
            if (this.invulnerable && this.invulnerable_time > 0) {
                this.invulnerable_time -= dt;
                if (this.invulnerable_time <= 0) {
                    this.invulnerable = false;
                }
            }
            
            // Handle shield regeneration
            if (this.shield < this.max_shield) {
                if (this.shield_timer > 0) {
                    this.shield_timer -= dt;
                } else if (this.shield_regen > 0) {
                    this.shield = Math.min(
                        this.shield + this.shield_regen * dt,
                        this.max_shield
                    );
                }
            }
            
            // Handle damage visual effect
            if (this.damage_fx_timer > 0) {
                this.damage_fx_timer -= dt;
            }
        },
        
        draw: function() {
            const obj = this.parent;
            
            // Draw health bar
            if (this.max_health > 0) {
                const barWidth = obj.width;
                const barHeight = 4;
                const x = obj.x;
                const y = obj.y - 10;
                
                // Health bar background
                engine.draw_set_color("#333333");
                engine.draw_rectangle(x, y, x + barWidth, y + barHeight, false);
                
                // Health bar fill
                const healthPercent = this.current_health / this.max_health;
                const healthColor = this.getHealthColor(healthPercent);
                engine.draw_set_color(healthColor);
                engine.draw_rectangle(x, y, x + barWidth * healthPercent, y + barHeight, false);
                
                // Shield bar overlay
                if (this.max_shield > 0) {
                    const shieldPercent = this.shield / this.max_shield;
                    engine.draw_set_color("#00AAFF");
                    engine.draw_rectangle(x, y - 4, x + barWidth * shieldPercent, y, false);
                }
            }
            
            // Flash effect when damaged
            if (this.damage_fx_timer > 0) {
                // Only flash on certain frames
                if (Math.floor(this.damage_fx_timer * 20) % 2 === 0) {
                    engine.draw_set_color("#FFFFFF");
                    engine.draw_set_alpha(0.3);
                    engine.draw_rectangle(
                        obj.x, obj.y, 
                        obj.x + obj.width, obj.y + obj.height, 
                        false
                    );
                    engine.draw_set_alpha(1);
                }
            }
        },
        
        // Apply damage to the entity
        damage: function(amount, source = null) {
            if (this.invulnerable) return 0;
            
            let actualDamage = amount;
            
            // Apply shield first if available
            if (this.shield > 0) {
                if (this.shield >= actualDamage) {
                    this.shield -= actualDamage;
                    actualDamage = 0;
                } else {
                    actualDamage -= this.shield;
                    this.shield = 0;
                }
                
                // Reset shield regeneration timer
                this.shield_timer = this.shield_delay;
            }
            
            // Apply remaining damage to health
            if (actualDamage > 0) {
                this.current_health -= actualDamage;
                
                // Trigger damage visual effect
                this.damage_fx_timer = this.damage_fx_duration;
                
                // Check for death
                if (this.current_health <= 0) {
                    this.current_health = 0;
                    this.on_death(source);
                } else {
                    this.on_damage(actualDamage, source);
                }
            }
            
            return actualDamage;
        },
        
        // Heal the entity
        heal: function(amount) {
            const oldHealth = this.current_health;
            this.current_health = Math.min(this.current_health + amount, this.max_health);
            return this.current_health - oldHealth;
        },
        
        // Make the entity temporarily invulnerable
        make_invulnerable: function(duration = null) {
            this.invulnerable = true;
            this.invulnerable_time = duration !== null ? duration : this.invulnerable_duration;
            return this;
        },
        
        // Add shield to the entity
        add_shield: function(amount) {
            this.shield = Math.min(this.shield + amount, this.max_shield);
            return this.shield;
        },
        
        // Get color based on health percentage
        getHealthColor: function(percent) {
            if (percent > 0.5) {
                // Green to yellow gradient
                return `rgb(${Math.floor(255 * (1 - percent) * 2)}, 255, 0)`;
            } else {
                // Yellow to red gradient
                return `rgb(255, ${Math.floor(255 * percent * 2)}, 0)`;
            }
        },
        
        // Event handlers - override these in the object
        on_damage: function(amount, source) {
            // Default implementation - can be overridden
        },
        
        on_death: function(source) {
            // Default implementation - destroy the parent object
            this.parent.instance_destroy();
        },
        
        // Check if entity is alive
        is_alive: function() {
            return this.current_health > 0;
        }
    });
}

window.registerModule('create_health_module', create_health_module);
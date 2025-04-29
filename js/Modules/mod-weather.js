function create_weather_module() {
    return engine.module("weather", {
        // Weather state
        current_weather: "clear",   // Current weather type
        intensity: 0.5,             // Weather intensity (0-1)
        transition_time: 1.0,       // Time to transition between weather states
        transition_timer: 0,        // Current transition timer
        from_intensity: 0,          // Starting intensity for transitions
        target_intensity: 0,        // Target intensity for transitions
        
        // Particle containers for different effects
        rain_particles: [],         // Rain drops
        snow_particles: [],         // Snowflakes
        dust_particles: [],         // Dust particles
        leaves_particles: [],       // Leaves
        fog_clouds: [],             // Fog cloud objects
        
        // Weather settings
        rain_settings: {
            color: "#8EB1DB",       // Rain color
            speed: 10,              // Rain speed
            angle: 15,              // Rain angle (degrees from vertical)
            width: 1.5,             // Rain drop width
            height: 15,             // Rain drop height
            splash_duration: 0.3,   // Splash animation duration
            sound: null             // Rain ambient sound
        },
        
        snow_settings: {
            color: "#FFFFFF",       // Snow color
            speed: 2,               // Snow fall speed
            size_min: 2,            // Minimum snowflake size
            size_max: 5,            // Maximum snowflake size
            wobble: 1.5,            // Side-to-side movement
            sound: null             // Snow ambient sound
        },
        
        fog_settings: {
            color: "#AAAAAA",       // Fog color
            density: 0.5,           // Fog density
            height: 0.3,            // Height of fog (portion of screen)
            movement: 0.2,          // Horizontal movement speed
            sound: null             // Fog ambient sound
        },
        
        // Lighting effects
        lightning_enabled: false,   // Enable lightning flashes
        lightning_chance: 0.005,    // Chance per frame for lightning
        lightning_flash_time: 0.1,  // Duration of flash
        lightning_current_flash: 0, // Current flash timer
        
        // Time of day system
        time_enabled: false,        // Enable day/night cycle
        time_of_day: 12,            // Current hour (0-23)
        day_length: 600,            // Seconds for a full day cycle
        time_timer: 0,              // Time cycle timer
        sunrise: 6,                 // Hour of sunrise
        sunset: 18,                 // Hour of sunset
        day_tint: "#FFFFFF",        // Day color tint
        night_tint: "#334466",      // Night color tint
        current_tint: "#FFFFFF",    // Current tint color
        
        // Sound management
        sounds: {},                 // Weather sound effects
        current_sound: null,        // Currently playing ambient sound
        sound_volume: 1.0,          // Sound volume
        
        _init: function() {
            // Initialize particle arrays
            this.rain_particles = [];
            this.snow_particles = [];
            this.dust_particles = [];
            this.leaves_particles = [];
            this.fog_clouds = [];
        },
        
        // Set the weather type
        set_weather: function(type, intensity = 0.5, transition_time = 1.0) {
            if (type === this.current_weather && intensity === this.intensity) {
                return this;
            }
            
            // Store the previous intensity for transition
            this.from_intensity = this.intensity;
            this.target_intensity = intensity;
            
            // Set up transition
            this.transition_time = transition_time;
            this.transition_timer = transition_time;
            
            // Change the weather type
            this.current_weather = type;
            
            // Change ambient sound if needed
            this.update_ambient_sound();
            
            return this;
        },
        
        // Update the ambient sound based on current weather
        update_ambient_sound: function() {
            // Stop current sound if playing
            if (this.current_sound && this.sounds[this.current_sound]) {
                this.sounds[this.current_sound].pause();
                this.current_sound = null;
            }
            
            // Play new ambient sound if available
            let sound_id = null;
            
            switch (this.current_weather) {
                case "rain":
                    sound_id = "rain_sound";
                    break;
                case "storm":
                    sound_id = "storm_sound";
                    break;
                case "snow":
                    sound_id = "wind_sound";
                    break;
                case "fog":
                    sound_id = "fog_sound";
                    break;
            }
            
            if (sound_id && this.sounds[sound_id]) {
                this.sounds[sound_id].loop = true;
                this.sounds[sound_id].volume = this.sound_volume * this.intensity;
                this.sounds[sound_id].play();
                this.current_sound = sound_id;
            }
            
            return this;
        },
        
        // Load a sound for weather effects
        load_sound: function(id, url) {
            const audio = new Audio(url);
            this.sounds[id] = audio;
            return this;
        },
        
        // Set the time of day
        set_time: function(hour) {
            this.time_of_day = hour % 24;
            this.update_time_effects();
            return this;
        },
        
        // Update time-based effects
        update_time_effects: function() {
            if (!this.time_enabled) return;
            
            // Calculate day/night blend factor
            let dayFactor = 1.0;
            
            if (this.time_of_day < this.sunrise) {
                // Night before sunrise
                dayFactor = 0.0;
            } else if (this.time_of_day < this.sunrise + 2) {
                // Sunrise transition (2 hours)
                dayFactor = (this.time_of_day - this.sunrise) / 2;
            } else if (this.time_of_day > this.sunset + 2) {
                // Night after sunset transition
                dayFactor = 0.0;
            } else if (this.time_of_day > this.sunset) {
                // Sunset transition (2 hours)
                dayFactor = 1.0 - (this.time_of_day - this.sunset) / 2;
            }
            
            // Interpolate tint color
            this.current_tint = this.lerp_color(this.night_tint, this.day_tint, dayFactor);
        },
        
        // Helper function to interpolate colors
        lerp_color: function(c1, c2, t) {
            // Convert hex to rgb
            function hex_to_rgb(hex) {
                const r = parseInt(hex.substr(1, 2), 16);
                const g = parseInt(hex.substr(3, 2), 16);
                const b = parseInt(hex.substr(5, 2), 16);
                return { r, g, b };
            }
            
            // Convert rgb to hex
            function rgb_to_hex(r, g, b) {
                return "#" + 
                    Math.floor(r).toString(16).padStart(2, '0') +
                    Math.floor(g).toString(16).padStart(2, '0') +
                    Math.floor(b).toString(16).padStart(2, '0');
            }
            
            const c1_rgb = hex_to_rgb(c1);
            const c2_rgb = hex_to_rgb(c2);
            
            const r = c1_rgb.r + (c2_rgb.r - c1_rgb.r) * t;
            const g = c1_rgb.g + (c2_rgb.g - c1_rgb.g) * t;
            const b = c1_rgb.b + (c2_rgb.b - c1_rgb.b) * t;
            
            return rgb_to_hex(r, g, b);
        },
        
        // Main update loop
        loop: function() {
            const dt = engine.dt;
            
            // Update transition
            if (this.transition_timer > 0) {
                this.transition_timer -= dt;
                
                // Calculate new intensity
                const t = 1.0 - (this.transition_timer / this.transition_time);
                this.intensity = this.from_intensity + (this.target_intensity - this.from_intensity) * t;
                
                // Update sound volume if playing
                if (this.current_sound && this.sounds[this.current_sound]) {
                    this.sounds[this.current_sound].volume = this.sound_volume * this.intensity;
                }
            }
            
            // Update time of day
            if (this.time_enabled) {
                this.time_timer += dt;
                const day_progress = this.time_timer / this.day_length;
                
                if (day_progress >= 1.0) {
                    this.time_timer %= this.day_length;
                }
                
                this.time_of_day = (day_progress * 24) % 24;
                this.update_time_effects();
            }
            
            // Update weather effects based on current type
            if (this.intensity > 0) {
                switch (this.current_weather) {
                    case "rain":
                        this.update_rain(dt);
                        break;
                    case "storm":
                        this.update_rain(dt);
                        this.update_lightning(dt);
                        break;
                    case "snow":
                        this.update_snow(dt);
                        break;
                    case "fog":
                        this.update_fog(dt);
                        break;
                    case "dust":
                        this.update_dust(dt);
                        break;
                    case "windy":
                        this.update_wind(dt);
                        break;
                }
            }
        },
        
        // Update rain particles
        update_rain: function(dt) {
            const maxRaindrops = 200 * this.intensity;
            
            // Remove drops that are off-screen
            for (let i = this.rain_particles.length - 1; i >= 0; i--) {
                const drop = this.rain_particles[i];
                
                // Update position
                drop.x += drop.vx * dt;
                drop.y += drop.vy * dt;
                
                // Check if off screen or is a splash that's done
                if (drop.y > engine.view_hview || 
                    (drop.isSplash && drop.timer <= 0)) {
                    this.rain_particles.splice(i, 1);
                } else if (drop.isSplash) {
                    // Update splash animation
                    drop.timer -= dt;
                    drop.radius = drop.maxRadius * (drop.timer / drop.duration);
                } else if (drop.y + drop.height > engine.view_hview - 10) {
                    // Convert to splash when hitting ground
                    drop.isSplash = true;
                    drop.timer = this.rain_settings.splash_duration;
                    drop.duration = this.rain_settings.splash_duration;
                    drop.maxRadius = 3 + Math.random() * 2;
                    drop.radius = drop.maxRadius;
                }
            }
            
            // Add new raindrops
            if (this.rain_particles.length < maxRaindrops) {
                const count = Math.ceil((maxRaindrops - this.rain_particles.length) * 0.1);
                
                for (let i = 0; i < count; i++) {
                    const drop = {
                        x: Math.random() * (engine.view_wview + 100) - 50,
                        y: -20,
                        vx: this.rain_settings.speed * Math.sin(this.rain_settings.angle * Math.PI/180),
                        vy: this.rain_settings.speed * Math.cos(this.rain_settings.angle * Math.PI/180),
                        width: this.rain_settings.width,
                        height: this.rain_settings.height * (0.8 + Math.random() * 0.4),
                        isSplash: false
                    };
                    
                    this.rain_particles.push(drop);
                }
            }
        },
        
        // Update lightning effect
        update_lightning: function(dt) {
            // Only if lightning is enabled and we're in a storm
            if (!this.lightning_enabled) return;
            
            // Update current flash
            if (this.lightning_current_flash > 0) {
                this.lightning_current_flash -= dt;
            } else if (Math.random() < this.lightning_chance * this.intensity) {
                // Trigger new lightning
                this.lightning_current_flash = this.lightning_flash_time;
                
                // Play thunder sound with delay
                setTimeout(() => {
                    if (this.sounds.thunder_sound) {
                        const thunder = this.sounds.thunder_sound.cloneNode();
                        thunder.volume = this.sound_volume * (0.5 + this.intensity * 0.5);
                        thunder.play();
                    }
                }, 500 + Math.random() * 2000);
            }
        },
        
        // Update snow particles
        update_snow: function(dt) {
            const maxSnowflakes = 300 * this.intensity;
            
            // Remove flakes that are off-screen
            for (let i = this.snow_particles.length - 1; i >= 0; i--) {
                const flake = this.snow_particles[i];
                
                // Update position with wobble
                flake.wobbleTimer += dt * flake.wobbleSpeed;
                flake.x += Math.sin(flake.wobbleTimer) * flake.wobble * dt;
                flake.y += flake.vy * dt;
                
                // Remove if off screen
                if (flake.y > engine.view_hview || 
                    flake.x < -20 || 
                    flake.x > engine.view_wview + 20) {
                    this.snow_particles.splice(i, 1);
                }
            }
            
            // Add new snowflakes
            if (this.snow_particles.length < maxSnowflakes) {
                const count = Math.ceil((maxSnowflakes - this.snow_particles.length) * 0.05);
                
                for (let i = 0; i < count; i++) {
                    const size = this.snow_settings.size_min + 
                        Math.random() * (this.snow_settings.size_max - this.snow_settings.size_min);
                    
                    const flake = {
                        x: Math.random() * (engine.view_wview + 40) - 20,
                        y: -20,
                        size: size,
                        vy: this.snow_settings.speed * (0.7 + Math.random() * 0.6),
                        wobble: this.snow_settings.wobble * (0.8 + Math.random() * 0.4),
                        wobbleTimer: Math.random() * Math.PI * 2,
                        wobbleSpeed: 0.5 + Math.random() * 2.0,
                        opacity: 0.6 + Math.random() * 0.4
                    };
                    
                    this.snow_particles.push(flake);
                }
            }
        },
        
        // Update fog effect
        update_fog: function(dt) {
            const maxClouds = 15 * this.intensity;
            
            // Update existing fog clouds
            for (let i = this.fog_clouds.length - 1; i >= 0; i--) {
                const cloud = this.fog_clouds[i];
                
                // Move cloud horizontally
                cloud.x += cloud.vx * dt;
                
                // Remove if off screen
                if ((cloud.vx > 0 && cloud.x > engine.view_wview + cloud.width) ||
                    (cloud.vx < 0 && cloud.x < -cloud.width)) {
                    this.fog_clouds.splice(i, 1);
                }
            }
            
            // Add new fog clouds
            if (this.fog_clouds.length < maxClouds) {
                const width = 100 + Math.random() * 200;
                const height = 50 + Math.random() * 100;
                const y = engine.view_hview * (1 - this.fog_settings.height) + 
                    Math.random() * (engine.view_hview * this.fog_settings.height) - height/2;
                
                // Determine side to enter from
                const enterFromRight = Math.random() > 0.5;
                const x = enterFromRight ? engine.view_wview : -width;
                const vx = enterFromRight ? 
                    -this.fog_settings.movement * (0.5 + Math.random() * 0.5) : 
                    this.fog_settings.movement * (0.5 + Math.random() * 0.5);
                
                const cloud = {
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    vx: vx,
                    opacity: 0.1 + Math.random() * 0.2 * this.intensity
                };
                
                this.fog_clouds.push(cloud);
            }
        },
        
        // Update dust effect
        update_dust: function(dt) {
            // Similar to snow but with different parameters
            // Implementation specific to dust particles
        },
        
        // Update wind effect (leaves, etc)
        update_wind: function(dt) {
            // Implementation for wind effects
        },
        
        // Draw all weather effects
        draw: function() {
            const ctx = engine.surfaceTarget;
            
            // Apply time-of-day tint
            if (this.time_enabled && this.current_tint !== "#FFFFFF") {
                ctx.save();
                ctx.fillStyle = this.current_tint;
                ctx.globalAlpha = 0.2;
                ctx.fillRect(0, 0, engine.view_wview, engine.view_hview);
                ctx.restore();
            }
            
            // Draw lightning flash
            if (this.lightning_current_flash > 0) {
                ctx.save();
                ctx.fillStyle = "#FFFFFF";
                ctx.globalAlpha = 0.7 * (this.lightning_current_flash / this.lightning_flash_time);
                ctx.fillRect(0, 0, engine.view_wview, engine.view_hview);
                ctx.restore();
            }
            
            // Draw rain
            if ((this.current_weather === "rain" || this.current_weather === "storm") && this.intensity > 0) {
                ctx.save();
                ctx.fillStyle = this.rain_settings.color;
                
                for (const drop of this.rain_particles) {
                    if (drop.isSplash) {
                        // Draw splash as circle
                        ctx.globalAlpha = drop.timer / drop.duration * 0.5;
                        ctx.beginPath();
                        ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
                        ctx.fill();
                    } else {
                        // Draw raindrop as line
                        ctx.globalAlpha = 0.7;
                        ctx.beginPath();
                        const angle = Math.atan2(drop.vy, drop.vx);
                        const dx = Math.cos(angle) * drop.height;
                        const dy = Math.sin(angle) * drop.height;
                        
                        ctx.lineWidth = drop.width;
                        ctx.moveTo(drop.x, drop.y);
                        ctx.lineTo(drop.x + dx, drop.y + dy);
                        ctx.stroke();
                    }
                }
                
                ctx.restore();
            }
            
            // Draw snow
            if (this.current_weather === "snow" && this.intensity > 0) {
                ctx.save();
                ctx.fillStyle = this.snow_settings.color;
                
                for (const flake of this.snow_particles) {
                    ctx.globalAlpha = flake.opacity;
                    ctx.beginPath();
                    ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                ctx.restore();
            }
            
            // Draw fog
            if (this.current_weather === "fog" && this.intensity > 0) {
                ctx.save();
                
                for (const cloud of this.fog_clouds) {
                    const gradient = ctx.createRadialGradient(
                        cloud.x + cloud.width/2, cloud.y + cloud.height/2, 10,
                        cloud.x + cloud.width/2, cloud.y + cloud.height/2, cloud.width/2
                    );
                    
                    gradient.addColorStop(0, `rgba(${parseInt(this.fog_settings.color.slice(1,3), 16)}, ${parseInt(this.fog_settings.color.slice(3,5), 16)}, ${parseInt(this.fog_settings.color.slice(5,7), 16)}, ${cloud.opacity})`);
                    gradient.addColorStop(1, `rgba(${parseInt(this.fog_settings.color.slice(1,3), 16)}, ${parseInt(this.fog_settings.color.slice(3,5), 16)}, ${parseInt(this.fog_settings.color.slice(5,7), 16)}, 0)`);
                    
                    ctx.fillStyle = gradient;
                    ctx.fillRect(cloud.x, cloud.y, cloud.width, cloud.height);
                }
                
                ctx.restore();
            }
        }
    });
}
window.registerModule('create_weather_module', create_weather_module);
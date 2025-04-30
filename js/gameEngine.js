// Create a self-contained game engine using a function-based approach
function createGameEngine(canvasId = 'canvasArea', textboxId = 'textbox') {
    // Private scope for engine variables
    const engine = {};

    // Basic constants
    engine.pi = Math.PI;
    engine.noone = -4;
    engine.self = -1;
    engine.other = -2;
    engine.all = -3;

    // Core state variables
    engine.gameObjects = [];
    engine.context = null;
    engine.animationFrame = null;
    engine.surfaceTarget = null;
    engine.lastTick = 0;
    engine.canvasId = canvasId;
    engine.textboxId = textboxId;

    // Game state
    engine.fps = 0;
    engine.room_width = 1024;
    engine.room_height = 768;
    engine.view_xview = 0;
    engine.view_yview = 0;
    engine.view_wview = 1024;
    engine.view_hview = 768;
    engine.time_scale = 1.0;
    engine.instance_count = 0;
    engine.object_count = 0;
    engine.mouse_x = 0;
    engine.mouse_y = 0;
    engine.mx = 0; // Base mouse position (before view offset)
    engine.my = 0;

    // Utility functions
    engine.rgb = function (r, g, b) {
        r = Math.floor(r);
        g = Math.floor(g);
        b = Math.floor(b);
        return `rgb(${r},${g},${b})`;
    };

    // Shape drawing system - start with these variables
    engine._shape_points = []; // Stores points for the current shape
    engine._shape_outline = true; // Whether to stroke or fill the shape
    engine._shape_spline = 0; // Spline tension factor (0 = no spline, straight lines)
    engine._shape_started = false; // Track if shape drawing has been started

    // Surface management system
    engine.surfaces = {}; // Store created surfaces
    engine.currentSurfaceStack = []; // Keep track of surface stack
    engine.defaultSurface = null; // Reference to the main canvas context

    // Define color constants
    engine.c_white = engine.rgb(255, 255, 255);
    engine.c_black = engine.rgb(0, 0, 0);
    engine.c_red = engine.rgb(255, 0, 0);
    engine.c_ltgray = engine.rgb(176, 176, 176);
    engine.c_gray = engine.rgb(128, 128, 128);
    engine.c_dkgray = engine.rgb(64, 64, 64);
    engine.c_blue = engine.rgb(0, 0, 255);
    engine.c_green = engine.rgb(0, 255, 0);
    engine.c_yellow = engine.rgb(255, 255, 0);
    engine.c_cyan = engine.rgb(0, 255, 255);
    engine.c_magenta = engine.rgb(255, 0, 255);
    engine.c_orange = engine.rgb(255, 165, 0);
    engine.c_purple = engine.rgb(128, 0, 128);
    engine.c_brown = engine.rgb(143, 85, 47);
    engine.c_pink = engine.rgb(255, 192, 203);
    engine.c_gold = engine.rgb(255, 215, 0);
    engine.c_silver = engine.rgb(192, 192, 192);
    engine.c_steel = engine.rgb(70, 130, 180);
    engine.c_olive = engine.rgb(128, 128, 0);
    engine.c_teal = engine.rgb(0, 128, 128);
    engine.c_navy = engine.rgb(0, 0, 128);
    engine.c_lime = engine.rgb(0, 255, 0);
    engine.c_maroon = engine.rgb(128, 0, 0);

    engine.background_color = engine.c_ltgray;
    engine.current_background = null;
    engine.background_mode = "stretch"; // Default background mode
    engine.background_speed = 0; // Default background speed

    // Alpha constants
    engine.a_100 = 1.0;
    engine.a_50 = 0.5;
    engine.a_0 = 0.0;
    engine.a_25 = 0.25;
    engine.a_75 = 0.75;

    // Math utility functions
    engine.point_distance = function (x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    };

    engine.point_direction = function (x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
    };

    engine.lengthdir_x = function (len, dir) {
        return len * Math.cos(dir * Math.PI / 180);
    };

    engine.lengthdir_y = function (len, dir) {
        return len * Math.sin(dir * Math.PI / 180);
    };

    engine.floor = Math.floor;
    engine.ceil = Math.ceil;
    engine.round = Math.round;

    // Core game object definition
    engine.gameObject = function (x, y, width, height) {
        const obj = {
            instances: [],
            isParent: true,
            object_id: engine.noone,
            id: 0,
            need_removed: false,
            has_sorted_depth: true,
            need_sorted: false,
            use_built_in_physics: true,

            active: true,
            visible: true,

            x: x,
            y: y,
            xstart: x,
            ystart: y,
            xprevious: x,
            yprevious: y,
            width: width,
            height: height,
            depth: 0,
            direction: 0,

            // Module system
            modules: [],

            // Calculated properties
            bbox_left: 0,
            bbox_top: 0,
            bbox_right: 0,
            bbox_bottom: 0,
            center_x: 0,
            center_y: 0,

            hasWoken: false,

            // Module management
            module_add: function (mod) {
                // Initialize the module with this game object as parent
                mod.init(this);
                this.modules.push(mod);

                // Call onCreate for the new module
                if (mod.enabled && typeof mod.onCreate === 'function') {
                    mod.awake();
                }

                return mod; // Return the module for chaining
            },

            module_get: function (name) {
                for (let i = 0; i < this.modules.length; i++) {
                    if (this.modules[i].name === name) {
                        return this.modules[i];
                    }
                }
                return null;
            },

            module_remove: function (name) {
                for (let i = 0; i < this.modules.length; i++) {
                    if (this.modules[i].name === name) {
                        this.modules.splice(i, 1);
                        return true;
                    }
                }
                return false;
            },

            // Event handlers (to be overridden)
            awake: function () { },
            loop: function () { },
            loop_begin: function () { },
            loop_end: function () { },
            draw: function () { },
            draw_gui: function () { },

            // Core update function
            updateMain: function () {
                if (!this.hasWoken) {
                    this.awake();
                    this.hasWoken = true;
                    this.xstart = this.x;
                    this.ystart = this.y;
                }

                this.loop_begin();

                // Call onUpdateBegin for all enabled modules
                for (let i = 0; i < this.modules.length; i++) {
                    const mod = this.modules[i];
                    if (mod.enabled && typeof mod.loop_begin === 'function') {
                        mod.loop_begin();
                    }
                }

                this.loop();

                // Call onUpdate for all enabled modules
                for (let i = 0; i < this.modules.length; i++) {
                    const mod = this.modules[i];
                    if (mod.enabled && typeof mod.loop === 'function') {
                        mod.loop();
                    }
                }

                // Sort by depth if needed
                if (this.object_id.instances[0] === this) {
                    this.object_id.sort_by_depth();
                }

                // Update collision box
                this.bbox_left = this.x;
                this.bbox_top = this.y;
                this.bbox_right = this.x + this.width;
                this.bbox_bottom = this.y + this.height;

                // Calculate center point
                this.center_x = this.bbox_left + (this.width / 2);
                this.center_y = this.bbox_top + (this.height / 2);

                this.loop_end();

                // Call onUpdateEnd for all enabled modules
                for (let i = 0; i < this.modules.length; i++) {
                    const mod = this.modules[i];
                    if (mod.enabled && typeof mod.loop_end === 'function') {
                        mod.loop_end();
                    }
                }

                // Store previous position
                this.xprevious = this.x;
                this.yprevious = this.y;
            },

            // Drawing functions
            mainDraw: function () {
                this.draw();

                // Call onDraw for all enabled modules
                for (let i = 0; i < this.modules.length; i++) {
                    const mod = this.modules[i];
                    if (mod.enabled && typeof mod.draw === 'function') {
                        mod.draw();
                    }
                }
            },

            mainDrawGui: function () {
                this.draw_gui();
            },

            // Instance management with module support
            instantiate: function (x, y) {
                // Create a new instance based on this object
                const temp = engine.gameObject(x, y, this.width, this.height);
                temp.hasWoken = false;
                temp.awake = this.awake;
                temp.loop = this.loop;
                temp.loop_begin = this.loop_begin;
                temp.loop_end = this.loop_end;
                temp.draw = this.draw;
                temp.draw_gui = this.draw_gui;
                temp.object_id = this;
                temp.id = this.id;
                temp.isParent = false;

                // Clone all modules to the new instance
                for (let i = 0; i < this.modules.length; i++) {
                    const clonedMod = this.modules[i].clone();
                    temp.module_add(clonedMod);
                }

                this.instances.push(temp);
                this.id += 1;

                return temp;
            },

            // Rest of the original methods...
            sort_by_depth: function () {
                // Unchanged
                const len = this.instances.length;
                if (len > 1) {
                    for (let i = len - 1; i >= 0; i--) {
                        for (let j = 1; j <= i; j++) {
                            const d1 = this.instances[j].depth;
                            const d2 = this.instances[j - 1].depth;
                            if (d2 < d1) {
                                const temp = this.instances[j - 1];
                                this.instances[j - 1] = this.instances[j];
                                this.instances[j] = temp;
                            }
                        }
                    }
                }
            },

            instance_destroy: function () {
                this.active = false;
                this.need_removed = true;
            },

            check_collision: function (other) {
                if (this.active && other.active) {
                    return (this.x < other.x + other.width &&
                        this.x + this.width > other.x &&
                        this.y < other.y + other.height &&
                        this.y + this.height > other.y);
                }
                return false;
            }
        };

        return obj;
    };

    engine.module = function (name, config = {}) {
        return {
            name: name,
            enabled: true,
            parent: null,
            data: {},

            // Initialize the module
            init: function (parent) {
                this.parent = parent;

                // Set default properties
                for (const prop in config) {
                    if (config.hasOwnProperty(prop)) {
                        this[prop] = config[prop];
                    }
                }

                // If there's an init function in the config, call it
                if (typeof this._init === 'function') {
                    this._init.call(this);
                }

                return this;
            },

            // Set state from data
            setState: function (data) {
                if (!data) return this;

                for (const prop in data) {
                    if (data.hasOwnProperty(prop)) {
                        this[prop] = data[prop];
                    }
                }

                return this;
            },

            // Set data from current state
            setData: function () {
                this.data = {};
                for (const prop in this) {
                    if (this.hasOwnProperty(prop) &&
                        typeof this[prop] !== 'function' &&
                        prop !== 'parent' &&
                        prop !== 'data') {
                        this.data[prop] = this[prop];
                    }
                }

                return this.data;
            },

            // Clone the module
            clone: function () {
                const newMod = engine.module(this.name);
            
                // Copy all properties AND functions (except parent reference)
                for (const prop in this) {
                    if (this.hasOwnProperty(prop) && prop !== 'parent') {
                        newMod[prop] = this[prop];
                    }
                }
            
                return newMod;
            },

            // Event hooks - can be overridden by config
            awake: function () { },
            loop_begin: function () { },
            loop: function () { },
            loop_end: function () { },
            draw: function () { },

            // Enable/disable the module
            enable: function () {
                this.enabled = true;
                return this;
            },

            disable: function () {
                this.enabled = false;
                return this;
            },

            // Allow modules to be extended with custom methods
            extend: function (methods) {
                for (const key in methods) {
                    if (methods.hasOwnProperty(key)) {
                        this[key] = methods[key];
                    }
                }
                return this;
            }
        };
    }

    // Object creation and management
    engine.object_add = function () {
        const temp = engine.gameObject(0, 0, 0, 0);
        engine.gameObjects.push(temp);
        return temp;
    };

    engine.instance_create = function (x, y, object) {
        const temp = object.instantiate(x, y);
        temp.isParent = false;
        return temp;
    };

    // Canvas setup
    engine.createCanvas = function () {
        let canvas = document.getElementById(engine.canvasId);
        if (canvas === null) {
            canvas = document.createElement('canvas');
            canvas.id = engine.canvasId;
            document.body.appendChild(canvas);
        }
        canvas.oncontextmenu = function (e) { return false; };
        return canvas;
    };

    // Drawing functions
    engine.draw_set_color = function (color) {
        engine.surfaceTarget.fillStyle = color;
        engine.surfaceTarget.strokeStyle = color;
    };

    engine.draw_set_alpha = function (alpha) {
        engine.surfaceTarget.globalAlpha = alpha;
    };

    engine.draw_set_font = function (size, name) {
        engine.font_size = size;
        engine.font_style = name;
        engine.surfaceTarget.font = `${size}px ${name}`;
    };

    engine.draw_set_align = function (align) {
        engine.surfaceTarget.textAlign = align;
    };

    engine.draw_text = function (x, y, text) {
        engine.surfaceTarget.fillText(text, x - engine.view_xview, y - engine.view_yview + engine.font_size);
    };

    // Draw text with alignment options
    engine.draw_text_ext = function(x, y, text, lineHeight, maxWidth) {
        const words = text.split(' ');
        let currentLine = words[0];
        const xPos = x - engine.view_xview;
        let yPos = y - engine.view_yview + engine.font_size;
        
        for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + ' ' + words[i];
            const metrics = engine.surfaceTarget.measureText(testLine);
            if (metrics.width > maxWidth) {
                engine.surfaceTarget.fillText(currentLine, xPos, yPos);
                currentLine = words[i];
                yPos += lineHeight;
            } else {
                currentLine = testLine;
            }
        }
        engine.surfaceTarget.fillText(currentLine, xPos, yPos);
    };

    engine.draw_rectangle = function (x1, y1, x2, y2, outline) {
        engine.surfaceTarget.beginPath();
        if (outline) {
            engine.surfaceTarget.strokeRect(
                x1 - engine.view_xview,
                y1 - engine.view_yview,
                x2 - x1,
                y2 - y1
            );
        } else {
            engine.surfaceTarget.fillRect(
                x1 - engine.view_xview,
                y1 - engine.view_yview,
                x2 - x1,
                y2 - y1
            );
        }
        engine.surfaceTarget.closePath();
    };

    // Set line properties
    engine.draw_set_line_width = function(width) {
        engine.surfaceTarget.lineWidth = width;
    };

    // Draw a line
    engine.draw_line = function (x1, y1, x2, y2) {
        engine.surfaceTarget.beginPath();
        engine.surfaceTarget.moveTo(x1 - engine.view_xview, y1 - engine.view_yview);
        engine.surfaceTarget.lineTo(x2 - engine.view_xview, y2 - engine.view_yview);
        engine.surfaceTarget.stroke();
        engine.surfaceTarget.closePath();
    };

    // Draw a circle with the given radius
    engine.draw_circle = function (x, y, radius, outline) {
        engine.surfaceTarget.beginPath();
        engine.surfaceTarget.arc(
            x - engine.view_xview,
            y - engine.view_yview,
            radius,
            0,
            Math.PI * 2
        );
        if (outline) {
            engine.surfaceTarget.stroke();
        } else {
            engine.surfaceTarget.fill();
        }
        engine.surfaceTarget.closePath();
    }

    // Draw an ellipse with the given dimensions
    engine.draw_ellipse = function(x, y, width, height, outline) {
        engine.surfaceTarget.beginPath();
        engine.surfaceTarget.ellipse(
            x - engine.view_xview,
            y - engine.view_yview,
            width / 2,
            height / 2,
            0,
            0,
            Math.PI * 2
        );
        if (outline) {
            engine.surfaceTarget.stroke();
        } else {
            engine.surfaceTarget.fill();
        }
        engine.surfaceTarget.closePath();
    };

    // Draw a rounded rectangle
    engine.draw_roundrect = function(x1, y1, x2, y2, radius, outline) {
        const x = x1 - engine.view_xview;
        const y = y1 - engine.view_yview;
        const width = x2 - x1;
        const height = y2 - y1;
        
        engine.surfaceTarget.beginPath();
        engine.surfaceTarget.moveTo(x + radius, y);
        engine.surfaceTarget.lineTo(x + width - radius, y);
        engine.surfaceTarget.arcTo(x + width, y, x + width, y + radius, radius);
        engine.surfaceTarget.lineTo(x + width, y + height - radius);
        engine.surfaceTarget.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        engine.surfaceTarget.lineTo(x + radius, y + height);
        engine.surfaceTarget.arcTo(x, y + height, x, y + height - radius, radius);
        engine.surfaceTarget.lineTo(x, y + radius);
        engine.surfaceTarget.arcTo(x, y, x + radius, y, radius);
        engine.surfaceTarget.closePath();
        
        if (outline) {
            engine.surfaceTarget.stroke();
        } else {
            engine.surfaceTarget.fill();
        }
    };

    // Draw a gradient rectangle
    engine.draw_gradient_rect = function(x1, y1, x2, y2, color1, color2, vertical) {
        const x = x1 - engine.view_xview;
        const y = y1 - engine.view_yview;
        const width = x2 - x1;
        const height = y2 - y1;
        
        const gradient = vertical 
            ? engine.surfaceTarget.createLinearGradient(x, y, x, y + height)
            : engine.surfaceTarget.createLinearGradient(x, y, x + width, y);
            
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        
        engine.surfaceTarget.fillStyle = gradient;
        engine.surfaceTarget.fillRect(x, y, width, height);
        
        // Reset fill style to default
        engine.surfaceTarget.fillStyle = engine.c_white;
    };

    // Draw a triangle
    engine.draw_triangle = function(x1, y1, x2, y2, x3, y3, outline) {
        engine.surfaceTarget.beginPath();
        engine.surfaceTarget.moveTo(x1 - engine.view_xview, y1 - engine.view_yview);
        engine.surfaceTarget.lineTo(x2 - engine.view_xview, y2 - engine.view_yview);
        engine.surfaceTarget.lineTo(x3 - engine.view_xview, y3 - engine.view_yview);
        engine.surfaceTarget.closePath();
        
        if (outline) {
            engine.surfaceTarget.stroke();
        } else {
            engine.surfaceTarget.fill();
        }
    };

    engine.draw_sprite = function (sprite, x, y) {
        if (!sprite || !sprite.image || !sprite.image.complete) return;
        
        const ctx = engine.surfaceTarget;
        const width = sprite.width || sprite.image.width;
        const height = sprite.height || sprite.image.height;
        
        ctx.drawImage(
            sprite.image, 
            x - engine.view_xview, 
            y - engine.view_yview, 
            width, 
            height
        );
    }

    // Draw a sprite with scaling and rotation
    engine.draw_sprite_ext = function(sprite, x, y, xscale, yscale, rotation, alpha) {
        if (!sprite || !sprite.image || !sprite.image.complete) return;
        
        const ctx = engine.surfaceTarget;
        const width = sprite.width || sprite.image.width;
        const height = sprite.height || sprite.image.height;
        
        ctx.save();
        ctx.translate(x - engine.view_xview, y - engine.view_yview);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.globalAlpha = alpha !== undefined ? alpha : 1;
        ctx.drawImage(
            sprite.image, 
            -(width * xscale) / 2,  // Center the sprite
            -(height * yscale) / 2, 
            width * xscale, 
            height * yscale
        );
        ctx.restore();
    };

    // Draw a frame from a sprite sheet
    engine.draw_sprite_part = function(sprite, frame, x, y, width, height) {
        if (!sprite || !sprite.image || !sprite.image.complete) return;
        
        const framesPerRow = sprite.framesPerRow || 1;
        const frameWidth = sprite.frameWidth || sprite.image.width;
        const frameHeight = sprite.frameHeight || sprite.image.height;
        
        const row = Math.floor(frame / framesPerRow);
        const col = frame % framesPerRow;
        
        engine.surfaceTarget.drawImage(
            sprite.image,
            col * frameWidth,
            row * frameHeight,
            frameWidth,
            frameHeight,
            x - engine.view_xview,
            y - engine.view_yview,
            width || frameWidth,
            height || frameHeight
        );
    };

    // Draw an image at a width and height
    engine.draw_image = function (image, x, y) {
        if (image.complete) {
            engine.surfaceTarget.drawImage(
                image,
                x - engine.view_xview,
                y - engine.view_yview,
                image.width,
                image.height
            );
        } else {
            console.error("Image not loaded:", image.src);
        }
    };

    // Draw a background image with optional tiling and parallax effect
    engine.draw_background = function() {
        // Fill background with solid color first
        engine.surfaceTarget.fillStyle = engine.background_color || "#000000";
        engine.surfaceTarget.fillRect(0, 0, engine.canvas.width, engine.canvas.height);
        
        // If no background image is set, return after filling with color
        if (!engine.current_background) return;
        
        // Find the background image resource
        let bgResource = null;
        
        // Check in dedicated backgrounds
        if (window.resources && window.resources.backgrounds) {
            bgResource = window.resources.backgrounds.find(bg => bg.id === engine.current_background);
        }
        
        // Fallback to sprites if not found
        if (!bgResource && window.resources && window.resources.sprites) {
            bgResource = window.resources.sprites.find(sprite => sprite.id === engine.current_background);
        }
        
        // If resource found and image is loaded, draw it
        if (bgResource && bgResource.image && bgResource.image.complete) {
            const mode = engine.background_mode || "stretch";
            
            if (mode === "stretch") {
                // Stretch background to fill canvas
                engine.surfaceTarget.drawImage(
                    bgResource.image,
                    0, 0,
                    engine.canvas.width, engine.canvas.height
                );
            } else if (mode === "tile") {
                // Tile background to fill canvas
                const imgWidth = bgResource.width || bgResource.image.width;
                const imgHeight = bgResource.height || bgResource.image.height;
                
                // Apply parallax speed if set
                const offsetX = engine.background_speed ? 
                    (engine.view_xview * engine.background_speed) % imgWidth : 0;
                const offsetY = engine.background_speed ? 
                    (engine.view_yview * engine.background_speed) % imgHeight : 0;
                
                // Tile the background with offsetting for parallax
                for (let y = -imgHeight + (offsetY % imgHeight); y < engine.canvas.height; y += imgHeight) {
                    for (let x = -imgWidth + (offsetX % imgWidth); x < engine.canvas.width; x += imgWidth) {
                        engine.surfaceTarget.drawImage(bgResource.image, x, y);
                    }
                }
            }
        }
    };

    engine.instance_exists = function (instance) {
        if (instance && instance.object_id && instance.object_id.instances) {
            return instance.object_id.instances.includes(instance);
        }
        return false;
    }

    // Surface management functions
    // Create a new surface (offscreen canvas)
    engine.surface_create = function(width, height) {
        // Create a unique ID for the surface
        const id = 'surface_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        
        // Create the canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Get and store the context
        const ctx = canvas.getContext('2d');
        
        // Create the surface object
        const surface = {
            id: id,
            canvas: canvas,
            context: ctx,
            width: width,
            height: height,
            isValid: true
        };
        
        // Store it in the surfaces collection
        engine.surfaces[id] = surface;
        
        return surface;
    };

    // Set the active drawing target to a surface
    engine.surface_set_target = function(surface) {
        if (!surface || !surface.isValid) {
            console.error("Cannot set target: Invalid surface");
            return false;
        }
        
        // If this is our first surface set, store the default surface
        if (engine.currentSurfaceStack.length === 0) {
            engine.defaultSurface = engine.surfaceTarget;
        }
        
        // Push current surface to the stack
        engine.currentSurfaceStack.push(engine.surfaceTarget);
        
        // Set the new surface as the target
        engine.surfaceTarget = surface.context;
        
        return true;
    };

    // Reset the drawing target to the previous surface
    engine.surface_reset_target = function() {
        if (engine.currentSurfaceStack.length === 0) {
            console.error("Cannot reset target: No surface on stack");
            return false;
        }
        
        // Pop the last surface from the stack
        engine.surfaceTarget = engine.currentSurfaceStack.pop();
        
        return true;
    };
    
    // Free a surface from memory
    engine.surface_free = function(surface) {
        if (!surface || !surface.isValid) {
            return false;
        }
        
        // Mark as invalid
        surface.isValid = false;
        
        // Remove from collection
        delete engine.surfaces[surface.id];
        
        return true;
    };
    
    // Check if a surface is valid
    engine.surface_exists = function(surface) {
        return surface && surface.isValid;
    };
    
    // Draw a surface at the specified position
    engine.draw_surface = function(surface, x, y, width, height) {
        if (!surface || !surface.isValid) {
            console.error("Cannot draw surface: Invalid surface");
            return false;
        }
        
        width = width || surface.width;
        height = height || surface.height;
        
        engine.surfaceTarget.drawImage(
            surface.canvas,
            x - engine.view_xview,
            y - engine.view_yview,
            width,
            height
        );
        
        return true;
    };
    
    // Draw a part of a surface (like sprite_part)
    engine.draw_surface_part = function(surface, sx, sy, sw, sh, x, y, width, height) {
        if (!surface || !surface.isValid) {
            console.error("Cannot draw surface part: Invalid surface");
            return false;
        }
        
        width = width || sw;
        height = height || sh;
        
        engine.surfaceTarget.drawImage(
            surface.canvas,
            sx, sy, sw, sh,
            x - engine.view_xview,
            y - engine.view_yview,
            width, height
        );
        
        return true;
    };
    
    // Clear a surface with a specific color
    engine.surface_clear = function(surface, color) {
        if (!surface || !surface.isValid) {
            console.error("Cannot clear surface: Invalid surface");
            return false;
        }
        
        // Store current target
        const currentTarget = engine.surfaceTarget;
        
        // Set target to this surface
        engine.surfaceTarget = surface.context;
        
        // Clear with color
        const originalStyle = engine.surfaceTarget.fillStyle;
        engine.surfaceTarget.fillStyle = color || "transparent";
        engine.surfaceTarget.clearRect(0, 0, surface.width, surface.height);
        engine.surfaceTarget.fillRect(0, 0, surface.width, surface.height);
        engine.surfaceTarget.fillStyle = originalStyle;
        
        // Reset target
        engine.surfaceTarget = currentTarget;
        
        return true;
    };
    
    // Save surface to an image file (browser download)
    engine.surface_save = function(surface, filename) {
        if (!surface || !surface.isValid) {
            console.error("Cannot save surface: Invalid surface");
            return false;
        }
        
        try {
            // Create a download link
            const link = document.createElement('a');
            link.download = filename || 'surface.png';
            link.href = surface.canvas.toDataURL('image/png');
            
            // Trigger click
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            return true;
        } catch (e) {
            console.error("Error saving surface:", e);
            return false;
        }
    };
    
    // Get a pixel's color from a surface
    engine.surface_getpixel = function(surface, x, y) {
        if (!surface || !surface.isValid) {
            console.error("Cannot get pixel: Invalid surface");
            return null;
        }
        
        try {
            const data = surface.context.getImageData(x, y, 1, 1).data;
            return {
                r: data[0],
                g: data[1],
                b: data[2],
                a: data[3] / 255
            };
        } catch (e) {
            console.error("Error getting pixel data:", e);
            return null;
        }
    };
    
    // Copy one surface to another
    engine.surface_copy = function(targetSurface, x, y, sourceSurface) {
        if (!targetSurface || !targetSurface.isValid || !sourceSurface || !sourceSurface.isValid) {
            console.error("Cannot copy surface: Invalid surface");
            return false;
        }
        
        const currentTarget = engine.surfaceTarget;
        engine.surfaceTarget = targetSurface.context;
        
        engine.surfaceTarget.drawImage(sourceSurface.canvas, x, y);
        
        engine.surfaceTarget = currentTarget;
        return true;
    };
    
    // Blend mode management
    engine.blendModes = {
        bm_normal: "source-over",
        bm_add: "lighter",
        bm_subtract: "difference",
        bm_multiply: "multiply",
        bm_screen: "screen",
        bm_overlay: "overlay",
        bm_darken: "darken",
        bm_lighten: "lighten",
        bm_destination_over: "destination-over",
        bm_source_in: "source-in",
        bm_destination_in: "destination-in",
        bm_source_out: "source-out",
        bm_destination_out: "destination-out",
        bm_source_atop: "source-atop",
        bm_destination_atop: "destination-atop",
        bm_xor: "xor",
        bm_copy: "copy"
    };
    
    // Set the current blend mode
    engine.surface_set_blendmode = function(mode) {
        if (typeof mode === 'string' && engine.blendModes[mode]) {
            engine.surfaceTarget.globalCompositeOperation = engine.blendModes[mode];
        } else if (Object.values(engine.blendModes).includes(mode)) {
            engine.surfaceTarget.globalCompositeOperation = mode;
        } else {
            console.error("Invalid blend mode:", mode);
            return false;
        }
        return true;
    };
    
    // Reset blend mode to normal
    engine.surface_set_blendmode_normal = function() {
        engine.surfaceTarget.globalCompositeOperation = "source-over";
    };
    
    // Set blend mode to additive
    engine.surface_set_blendmode_add = function() {
        engine.surfaceTarget.globalCompositeOperation = "lighter";
    };
    
    // Set blend mode to subtractive
    engine.surface_set_blendmode_subtract = function() {
        engine.surfaceTarget.globalCompositeOperation = "difference";
    };

    // Assign blend mode constants to engine
    for (const [key, value] of Object.entries(engine.blendModes)) {
        engine[key] = key;
        window[key] = key;
    }

    // Game initialization
    engine.gameStart = function () {
        cancelAnimationFrame(engine.animationFrame);

        // Reset game state
        engine.gameObjects = [];
        engine.room_width = 1024;
        engine.room_height = 768;
        engine.view_xview = 0;
        engine.view_yview = 0;
        engine.view_wview = 640;
        engine.view_hview = 480;
        engine.time_scale = 1.0;
        engine.dt = 0.016; // Default to ~60fps for first frame

        // Initialize canvas
        const canvas = engine.createCanvas();
        canvas.width = engine.view_wview;
        canvas.height = engine.view_hview;
        engine.canvas = canvas; 
        engine.context = canvas.getContext('2d');
        if (!engine.context) {
            console.error("Failed to get 2D context");
            return;
        }
        engine.surfaceTarget = engine.context;
        engine.defaultSurface = engine.surfaceTarget;

        // Set default drawing properties
        engine.draw_set_font(24, 'Arial');
        engine.draw_set_align('left');
        engine.draw_set_color(engine.c_white);

        // Create global control object
        const globalObj = engine.object_add();
        globalObj.awake = function () {
            this.debug_mode = true;
            this.text_color = engine.c_red;
        };

        globalObj.draw_gui = function () {
            if (this.debug_mode) {
                engine.draw_set_color(this.text_color);
                engine.draw_set_alpha(engine.a_100);
                engine.draw_text(
                    engine.view_xview,
                    engine.view_yview,
                    `Obj Count: ${engine.object_count}; Inst Count: ${engine.instance_count}; FPS: ${engine.fps}`
                );
                engine.draw_set_color(engine.c_white);
            }
        };

        engine.control = engine.instance_create(0, 0, globalObj);
        engine.lastTick = new Date().getTime();

        // Start game loop
        engine.updateGameArea();
    };

    // Helper function to generate a spline path through points
    engine._drawSplinePath = function(points, tension, closeShape) {
        const ctx = engine.surfaceTarget;
        const len = points.length;
        
        if (len < 3) return; // Not enough points for a spline
        
        ctx.moveTo(points[0].x, points[0].y);
        
        // Create a closed loop if requested
        const pts = closeShape ? [...points, ...points.slice(0, 3)] : points;
        const numPoints = pts.length;
        
        // Tension controls how "tight" the curve is (0.5 is a good default)
        const t = Math.min(1, Math.max(0, tension)) * 0.5;
        
        // Draw the splines
        for (let i = 0; i < numPoints - 3; i++) {
            const p0 = pts[i];
            const p1 = pts[i+1];
            const p2 = pts[i+2];
            const p3 = pts[i+3];
            
            // Calculate control points
            const cp1x = p1.x + (p2.x - p0.x) * t;
            const cp1y = p1.y + (p2.y - p0.y) * t;
            const cp2x = p2.x - (p3.x - p1.x) * t;
            const cp2y = p2.y - (p3.y - p1.y) * t;
            
            // Draw cubic Bezier curve
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
        
        if (closeShape) {
            ctx.closePath();
        }
    };

    engine.gameRestartEval = function () {
        engine.gameStart();
        const code = document.getElementById(engine.textboxId).value;
        engine.execute_string(code);
    };

    // Restart the game
    engine.gameRestart = function () {
        engine.gameStart();
    };

    // Execute code from a string
    engine.execute_string = function (code) {
        try {
            eval(code);
        } catch (e) {
            console.error("Code execution error:", e);
        }
    };

    // Main game loop
    engine.updateGameArea = function () {
        // Calculate delta time and FPS
        const now = new Date().getTime();
        const delta = (now - engine.lastTick) / 1000;
        engine.lastTick = now;
        engine.dt = delta;
        engine.fps = Math.ceil(1 / delta);

        // Clear the canvas
        engine.context.fillStyle = engine.background_color;
        engine.context.fillRect(0, 0, engine.view_wview, engine.view_hview);

        engine.draw_background();

        // Update all game objects
        let insCount = 0;

        // Update logic for all instances
        for (let i = 0; i < engine.gameObjects.length; i++) {
            const obj = engine.gameObjects[i];
            if (obj.instances) {
                for (let j = 0; j < obj.instances.length; j++) {
                    const ins = obj.instances[j];
                    if (ins.active) {
                        ins.updateMain();
                        insCount++;
                    }
                }
            }
        }

        // Draw all instances
        for (let i = 0; i < engine.gameObjects.length; i++) {
            const obj = engine.gameObjects[i];
            if (obj.instances) {
                for (let j = 0; j < obj.instances.length; j++) {
                    const ins = obj.instances[j];
                    if (ins.visible && ins.active) {
                        ins.mainDraw();
                    }
                }
            }
        }

        // Draw GUI elements
        for (let i = 0; i < engine.gameObjects.length; i++) {
            const obj = engine.gameObjects[i];
            if (obj.instances) {
                for (let j = 0; j < obj.instances.length; j++) {
                    const ins = obj.instances[j];
                    if (ins.visible && ins.active) {
                        ins.mainDrawGui();
                    }
                }
            }
        }

        // Update stats
        engine.instance_count = insCount;
        engine.object_count = engine.gameObjects.length;

        // Update mouse position
        engine.mouse_x = engine.mx + engine.view_xview;
        engine.mouse_y = engine.my + engine.view_yview;

        // Update keyboard states
        engine.keyboard_update();

        // Request next frame
        engine.animationFrame = requestAnimationFrame(engine.updateGameArea);
    };

    // Listen for mouse movement
    document.addEventListener('mousemove', function (e) {
        // Only process mouse movement if context and canvas are initialized
        if (engine.context && engine.context.canvas) {
            const rect = engine.context.canvas.getBoundingClientRect();
            engine.mx = e.clientX - rect.left;
            engine.my = e.clientY - rect.top;
        }
    });

    // Keyboard handling
    engine.key = {}; // Object to store key states
    engine.keyCode = {}; // Object to store key codes

    // Define key codes and bind them to the window object
    const keyBindings = {
        vk_left: 37,
        vk_up: 38,
        vk_right: 39,
        vk_down: 40,
        vk_space: 32,
        vk_enter: 13,
        vk_escape: 27,
        vk_shift: 16,
        vk_control: 17,
        vk_alt: 18
    };

    // Assign key bindings to both engine and window
    for (const [key, value] of Object.entries(keyBindings)) {
        engine[key] = value;
        window[key] = value;
    }

    // Key codes for letters A-Z
    for (let i = 65; i <= 90; i++) {
        const keyName = `vk_${String.fromCharCode(i).toLowerCase()}`;
        engine[keyName] = i;
        window[keyName] = i;
    }

    // Key codes for numbers 0-9
    for (let i = 48; i <= 57; i++) {
        const keyName = `vk_${i - 48}`;
        engine[keyName] = i;
        window[keyName] = i;
    }

    // Check if a key is currently pressed
    engine.keyboard_check = function(keyCode) {
        return engine.key[keyCode] === true;
    };

    // Check if a key was just pressed this frame
    engine.keyboard_check_pressed = function(keyCode) {
        return engine.keyCode[keyCode] === 1;
    };

    // Check if a key was just released this frame
    engine.keyboard_check_released = function(keyCode) {
        return engine.keyCode[keyCode] === -1;
    };

    // Reset the keyboard state for the next frame
    engine.keyboard_update = function() {
        for (const key in engine.keyCode) {
            if (engine.keyCode[key] === 1) {
                engine.keyCode[key] = 2; // Set to held state
            } else if (engine.keyCode[key] === -1) {
                delete engine.keyCode[key]; // Remove released keys
                delete engine.key[key];     // Remove from held keys too
            }
        }
    };

    // Add event listeners for keyboard events
    document.addEventListener('keydown', function(e) {
        if (!engine.key[e.keyCode]) {
            engine.key[e.keyCode] = true;
            engine.keyCode[e.keyCode] = 1; // Just pressed
        }
        
        // Get the canvas element
        const canvas = document.getElementById(engine.canvasId);
        
        // Only prevent default actions for game keys if canvas exists and has focus
        if (canvas && (document.activeElement === canvas || 
            canvas.contains(document.activeElement) || 
            document.activeElement === document.body)) {
            if ((e.keyCode >= 37 && e.keyCode <= 40) || // Arrow keys
                e.keyCode === 32) {                     // Space bar
                e.preventDefault();
            }
        }
    });

    document.addEventListener('keyup', function(e) {
        engine.key[e.keyCode] = false;
        engine.keyCode[e.keyCode] = -1; // Just released
    });

    // Return the engine interface
    return engine;
}

// Export to window
window.createGameEngine = createGameEngine;
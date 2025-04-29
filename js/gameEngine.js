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
    engine.view_wview = 640;
    engine.view_hview = 480;
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

    // Define color constants
    engine.c_white = engine.rgb(255, 255, 255);
    engine.c_black = engine.rgb(0, 0, 0);
    engine.c_red = engine.rgb(255, 0, 0);
    engine.c_ltgray = engine.rgb(176, 176, 176);
    engine.c_gray = engine.rgb(128, 128, 128);
    engine.c_dkgray = engine.rgb(64, 64, 64);
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

    engine.draw_line = function (x1, y1, x2, y2) {
        engine.surfaceTarget.beginPath();
        engine.surfaceTarget.moveTo(x1 - engine.view_xview, y1 - engine.view_yview);
        engine.surfaceTarget.lineTo(x2 - engine.view_xview, y2 - engine.view_yview);
        engine.surfaceTarget.stroke();
        engine.surfaceTarget.closePath();
    };

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

    engine.draw_image = function (image, x, y, width, height) {
        if (image.complete) {
            engine.surfaceTarget.drawImage(
                image,
                x - engine.view_xview,
                y - engine.view_yview,
                width || image.width,
                height || image.height
            );
        } else {
            console.error("Image not loaded:", image.src);
        }
    };

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
    engine.vk_left = 37;
    engine.vk_up = 38;
    engine.vk_right = 39;
    engine.vk_down = 40;
    engine.vk_space = 32;
    engine.vk_enter = 13;
    engine.vk_escape = 27;
    engine.vk_shift = 16;
    engine.vk_control = 17;
    engine.vk_alt = 18;

    // Key codes for letters A-Z
    for (let i = 65; i <= 90; i++) {
        engine[`vk_${String.fromCharCode(i).toLowerCase()}`] = i;
    }

    // Key codes for numbers 0-9
    for (let i = 48; i <= 57; i++) {
        engine[`vk_${i - 48}`] = i;
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
// This file maps game engine functions to global window functions for easy access
// It should be included after gameEngine.js but before your game code

function window_global_functions() {
    // Ensure engine is available
    if (!window.engine) {
        console.warn("Engine not available yet. Global functions will be registered when engine initializes.");
        return;
    }
    
    // Drawing functions
    window.draw_set_color = function(color) { return window.engine.draw_set_color(color); };
    window.draw_set_alpha = function(alpha) { return window.engine.draw_set_alpha(alpha); };
    window.draw_set_font = function(size, name) { return window.engine.draw_set_font(size, name); };
    window.draw_set_align = function(align) { return window.engine.draw_set_align(align); };
    window.draw_text = function(x, y, text) { return window.engine.draw_text(x, y, text); };
    window.draw_text_ext = function(x, y, text, lineHeight, maxWidth) { return window.engine.draw_text_ext(x, y, text, lineHeight, maxWidth); };
    window.draw_rectangle = function(x1, y1, x2, y2, outline) { return window.engine.draw_rectangle(x1, y1, x2, y2, outline); };
    window.draw_set_line_width = function(width) { return window.engine.draw_set_line_width(width); };
    window.draw_line = function(x1, y1, x2, y2) { return window.engine.draw_line(x1, y1, x2, y2); };
    window.draw_circle = function(x, y, radius, outline) { return window.engine.draw_circle(x, y, radius, outline); };
    window.draw_ellipse = function(x, y, width, height, outline) { return window.engine.draw_ellipse(x, y, width, height, outline); };
    window.draw_roundrect = function(x1, y1, x2, y2, radius, outline) { return window.engine.draw_roundrect(x1, y1, x2, y2, radius, outline); };
    window.draw_gradient_rect = function(x1, y1, x2, y2, color1, color2, vertical) { return window.engine.draw_gradient_rect(x1, y1, x2, y2, color1, color2, vertical); };
    window.draw_triangle = function(x1, y1, x2, y2, x3, y3, outline) { return window.engine.draw_triangle(x1, y1, x2, y2, x3, y3, outline); };
    window.draw_sprite = function(sprite, x, y) { return window.engine.draw_sprite(sprite, x, y); };
    window.draw_sprite_ext = function(sprite, x, y, xscale, yscale, rotation, alpha) { return window.engine.draw_sprite_ext(sprite, x, y, xscale, yscale, rotation, alpha); };
    window.draw_sprite_part = function(sprite, frame, x, y, width, height) { return window.engine.draw_sprite_part(sprite, frame, x, y, width, height); };
    window.draw_image = function(image, x, y) { return window.engine.draw_image(image, x, y); };
    window.draw_background = function() { return window.engine.draw_background(); };
    
    // Shape drawing system
    window.draw_shape_start = function(x, y, outline = true, spline = 0) { 
        if (!window.engine._shape_started) {
            window.engine._shape_started = true;
            window.engine._shape_points = [{
                x: x - window.engine.view_xview, 
                y: y - window.engine.view_yview
            }];
            window.engine._shape_outline = outline;
            window.engine._shape_spline = spline;
            return true;
        }
        return false;
    };
    
    window.draw_shape_point = function(x, y) { 
        if (!window.engine._shape_started) {
            console.error("Cannot add shape point: No shape started. Call draw_shape_start first.");
            return false;
        }
        
        window.engine._shape_points.push({
            x: x - window.engine.view_xview, 
            y: y - window.engine.view_yview
        });
        return true;
    };
    
    window.draw_shape_end = function(closeShape = true) { 
        if (!window.engine._shape_started) {
            console.error("Cannot end shape: No shape started. Call draw_shape_start first.");
            return false;
        }
        
        // Need at least 3 points to form a shape
        if (window.engine._shape_points.length < 3) {
            console.error("Cannot draw shape: Need at least 3 points.");
            window.engine._shape_started = false;
            window.engine._shape_points = [];
            return false;
        }
        
        window.engine.surfaceTarget.beginPath();
        
        // Draw with splines or straight segments based on spline factor
        if (window.engine._shape_spline > 0) {
            window.engine._drawSplinePath(window.engine._shape_points, window.engine._shape_spline, closeShape);
        } else {
            // Draw regular polygon
            window.engine.surfaceTarget.moveTo(window.engine._shape_points[0].x, window.engine._shape_points[0].y);
            
            for (let i = 1; i < window.engine._shape_points.length; i++) {
                window.engine.surfaceTarget.lineTo(
                    window.engine._shape_points[i].x,
                    window.engine._shape_points[i].y
                );
            }
            
            if (closeShape) {
                window.engine.surfaceTarget.closePath();
            }
        }
        
        // Fill or stroke based on outline setting
        if (window.engine._shape_outline) {
            window.engine.surfaceTarget.stroke();
        } else {
            window.engine.surfaceTarget.fill();
        }
        
        // Reset shape state
        window.engine._shape_started = false;
        window.engine._shape_points = [];
        return true;
    };
    
    // Surface functions
    window.surface_create = function(width, height) { return window.engine.surface_create(width, height); };
    window.surface_set_target = function(surface) { return window.engine.surface_set_target(surface); };
    window.surface_reset_target = function() { return window.engine.surface_reset_target(); };
    window.surface_free = function(surface) { return window.engine.surface_free(surface); };
    window.surface_exists = function(surface) { return window.engine.surface_exists(surface); };
    window.draw_surface = function(surface, x, y, width, height) { return window.engine.draw_surface(surface, x, y, width, height); };
    window.draw_surface_part = function(surface, sx, sy, sw, sh, x, y, width, height) { return window.engine.draw_surface_part(surface, sx, sy, sw, sh, x, y, width, height); };
    window.surface_clear = function(surface, color) { return window.engine.surface_clear(surface, color); };
    window.surface_save = function(surface, filename) { return window.engine.surface_save(surface, filename); };
    window.surface_getpixel = function(surface, x, y) { return window.engine.surface_getpixel(surface, x, y); };
    window.surface_copy = function(targetSurface, x, y, sourceSurface) { return window.engine.surface_copy(targetSurface, x, y, sourceSurface); };
    
    // Blend modes
    window.surface_set_blendmode = function(mode) { return window.engine.surface_set_blendmode(mode); };
    window.surface_set_blendmode_normal = function() { return window.engine.surface_set_blendmode_normal(); };
    window.surface_set_blendmode_add = function() { return window.engine.surface_set_blendmode_add(); };
    window.surface_set_blendmode_subtract = function() { return window.engine.surface_set_blendmode_subtract(); };
    
    // Math utility functions
    window.point_distance = function(x1, y1, x2, y2) { return window.engine.point_distance(x1, y1, x2, y2); };
    window.point_direction = function(x1, y1, x2, y2) { return window.engine.point_direction(x1, y1, x2, y2); };
    window.lengthdir_x = function(len, dir) { return window.engine.lengthdir_x(len, dir); };
    window.lengthdir_y = function(len, dir) { return window.engine.lengthdir_y(len, dir); };
    
    // Math utility functions
    window.floor = Math.floor;
    window.ceil = Math.ceil;
    window.round = Math.round;
    window.abs = Math.abs;
    window.sign = Math.sign;
    window.sin = Math.sin;
    window.cos = Math.cos;
    window.tan = Math.tan;
    window.degtorad = function(degrees) { return degrees * (Math.PI / 180); };
    window.radtodeg = function(radians) { return radians * (180 / Math.PI); };
    
    // Clamp function
    window.clamp = function(value, min, max) {
        return Math.min(Math.max(value, min), max);
    };
    
    // Random functions
    window.random = function(max) { return Math.random() * max; };
    window.random_range = function(min, max) { return min + Math.random() * (max - min); };
    window.irandom = function(max) { return Math.floor(Math.random() * (max + 1)); };
    window.irandom_range = function(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); };
    
    // Game object functions
    window.object_add = function() { return window.engine.object_add(); };
    window.instance_create = function(x, y, object) { return window.engine.instance_create(x, y, object); };
    window.instance_exists = function(instance) { return window.engine.instance_exists(instance); };
    
    // Input functions
    window.keyboard_check = function(keyCode) { return window.engine.keyboard_check(keyCode); };
    window.keyboard_check_pressed = function(keyCode) { return window.engine.keyboard_check_pressed(keyCode); };
    window.keyboard_check_released = function(keyCode) { return window.engine.keyboard_check_released(keyCode); };
    
    // Color helpers
    window.rgb = function(r, g, b) { return window.engine.rgb(r, g, b); };
    window.rgba = function(r, g, b, a) { return `rgba(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)},${a})`; };
    window.make_color_rgb = function(r, g, b) { return window.engine.rgb(r, g, b); };
    window.make_color_hsv = function(h, s, v) {
        h = h % 360;
        s = Math.max(0, Math.min(1, s));
        v = Math.max(0, Math.min(1, v));
        
        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;
        
        let r, g, b;
        
        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        
        return window.engine.rgb((r+m)*255, (g+m)*255, (b+m)*255);
    };
    
    // String functions
    window.string = function(val) { return String(val); };
    window.string_format = function(val, totalWidth, decimalPlaces) {
        return val.toFixed(decimalPlaces).padStart(totalWidth, ' ');
    };
    
    // Game state variables - use safer method to define properties
    function safeDefineProperty(obj, prop, descriptor) {
        // Check if property already exists with a getter/setter
        const existingDescriptor = Object.getOwnPropertyDescriptor(obj, prop);
        if (existingDescriptor && (existingDescriptor.get || existingDescriptor.set)) {
            console.log(`Property ${prop} already defined with getters/setters, skipping redefinition`);
            return;
        }
        
        try {
            Object.defineProperty(obj, prop, descriptor);
        } catch (e) {
            console.warn(`Could not define property ${prop}:`, e.message);
            // Fallback to direct assignment as a last resort
            if (descriptor.get) {
                obj[prop] = descriptor.get();
            }
        }
    }

    // Now use the safe method to define all properties
    safeDefineProperty(window, 'room_width', {
        get: function() { return window.engine.room_width; },
        set: function(value) { window.engine.room_width = value; },
        configurable: true // Allow future redefinition
    });

    safeDefineProperty(window, 'room_height', {
        get: function() { return window.engine.room_height; },
        set: function(value) { window.engine.room_height = value; },
        configurable: true
    });

    safeDefineProperty(window, 'view_xview', {
        get: function() { return window.engine.view_xview; },
        set: function(value) { window.engine.view_xview = value; },
        configurable: true
    });

    safeDefineProperty(window, 'view_yview', {
        get: function() { return window.engine.view_yview; },
        set: function(value) { window.engine.view_yview = value; },
        configurable: true
    });

    safeDefineProperty(window, 'view_wview', {
        get: function() { return window.engine.view_wview; },
        set: function(value) { window.engine.view_wview = value; },
        configurable: true
    });

    safeDefineProperty(window, 'view_hview', {
        get: function() { return window.engine.view_hview; },
        set: function(value) { window.engine.view_hview = value; },
        configurable: true
    });

    safeDefineProperty(window, 'mouse_x', {
        get: function() { return window.engine.mouse_x; },
        configurable: true
    });

    safeDefineProperty(window, 'mouse_y', {
        get: function() { return window.engine.mouse_y; },
        configurable: true
    });

    safeDefineProperty(window, 'dt', {
        get: function() { return window.engine.dt; },
        configurable: true
    });

    safeDefineProperty(window, 'fps', {
        get: function() { return window.engine.fps; },
        configurable: true
    });
    
    // Export color constants to global scope
    window.c_white = window.engine.c_white;
    window.c_black = window.engine.c_black;
    window.c_red = window.engine.c_red;
    window.c_ltgray = window.engine.c_ltgray;
    window.c_gray = window.engine.c_gray;
    window.c_dkgray = window.engine.c_dkgray;
    window.c_blue = window.engine.c_blue;
    window.c_green = window.engine.c_green;
    window.c_yellow = window.engine.c_yellow;
    window.c_cyan = window.engine.c_cyan;
    window.c_magenta = window.engine.c_magenta;
    window.c_orange = window.engine.c_orange;
    window.c_purple = window.engine.c_purple;
    window.c_brown = window.engine.c_brown;
    window.c_pink = window.engine.c_pink;
    window.c_gold = window.engine.c_gold;
    window.c_silver = window.engine.c_silver;
    window.c_steel = window.engine.c_steel;
    window.c_olive = window.engine.c_olive;
    window.c_teal = window.engine.c_teal;
    window.c_navy = window.engine.c_navy;
    window.c_lime = window.engine.c_lime;
    window.c_maroon = window.engine.c_maroon;
    
    // Export virtual key constants
    const keyBindings = [
        'vk_left', 'vk_up', 'vk_right', 'vk_down', 'vk_space', 
        'vk_enter', 'vk_escape', 'vk_shift', 'vk_control', 'vk_alt'
    ];
    
    // Export all key constants
    for (const key of keyBindings) {
        if (window.engine[key] !== undefined) {
            window[key] = window.engine[key];
        }
    }
    
    // Export blend mode constants
    for (const key in window.engine.blendModes) {
        if (window.engine.blendModes.hasOwnProperty(key)) {
            window[key] = key;
        }
    }
    
    // Log success message
    console.log("Global game engine functions successfully registered.");
}

// Export the global functions to the window object
window.window_global_functions = window_global_functions;
function create_dialog_module() {
    return engine.module("dialog", {
        // Dialog properties
        text: "",                     // Current text to display
        target_text: "",              // Full text being revealed
        display_text: "",             // Text currently shown (partial during typing)
        char_index: 0,                // Current character index during typing
        char_speed: 0.05,             // Time between characters in seconds
        char_timer: 0,                // Timer for next character
        
        // Dialog state
        active: false,                // Whether dialog is active
        typing: false,                // Whether text is currently being typed
        waiting: false,               // Whether waiting for input
        
        // Dialog box properties
        width: 600,                   // Width of dialog box
        height: 150,                  // Height of dialog box
        padding: 20,                  // Padding inside dialog box
        align: "left",                // Text alignment
        
        // Visual properties
        background_color: "rgba(0,0,0,0.8)", // Background color
        text_color: "#FFFFFF",        // Text color
        border_color: "#888888",      // Border color
        font_size: 24,                // Font size in pixels
        font_family: "Arial",         // Font family
        
        // Portrait properties
        portrait: null,               // Portrait image
        portrait_width: 100,          // Portrait width
        portrait_height: 100,         // Portrait height
        
        // Speaker properties
        speaker_name: "",             // Current speaker name
        name_color: "#FFFF00",        // Speaker name color
        
        // Dialog flow control
        dialog_queue: [],             // Queue of dialog entries to display
        current_dialog: null,         // Current dialog entry
        auto_progress: false,         // Whether to automatically progress
        auto_timer: 0,                // Timer for auto progress
        auto_delay: 2,                // Auto progress delay in seconds
        callbacks: {},                // Callback functions
        
        _init: function() {
            this.dialog_queue = [];
            this.callbacks = {};
        },
        
        loop: function() {
            if (!this.active) return;
            
            const dt = engine.dt;
            
            // Handle typing animation
            if (this.typing) {
                this.char_timer -= dt;
                
                if (this.char_timer <= 0) {
                    // Advance to next character
                    this.char_timer = this.char_speed;
                    this.char_index++;
                    
                    // Update displayed text
                    this.display_text = this.target_text.substring(0, this.char_index);
                    
                    // Check if typing is complete
                    if (this.char_index >= this.target_text.length) {
                        this.typing = false;
                        this.waiting = true;
                        
                        // Start auto progress timer if enabled
                        if (this.auto_progress) {
                            this.auto_timer = this.auto_delay;
                        }
                        
                        // Call typing complete callback
                        if (this.callbacks.on_typing_complete) {
                            this.callbacks.on_typing_complete();
                        }
                    }
                }
            }
            
            // Handle auto progress
            if (this.waiting && this.auto_progress) {
                this.auto_timer -= dt;
                
                if (this.auto_timer <= 0) {
                    this.next();
                }
            }
        },
        
        draw_gui: function() {
            if (!this.active) return;
            
            const ctx = engine.surfaceTarget;
            
            // Save context state
            ctx.save();
            
            // Calculate dialog position (centered at bottom of screen)
            const x = (engine.view_wview - this.width) / 2;
            const y = engine.view_hview - this.height - 20;
            
            // Draw dialog background
            ctx.fillStyle = this.background_color;
            ctx.fillRect(x, y, this.width, this.height);
            
            // Draw border
            ctx.strokeStyle = this.border_color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, this.width, this.height);
            
            // Draw portrait if available
            let textX = x + this.padding;
            const textY = y + this.padding;
            
            if (this.portrait && this.portrait.complete) {
                // Draw portrait on left side
                ctx.drawImage(
                    this.portrait,
                    x + this.padding,
                    y + (this.height - this.portrait_height) / 2,
                    this.portrait_width,
                    this.portrait_height
                );
                
                // Adjust text position
                textX += this.portrait_width + this.padding;
            }
            
            // Set up text properties
            ctx.font = `${this.font_size}px ${this.font_family}`;
            ctx.textAlign = this.align;
            
            // Calculate text area width
            const textAreaWidth = this.width - (textX - x) - this.padding;
            
            // Draw speaker name if available
            if (this.speaker_name) {
                ctx.fillStyle = this.name_color;
                ctx.fillText(this.speaker_name, textX, textY + this.font_size);
            }
            
            // Draw text with word wrap
            ctx.fillStyle = this.text_color;
            this.draw_text_wrapped(
                ctx, 
                this.display_text, 
                textX, 
                textY + (this.speaker_name ? this.font_size * 1.5 : 0) + this.font_size,
                textAreaWidth,
                this.font_size * 1.2
            );
            
            // Draw continue indicator if waiting for input
            if (this.waiting && !this.auto_progress) {
                // Animate the continue indicator
                const indicator = "▼";
                const indicatorX = x + this.width - this.padding;
                const indicatorY = y + this.height - this.padding;
                
                // Subtle bounce animation
                const bounce = Math.sin(engine.lastTick / 250) * 3;
                
                ctx.fillText(indicator, indicatorX, indicatorY + bounce);
            }
            
            // Restore context state
            ctx.restore();
        },
        
        // Start a dialog with a single message
        show: function(text, speaker = "", portrait = null) {
            this.dialog_queue = [{
                text: text,
                speaker: speaker,
                portrait: portrait
            }];
            
            this.start_dialog();
            return this;
        },
        
        // Add dialog entries to queue
        add: function(entries) {
            if (!Array.isArray(entries)) {
                entries = [entries];
            }
            
            this.dialog_queue.push(...entries);
            
            // Start dialog if not active
            if (!this.active && this.dialog_queue.length > 0) {
                this.start_dialog();
            }
            
            return this;
        },
        
        // Start displaying the dialog queue
        start_dialog: function() {
            if (this.dialog_queue.length === 0) {
                this.close();
                return this;
            }
            
            // Get next dialog entry
            this.current_dialog = this.dialog_queue.shift();
            
            // Set dialog properties
            this.target_text = this.current_dialog.text || "";
            this.speaker_name = this.current_dialog.speaker || "";
            
            // Load portrait if specified
            if (this.current_dialog.portrait) {
                if (typeof this.current_dialog.portrait === 'string') {
                    // Load from URL
                    this.portrait = new Image();
                    this.portrait.src = this.current_dialog.portrait;
                } else {
                    // Use provided image object
                    this.portrait = this.current_dialog.portrait;
                }
            } else {
                this.portrait = null;
            }
            
            // Set initial state
            this.active = true;
            this.typing = true;
            this.waiting = false;
            this.char_index = 0;
            this.display_text = "";
            this.char_timer = 0;
            
            // Call dialog start callback
            if (this.callbacks.on_dialog_start) {
                this.callbacks.on_dialog_start(this.current_dialog);
            }
            
            return this;
        },
        
        // Progress to next dialog or complete
        next: function() {
            // If typing, complete current text immediately
            if (this.typing) {
                this.display_text = this.target_text;
                this.char_index = this.target_text.length;
                this.typing = false;
                this.waiting = true;
                return this;
            }
            
            // Call dialog end callback
            if (this.callbacks.on_dialog_end) {
                this.callbacks.on_dialog_end(this.current_dialog);
            }
            
            // Process next dialog or close
            if (this.dialog_queue.length > 0) {
                this.start_dialog();
            } else {
                this.close();
            }
            
            return this;
        },
        
        // Close the dialog
        close: function() {
            this.active = false;
            this.typing = false;
            this.waiting = false;
            this.current_dialog = null;
            
            // Call dialog complete callback
            if (this.callbacks.on_dialog_complete) {
                this.callbacks.on_dialog_complete();
            }
            
            return this;
        },
        
        // Skip typing animation
        skip_typing: function() {
            if (this.typing) {
                this.display_text = this.target_text;
                this.char_index = this.target_text.length;
                this.typing = false;
                this.waiting = true;
                
                // Call typing complete callback
                if (this.callbacks.on_typing_complete) {
                    this.callbacks.on_typing_complete();
                }
            }
            return this;
        },
        
        // Register a callback
        on: function(event, callback) {
            this.callbacks[event] = callback;
            return this;
        },
        
        // Helper method to draw wrapped text
        draw_text_wrapped: function(ctx, text, x, y, maxWidth, lineHeight) {
            const words = text.split(' ');
            let line = '';
            let testLine = '';
            let lineCount = 0;
            
            for (let i = 0; i < words.length; i++) {
                testLine = line + words[i] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                
                if (testWidth > maxWidth && i > 0) {
                    ctx.fillText(line, x, y + (lineCount * lineHeight));
                    line = words[i] + ' ';
                    lineCount++;
                } else {
                    line = testLine;
                }
            }
            
            ctx.fillText(line, x, y + (lineCount * lineHeight));
        }
    });
}

window.registerModule('create_dialog_module', create_dialog_module);
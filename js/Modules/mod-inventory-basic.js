function create_inventory_module() {
    return engine.module("inventory", {
        // Inventory properties
        items: [],                // Array of items
        max_items: 20,            // Maximum number of items
        max_stack: 99,            // Maximum stack size for stackable items
        
        // UI properties
        show_ui: false,           // Whether to show inventory UI
        ui_x: 20,                 // UI X position
        ui_y: 20,                 // UI Y position
        ui_width: 400,            // UI width
        ui_height: 300,           // UI height
        slot_size: 48,            // Size of inventory slots
        slot_padding: 4,          // Padding between slots
        slots_per_row: 5,         // Number of slots per row
        ui_bg_color: "rgba(0,0,0,0.8)", // UI background color
        ui_border_color: "#888888", // UI border color
        
        // Item database
        item_db: {},              // Database of item definitions
        
        // Selection
        selected_item: null,      // Currently selected item
        selected_index: -1,       // Index of selected item
        
        // Callbacks
        on_item_added: null,      // Callback when item is added
        on_item_removed: null,    // Callback when item is removed
        on_item_used: null,       // Callback when item is used
        
        _init: function() {
            this.items = [];
            this.item_db = {};
        },
        
        // Register item types in the database
        register_item: function(id, config) {
            this.item_db[id] = {
                id: id,
                name: config.name || id,
                description: config.description || "",
                icon: config.icon || null,
                stackable: config.stackable !== undefined ? config.stackable : false,
                max_stack: config.max_stack || this.max_stack,
                usable: config.usable !== undefined ? config.usable : false,
                use_effect: config.use_effect || null,
                value: config.value || 0,
                rarity: config.rarity || 0,
                category: config.category || "misc",
                // Copy all other properties
                ...config
            };
            
            return this;
        },
        
        // Add an item to inventory
        add_item: function(item_id, quantity = 1, properties = {}) {
            if (!this.item_db[item_id]) {
                console.error(`Item '${item_id}' not found in database`);
                return false;
            }
            
            const item_def = this.item_db[item_id];
            
            // Check if we're at max capacity
            if (this.items.length >= this.max_items && !item_def.stackable) {
                return false;
            }
            
            // For stackable items, try to add to existing stacks
            if (item_def.stackable) {
                // Find existing stack
                for (let i = 0; i < this.items.length; i++) {
                    const item = this.items[i];
                    
                    if (item.id === item_id) {
                        // Check if we can add to this stack
                        const space = item_def.max_stack - item.quantity;
                        
                        if (space > 0) {
                            // Add as much as we can
                            const amount = Math.min(quantity, space);
                            item.quantity += amount;
                            quantity -= amount;
                            
                            // Call callback
                            if (typeof this.on_item_added === 'function') {
                                this.on_item_added(item, amount);
                            }
                            
                            // If we've added everything, we're done
                            if (quantity <= 0) {
                                return true;
                            }
                        }
                    }
                }
            }
            
            // If we get here, we need to create new stacks
            while (quantity > 0 && this.items.length < this.max_items) {
                const stack_size = item_def.stackable ? 
                    Math.min(quantity, item_def.max_stack) : 1;
                
                // Create new item
                const new_item = {
                    id: item_id,
                    quantity: stack_size,
                    // Copy item definition properties
                    name: item_def.name,
                    description: item_def.description,
                    icon: item_def.icon,
                    usable: item_def.usable,
                    value: item_def.value,
                    rarity: item_def.rarity,
                    category: item_def.category,
                    // Apply custom properties
                    ...properties
                };
                
                // Add to inventory
                this.items.push(new_item);
                quantity -= stack_size;
                
                // Call callback
                if (typeof this.on_item_added === 'function') {
                    this.on_item_added(new_item, stack_size);
                }
            }
            
            return quantity <= 0; // Return true if all items were added
        },
        
        // Remove item from inventory
        remove_item: function(item_id, quantity = 1) {
            let remaining = quantity;
            
            // Remove from end of array first (to avoid shifting elements)
            for (let i = this.items.length - 1; i >= 0; i--) {
                const item = this.items[i];
                
                if (item.id === item_id) {
                    if (item.quantity <= remaining) {
                        // Remove entire stack
                        const removed = item.quantity;
                        this.items.splice(i, 1);
                        remaining -= removed;
                        
                        // Call callback
                        if (typeof this.on_item_removed === 'function') {
                            this.on_item_removed(item, removed);
                        }
                    } else {
                        // Remove part of stack
                        item.quantity -= remaining;
                        
                        // Call callback
                        if (typeof this.on_item_removed === 'function') {
                            this.on_item_removed(item, remaining);
                        }
                        
                        remaining = 0;
                    }
                    
                    if (remaining <= 0) {
                        break;
                    }
                }
            }
            
            // Clear selection if the selected item was removed
            if (this.selected_index >= this.items.length) {
                this.selected_index = -1;
                this.selected_item = null;
            }
            
            return quantity - remaining; // Return number of items actually removed
        },
        
        // Check if inventory has item(s)
        has_item: function(item_id, quantity = 1) {
            let count = 0;
            
            for (const item of this.items) {
                if (item.id === item_id) {
                    count += item.quantity;
                    if (count >= quantity) {
                        return true;
                    }
                }
            }
            
            return false;
        },
        
        // Count how many of an item we have
        count_item: function(item_id) {
            let count = 0;
            
            for (const item of this.items) {
                if (item.id === item_id) {
                    count += item.quantity;
                }
            }
            
            return count;
        },
        
        // Use an item (by index)
        use_item: function(index) {
            if (index < 0 || index >= this.items.length) {
                return false;
            }
            
            const item = this.items[index];
            const item_def = this.item_db[item.id];
            
            if (!item.usable || !item_def.use_effect) {
                return false;
            }
            
            // Call use effect (which returns true if successful)
            const success = item_def.use_effect.call(this.parent, item);
            
            if (success) {
                // Remove one of the item
                item.quantity--;
                
                // If empty, remove the slot
                if (item.quantity <= 0) {
                    this.items.splice(index, 1);
                    
                    // Update selection
                    if (this.selected_index === index) {
                        this.selected_index = -1;
                        this.selected_item = null;
                    } else if (this.selected_index > index) {
                        this.selected_index--;
                    }
                }
                
                // Call callback
                if (typeof this.on_item_used === 'function') {
                    this.on_item_used(item);
                }
                
                return true;
            }
            
            return false;
        },
        
        // Select an item by index
        select_item: function(index) {
            if (index < 0 || index >= this.items.length) {
                this.selected_index = -1;
                this.selected_item = null;
                return this;
            }
            
            this.selected_index = index;
            this.selected_item = this.items[index];
            return this;
        },
        
        // Get item at index
        get_item: function(index) {
            if (index < 0 || index >= this.items.length) {
                return null;
            }
            
            return this.items[index];
        },
        
        // Clear the inventory
        clear: function() {
            this.items = [];
            this.selected_index = -1;
            this.selected_item = null;
            return this;
        },
        
        // Sort inventory by criteria
        sort: function(criteria = "id") {
            this.items.sort((a, b) => {
                if (criteria === "name") {
                    return a.name.localeCompare(b.name);
                } else if (criteria === "value") {
                    return b.value - a.value;
                } else if (criteria === "rarity") {
                    return b.rarity - a.rarity;
                } else if (criteria === "category") {
                    return a.category.localeCompare(b.category);
                } else {
                    return a.id.localeCompare(b.id);
                }
            });
            
            return this;
        },
        
        // Toggle inventory UI
        toggle_ui: function() {
            this.show_ui = !this.show_ui;
            return this;
        },
        
        // Draw inventory UI
        draw_gui: function() {
            if (!this.show_ui) return;
            
            const ctx = engine.surfaceTarget;
            
            // Save context state
            ctx.save();
            
            // Draw inventory background
            ctx.fillStyle = this.ui_bg_color;
            ctx.fillRect(this.ui_x, this.ui_y, this.ui_width, this.ui_height);
            
            // Draw border
            ctx.strokeStyle = this.ui_border_color;
            ctx.lineWidth = 2;
            ctx.strokeRect(this.ui_x, this.ui_y, this.ui_width, this.ui_height);
            
            // Draw inventory title
            ctx.font = "18px Arial";
            ctx.fillStyle = "#FFFFFF";
            ctx.textAlign = "left";
            ctx.fillText("Inventory", this.ui_x + 10, this.ui_y + 25);
            
            // Draw slots
            const slots_area_width = this.ui_width - 20;
            const slots_area_height = this.ui_height - 50;
            const slots_x = this.ui_x + 10;
            const slots_y = this.ui_y + 40;
            
            // Calculate slot metrics
            const total_slot_size = this.slot_size + this.slot_padding * 2;
            const visible_rows = Math.floor(slots_area_height / total_slot_size);
            const visible_cols = Math.min(this.slots_per_row, Math.floor(slots_area_width / total_slot_size));
            const visible_slots = visible_rows * visible_cols;
            
            // Draw slot backgrounds
            for (let i = 0; i < visible_slots; i++) {
                const row = Math.floor(i / visible_cols);
                const col = i % visible_cols;
                
                const slot_x = slots_x + col * total_slot_size;
                const slot_y = slots_y + row * total_slot_size;
                
                // Draw slot background
                ctx.fillStyle = i === this.selected_index ? "#555555" : "#333333";
                ctx.fillRect(
                    slot_x + this.slot_padding, 
                    slot_y + this.slot_padding, 
                    this.slot_size, 
                    this.slot_size
                );
                
                // Draw item in slot
                if (i < this.items.length) {
                    const item = this.items[i];
                    const item_def = this.item_db[item.id];
                    
                    // Draw item icon if available
                    if (item.icon && item.icon.complete) {
                        ctx.drawImage(
                            item.icon,
                            slot_x + this.slot_padding + 2,
                            slot_y + this.slot_padding + 2,
                            this.slot_size - 4,
                            this.slot_size - 4
                        );
                    } else {
                        // Draw placeholder color based on rarity
                        const rarityColors = [
                            "#AAAAAA", // Common
                            "#55AA55", // Uncommon
                            "#5555FF", // Rare
                            "#AA55AA", // Epic
                            "#FFAA00"  // Legendary
                        ];
                        
                        const rarity = Math.min(item.rarity, rarityColors.length - 1);
                        ctx.fillStyle = rarityColors[rarity];
                        
                        ctx.fillRect(
                            slot_x + this.slot_padding + 8,
                            slot_y + this.slot_padding + 8,
                            this.slot_size - 16,
                            this.slot_size - 16
                        );
                    }
                    
                    // Draw quantity for stackable items
                    if (item.quantity > 1) {
                        ctx.font = "12px Arial";
                        ctx.fillStyle = "#FFFFFF";
                        ctx.textAlign = "right";
                        ctx.fillText(
                            item.quantity.toString(),
                            slot_x + this.slot_padding + this.slot_size - 4,
                            slot_y + this.slot_padding + this.slot_size - 4
                        );
                    }
                }
            }
            
            // Draw selected item details
            if (this.selected_item) {
                const item = this.selected_item;
                const details_x = this.ui_x + 10;
                const details_y = slots_y + visible_rows * total_slot_size + 10;
                
                ctx.textAlign = "left";
                
                // Draw item name with rarity color
                const rarityColors = [
                    "#AAAAAA", // Common
                    "#55FF55", // Uncommon
                    "#5555FF", // Rare
                    "#FF55FF", // Epic
                    "#FFAA00"  // Legendary
                ];
                
                const rarity = Math.min(item.rarity, rarityColors.length - 1);
                ctx.font = "14px Arial";
                ctx.fillStyle = rarityColors[rarity];
                ctx.fillText(item.name, details_x, details_y);
                
                // Draw item description
                ctx.font = "12px Arial";
                ctx.fillStyle = "#CCCCCC";
                ctx.fillText(
                    item.description || "",
                    details_x,
                    details_y + 20
                );
                
                // Draw item value
                if (item.value > 0) {
                    ctx.fillStyle = "#FFFF00";
                    ctx.fillText(
                        `Value: ${item.value}`,
                        details_x,
                        details_y + 40
                    );
                }
                
                // Draw use prompt if usable
                if (item.usable) {
                    ctx.fillStyle = "#AAFFAA";
                    ctx.fillText(
                        "Use: [E]",
                        details_x + 120,
                        details_y + 40
                    );
                }
            }
            
            // Restore context state
            ctx.restore();
        }
    });
}

window.registerModule('create_inventory_module', create_inventory_module);
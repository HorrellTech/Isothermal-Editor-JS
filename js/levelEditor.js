// Level Editor Module
const LevelEditor = (function() {
    // Private variables
    let levels = [];
    let selectedLevel = null;
    let selectedPaletteObject = null;
    let currentTool = 'place'; // 'place' or 'erase'
    let gridSize = 32;
    let levelEditorCanvas;
    let levelEditorCtx;
    let isMouseDown = false;
    let lastPlacedCell = { x: -1, y: -1 };
    let gameObjects = []; // Reference to game objects from main app
    
    // DOM elements cache
    let elements = {};
    
    // Public methods
    return {
        // Initialize the level editor with game objects from main app
        init: function(gameObjectsRef, generateIdFn, showDialogFn) {
            // Store references to shared functionality
            // Check and fix object names in the input reference
            if (Array.isArray(gameObjectsRef)) {
                console.log("Validating game objects during initialization");
                gameObjectsRef = gameObjectsRef.filter(obj => obj);
                
                // Ensure every object has a valid name
                gameObjectsRef.forEach((obj, index) => {
                    if (!obj.name || typeof obj.name !== 'string') {
                        const defaultName = obj.type || `GameObject${index}`;
                        console.warn(`Fixing unnamed object - assigned name '${defaultName}'`, obj);
                        obj.name = defaultName;
                    }
                });
            }
              
            // Store references to shared functionality
            gameObjects = gameObjectsRef;
            this.generateId = generateIdFn;
            this.showDialog = showDialogFn;
            
            // Cache DOM elements
            elements = {
                levelsList: document.getElementById('levelsList'),
                addLevelBtn: document.getElementById('addLevelBtn'),
                renameLevelBtn: document.getElementById('renameLevelBtn'),
                deleteLevelBtn: document.getElementById('deleteLevelBtn'),
                levelName: document.getElementById('levelName'),
                levelActions: document.getElementById('levelActions'),
                noLevelSelected: document.getElementById('noLevelSelected'),
                levelEditArea: document.getElementById('levelEditArea'),
                gridSizeSelect: document.getElementById('gridSizeSelect'),
                placeObjectBtn: document.getElementById('placeObjectBtn'),
                eraseBtn: document.getElementById('eraseBtn'),
                objectPalette: document.getElementById('objectPalette'),
                levelEditorCanvas: document.getElementById('levelEditorCanvas'),
                levelWidthInput: document.getElementById('levelWidthInput'),
                levelHeightInput: document.getElementById('levelHeightInput'),
                viewWidthInput: document.getElementById('viewWidthInput'),
                viewHeightInput: document.getElementById('viewHeightInput'),
                bgColorInput: document.getElementById('bgColorInput'),
                applyLevelSettings: document.getElementById('applyLevelSettings'),
                levelBackgroundSelect: document.getElementById('levelBackgroundSelect'),
                levelBackgroundOptions: document.getElementById('backgroundImageOptions')
            };
            
            if (elements.levelEditorCanvas) {
                levelEditorCanvas = elements.levelEditorCanvas;
                levelEditorCtx = levelEditorCanvas.getContext('2d');
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initial rendering
            this.renderLevelsList();
        
            // Add tab functionality within the level editor panel
            this.setupLevelEditorTabs();
        
            // Monitor for tab activation to refresh objects
            const allTabButtons = document.querySelectorAll('.tab-btn');
            allTabButtons.forEach(tabBtn => {
                tabBtn.addEventListener('click', (e) => {
                    // If clicking the levels tab, refresh objects
                    if (e.target.getAttribute('data-tab') === 'levels') {
                        console.log("Refreshing level editor game objects");
                        // Update the gameObjects reference to get latest objects from main app
                        if (window.gameObjects) {
                            gameObjects = window.gameObjects;
                            this.updateObjectPalette();
                        }
                    }
                });
            });
            
            // Make game objects reference available to the window - critical for level system
            window.gameObjects = gameObjectsRef;

            // Make sure game objects are explicitly updated on window
            setInterval(() => {
                if (window.LevelEditor && gameObjects) {
                    window.gameObjects = gameObjects;
                    
                    // Only refresh if the level editor tab is active
                    if (document.querySelector('[data-tab="levels"].active')) {
                        window.LevelEditor.refreshGameObjects();
                    }
                }
            }, 1000); // Check every second
        },

        refreshGameObjects: function() {
            // Update the gameObjects reference to get latest objects from app.js
            if (window.gameObjects) {
                console.log("Manually refreshing level editor game objects");
                gameObjects = window.gameObjects;
                this.updateObjectPalette();
                
                // Also redraw the level if needed
                if (selectedLevel) {
                    this.drawLevelGrid();
                }
            }
        },

        setupLevelEditorTabs: function() {
            const tabButtons = document.querySelectorAll('.level-tab-btn');
            const tabPanes = document.querySelectorAll('.level-tab-pane');
            
            if (tabButtons.length === 0 || tabPanes.length === 0) return;
            
            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    // Remove active class from all buttons and panes
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabPanes.forEach(pane => pane.classList.remove('active'));
                    
                    // Add active class to clicked button
                    button.classList.add('active');
                    
                    // Get the tab ID to show
                    const tabId = button.getAttribute('data-level-tab');
                    const targetPane = document.getElementById(`${tabId}-tab`);
                    
                    if (targetPane) {
                        targetPane.classList.add('active');
                    }
                });
            });
        },
        
        // Set up all event listeners
        setupEventListeners: function() {
            // Add new level
            if (elements.addLevelBtn) {
                elements.addLevelBtn.addEventListener('click', () => {
                    this.showDialog('New Level', 'Enter level name:', 'Level', (name) => {
                        if (!name) return;
                        
                        // Check for duplicate level names
                        if (levels.some(level => level.name === name)) {
                            alert(`A level with name "${name}" already exists. Please use a unique name.`);
                            return;
                        }
                        
                        const canvasWidth = parseInt(document.getElementById('canvasWidthSetting').value) || 640;
                        const canvasHeight = parseInt(document.getElementById('canvasHeightSetting').value) || 480;
                        
                        const newLevel = {
                            id: this.generateId(),
                            name: name,
                            width: canvasWidth,
                            height: canvasHeight,
                            viewWidth: canvasWidth,   // Default view width is same as level width
                            viewHeight: canvasHeight, // Default view height is same as level height
                            gridSize: gridSize,
                            backgroundColor: "#333333",
                            backgroundImage: null,
                            backgroundImageMode: "stretch", // "stretch" or "tile"
                            backgroundImageSpeed: 0,        // For parallax scrolling (0 = fixed)
                            objects: [],
                            setupCode: ""
                        };
                        
                        levels.push(newLevel);
                        this.renderLevelsList();
                        this.selectLevel(newLevel.id);
                    });
                });
            }
            
            // Rename level
            if (elements.renameLevelBtn) {
                elements.renameLevelBtn.addEventListener('click', () => {
                    if (!selectedLevel) return;
                    
                    const level = levels.find(l => l.id === selectedLevel);
                    if (level) {
                        this.showDialog('Rename Level', 'Enter new name:', level.name, (name) => {
                            if (!name) return;
                            
                            // Check for duplicate level names
                            if (levels.some(l => l.id !== level.id && l.name === name)) {
                                alert(`A level with name "${name}" already exists. Please use a unique name.`);
                                return;
                            }
                            
                            level.name = name;
                            this.renderLevelsList();
                            elements.levelName.textContent = level.name;
                        });
                    }
                });
            }
            
            // Delete level
            if (elements.deleteLevelBtn) {
                elements.deleteLevelBtn.addEventListener('click', () => {
                    if (!selectedLevel) return;
                    
                    if (confirm('Delete this level?')) {
                        levels = levels.filter(level => level.id !== selectedLevel);
                        selectedLevel = null;
                        this.renderLevelsList();
                        this.updateLevelDetailView();
                    }
                });
            }
            
            // Grid size change
            if (elements.gridSizeSelect) {
                elements.gridSizeSelect.addEventListener('change', () => {
                    gridSize = parseInt(elements.gridSizeSelect.value);
                    
                    if (selectedLevel) {
                        const level = levels.find(l => l.id === selectedLevel);
                        if (level) {
                            level.gridSize = gridSize;
                            this.drawLevelGrid();
                        }
                    }
                });
            }

            elements.levelBackgroundSelect.addEventListener('change', () => {
                const selectedBgId = elements.levelBackgroundSelect.value;
                if (selectedLevel) {
                    const level = levels.find(l => l.id === selectedLevel);
                    if (level) {
                        level.backgroundImage = selectedBgId || null;
                        
                        // Show/hide options based on selection
                        document.getElementById('backgroundImageOptions').style.display = 
                            selectedBgId ? 'block' : 'none';
                            
                        // Redraw the level
                        this.drawLevelGrid();
                    }
                }
            });

            document.querySelectorAll('input[name="bgMode"]').forEach(radio => {
                radio.addEventListener('change', () => {
                    if (selectedLevel) {
                        const level = levels.find(l => l.id === selectedLevel);
                        if (level) {
                            level.backgroundImageMode = radio.value;
                            this.drawLevelGrid();
                        }
                    }
                });
            });

            const editSetupCodeBtn = document.getElementById('editSetupCodeBtn');
            if (editSetupCodeBtn) {
                editSetupCodeBtn.addEventListener('click', () => {
                    if (!selectedLevel) return;
                    const level = levels.find(l => l.id === selectedLevel);
                    if (!level) return;
                    
                    this.showSetupCodeModal(level);
                });
            }
            
            // Apply level settings (width, height, bg color)
            if (elements.applyLevelSettings) {
                elements.applyLevelSettings.addEventListener('click', () => {
                    if (!selectedLevel) return;
                    
                    const level = levels.find(l => l.id === selectedLevel);
                    if (!level) return;
                    
                    const width = parseInt(elements.levelWidthInput.value);
                    const height = parseInt(elements.levelHeightInput.value);
                    const viewWidth = parseInt(elements.viewWidthInput.value);
                    const viewHeight = parseInt(elements.viewHeightInput.value);
                    const bgColor = elements.bgColorInput.value;
                    
                    if (width > 0 && height > 0) {
                        // Store previous values for comparison
                        const prevWidth = level.width;
                        const prevHeight = level.height;
                        
                        level.width = width;
                        level.height = height;
                        level.backgroundColor = bgColor;
                        
                        // Update view dimensions if provided
                        if (viewWidth > 0) level.viewWidth = Math.min(viewWidth, width);
                        if (viewHeight > 0) level.viewHeight = Math.min(viewHeight, height);
                        
                        // Update canvas size - this is critical for proper display
                        if (levelEditorCanvas) {
                            // Apply size limits to prevent browser crashes
                            const maxDimension = 30000;
                            const finalWidth = Math.min(width, maxDimension);
                            const finalHeight = Math.min(height, maxDimension);
                            
                            levelEditorCanvas.width = finalWidth;
                            levelEditorCanvas.height = finalHeight;
                            
                            // Force the canvas to have the right dimensions
                            levelEditorCanvas.style.width = finalWidth + 'px';
                            levelEditorCanvas.style.height = finalHeight + 'px';
                            
                            // Update the grid container to match canvas size
                            const gridContainer = levelEditorCanvas.parentElement;
                            if (gridContainer) {
                                gridContainer.style.width = finalWidth + 'px';
                                gridContainer.style.height = finalHeight + 'px';
                                gridContainer.style.position = 'relative';
                            }
                            
                            // If size increased significantly, reposition objects at the edges
                            if (width < prevWidth || height < prevHeight) {
                                // Adjust objects that would now be outside the room
                                level.objects.forEach(obj => {
                                    const rightEdge = obj.x + level.gridSize;
                                    const bottomEdge = obj.y + level.gridSize;
                                    
                                    if (rightEdge > width) {
                                        // Object extends beyond right edge
                                        const newGridX = Math.floor((width - level.gridSize) / level.gridSize);
                                        obj.gridX = newGridX;
                                        obj.x = newGridX * level.gridSize;
                                    }
                                    
                                    if (bottomEdge > height) {
                                        // Object extends beyond bottom edge
                                        const newGridY = Math.floor((height - level.gridSize) / level.gridSize);
                                        obj.gridY = newGridY;
                                        obj.y = newGridY * level.gridSize;
                                    }
                                });
                            }
                        }
                        
                        // Redraw the level with updated dimensions
                        this.drawLevelGrid();
                    }
                });
            }
            
            // Tool selection
            if (elements.placeObjectBtn && elements.eraseBtn) {
                elements.placeObjectBtn.addEventListener('click', () => {
                    currentTool = 'place';
                    elements.placeObjectBtn.classList.add('active');
                    elements.eraseBtn.classList.remove('active');
                });
                
                elements.eraseBtn.addEventListener('click', () => {
                    currentTool = 'erase';
                    elements.eraseBtn.classList.add('active');
                    elements.placeObjectBtn.classList.remove('active');
                });
            }
            
            // Set up canvas event listeners when level is selected
            if (levelEditorCanvas) {
                levelEditorCanvas.addEventListener('mousedown', (e) => {
                    if (!selectedLevel) return;
                    isMouseDown = true;
                    this.handleCanvasClick(e);
                });
                
                levelEditorCanvas.addEventListener('mousemove', (e) => {
                    if (!isMouseDown || !selectedLevel) return;
                    this.handleCanvasClick(e);
                });
                
                levelEditorCanvas.addEventListener('mouseup', () => {
                    isMouseDown = false;
                    lastPlacedCell = { x: -1, y: -1 };
                });
                
                levelEditorCanvas.addEventListener('mouseleave', () => {
                    isMouseDown = false;
                    lastPlacedCell = { x: -1, y: -1 };
                });
            }
        },

        showSetupCodeModal: function(level) {
            // Create overlay and modal
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            
            const modal = document.createElement('div');
            modal.className = 'modal setup-code-modal';
            
            modal.innerHTML = `
                <div class="modal-header">
                    <h3>Level Setup Code</h3>
                    <button class="close-modal-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="setupCodeEditor" class="setup-code-editor"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn cancel-btn">Cancel</button>
                    <button class="btn apply-btn">Apply</button>
                </div>
            `;
            
            // Add to document
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            // Initialize CodeMirror editor
            const setupCodeEditor = CodeMirror(document.getElementById('setupCodeEditor'), {
                value: level.setupCode || '',
                mode: 'javascript',
                theme: 'monokai',
                lineNumbers: true,
                autoCloseBrackets: true,
                matchBrackets: true,
                indentUnit: 4,
                tabSize: 4,
                indentWithTabs: false,
                foldGutter: true,
                gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                extraKeys: {
                    "Tab": function(cm) {
                        cm.replaceSelection("    ", "end");
                    },
                    "Ctrl-Space": "autocomplete"
                }
            });
            
            // Make the editor resize properly
            setTimeout(() => setupCodeEditor.refresh(), 10);
            
            // Event handlers for the modal buttons
            const closeBtn = modal.querySelector('.close-modal-btn');
            const cancelBtn = modal.querySelector('.cancel-btn');
            const applyBtn = modal.querySelector('.apply-btn');

            if (window.CodeHintSystem) {
                CodeHintSystem.init(setupCodeEditor);
            }

            setupCodeEditor.on("inputRead", function(editor, change) {
                if (window.CodeHintSystem) {
                    CodeHintSystem.updateHints();
                }
            });
            
            // Close modal function
            const closeModal = () => {
                document.body.removeChild(overlay);
            };
            
            // Close button
            closeBtn.addEventListener('click', closeModal);
            
            // Cancel button
            cancelBtn.addEventListener('click', closeModal);
            
            // Apply button
            applyBtn.addEventListener('click', () => {
                // Get code from editor and save to level
                level.setupCode = setupCodeEditor.getValue();
                alert('Setup code has been saved for this level.');
                closeModal();
            });
            
            // Allow closing with Escape key
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                }
            });
        },

        // Handle canvas clicks for object placement/erasing
        handleCanvasClick: function(e) {
            if (!selectedLevel) return;
            
            const level = levels.find(l => l.id === selectedLevel);
            if (!level) return;
            
            // Get mouse position relative to canvas
            const rect = levelEditorCanvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Convert to grid coordinates
            const gridX = Math.floor(mouseX / level.gridSize);
            const gridY = Math.floor(mouseY / level.gridSize);
            
            // Skip if we just placed in this cell (for mousemove)
            if (lastPlacedCell.x === gridX && lastPlacedCell.y === gridY) {
                return;
            }
            
            lastPlacedCell = { x: gridX, y: gridY };
            
            if (currentTool === 'place' && selectedPaletteObject) {
                // Find the object definition
                const objDef = gameObjects.find(o => o.id === selectedPaletteObject);
                if (objDef) {
                    // Check if there's already an object at this position
                    const existingObjectIndex = level.objects.findIndex(
                        obj => obj.gridX === gridX && obj.gridY === gridY
                    );
                    
                    // Remove existing object if there is one
                    if (existingObjectIndex !== -1) {
                        level.objects.splice(existingObjectIndex, 1);
                    }
                    
                    // Add debugging to verify name and ID
                    console.log(`Object being placed - ID: ${objDef.id}, Name: ${objDef.name}`);
                    
                    // Create a new instance with both name and ID references
                    const newInstance = {
                        id: this.generateId(),
                        objectId: objDef.id,
                        objectName: objDef.name, // Store exact name
                        gridX: gridX,
                        gridY: gridY,
                        x: gridX * level.gridSize,
                        y: gridY * level.gridSize,
                        properties: {}
                    };
                    
                    console.log(`Placing object: ${objDef.name} (ID: ${objDef.id}) at (${gridX},${gridY})`);
                    
                    level.objects.push(newInstance);
                }
            } else if (currentTool === 'erase') {
                // Remove any objects at this grid position
                const initialCount = level.objects.length;
                level.objects = level.objects.filter(
                    obj => !(obj.gridX === gridX && obj.gridY === gridY)
                );
                
                // Debug log to check if objects were actually removed
                console.log(`Erasing at (${gridX},${gridY}), removed ${initialCount - level.objects.length} objects`);
            }
            
            // Redraw the level
            this.drawLevelGrid();
        },
        
        // Render the list of levels
        renderLevelsList: function() {
            if (!elements.levelsList) return;
            
            elements.levelsList.innerHTML = '';
            
            if (levels.length === 0) {
                const emptyEl = document.createElement('div');
                emptyEl.className = 'empty-list-message';
                emptyEl.textContent = 'No levels created yet.';
                elements.levelsList.appendChild(emptyEl);
                return;
            }
            
            levels.forEach(level => {
                const levelEl = document.createElement('div');
                levelEl.className = 'level-item';
                levelEl.textContent = level.name;
                levelEl.setAttribute('data-id', level.id);
                
                if (selectedLevel === level.id) {
                    levelEl.classList.add('selected');
                }
                
                levelEl.addEventListener('click', () => {
                    this.selectLevel(level.id);
                });
                
                elements.levelsList.appendChild(levelEl);
            });
        },
        
        // Select a level
        selectLevel: function(id) {
            selectedLevel = id;
            
            // Update UI state
            document.querySelectorAll('.level-item').forEach(item => {
                item.classList.remove('selected');
            });
            
            const selectedItem = document.querySelector(`.level-item[data-id="${id}"]`);
            if (selectedItem) {
                selectedItem.classList.add('selected');
            }
            
            this.updateLevelDetailView();
        },
        
        // Update the level detail view
        updateLevelDetailView: function() {
            if (!selectedLevel) {
                // No level selected
                if (elements.levelName) elements.levelName.textContent = 'No Level Selected';
                if (elements.levelActions) elements.levelActions.style.display = 'none';
                if (elements.noLevelSelected) elements.noLevelSelected.style.display = 'flex';
                if (elements.levelEditArea) elements.levelEditArea.style.display = 'none';
                
                // Hide level detail header and tabs
                document.getElementById('levelDetailHeader').style.display = 'none';
                document.getElementById('levelEditorTabs').style.display = 'none';
                
                // Hide all tab panes
                document.querySelectorAll('.level-tab-pane').forEach(pane => {
                    pane.style.display = 'none';
                });
                
                return;
            }
            
            const level = levels.find(l => l.id === selectedLevel);
            if (!level) return;
            
            // Update UI for selected level
            if (elements.levelName) elements.levelName.textContent = level.name;
            if (elements.levelActions) elements.levelActions.style.display = 'flex';
            if (elements.noLevelSelected) elements.noLevelSelected.style.display = 'none';
            if (elements.levelEditArea) elements.levelEditArea.style.display = 'flex';
            
            // Show level detail header and tabs
            document.getElementById('levelDetailHeader').style.display = 'flex';
            document.getElementById('levelEditorTabs').style.display = 'flex';
            
            // Show the active tab pane
            const activeTabButton = document.querySelector('.level-tab-btn.active');
            if (activeTabButton) {
                const tabId = activeTabButton.getAttribute('data-level-tab');
                const activePane = document.getElementById(`${tabId}-tab`);
                if (activePane) {
                    document.querySelectorAll('.level-tab-pane').forEach(pane => {
                        pane.style.display = pane === activePane ? 'block' : 'none';
                    });
                }
            }
            
            // Update grid size selector
            if (elements.gridSizeSelect) {
                elements.gridSizeSelect.value = level.gridSize.toString();
                gridSize = level.gridSize;
            }
            
            // Update level settings inputs
            if (elements.levelWidthInput) {
                elements.levelWidthInput.value = level.width;
            }
            if (elements.levelHeightInput) {
                elements.levelHeightInput.value = level.height;
            }
            if (elements.viewWidthInput) {
                elements.viewWidthInput.value = level.viewWidth || level.width;
            }
            if (elements.viewHeightInput) {
                elements.viewHeightInput.value = level.viewHeight || level.height;
            }
            if (elements.bgColorInput) {
                elements.bgColorInput.value = level.backgroundColor || "#333333";
            }

            const setupCodeArea = document.getElementById('levelSetupCode');
            if (setupCodeArea) {
                setupCodeArea.value = level.setupCode || '';
            }
            
            // Set canvas size with a reasonable limit (30,000 pixels max dimension)
            if (levelEditorCanvas) {
                // Apply size limits to prevent browser crashes
                const maxDimension = 30000;
                const width = Math.min(level.width, maxDimension);
                const height = Math.min(level.height, maxDimension);
                
                levelEditorCanvas.width = width;
                levelEditorCanvas.height = height;
                
                // If the level is bigger than what we can render, show a warning
                if (level.width > maxDimension || level.height > maxDimension) {
                    console.warn(`Level dimensions (${level.width}x${level.height}) exceed the maximum canvas size. Displaying at ${width}x${height} instead.`);
                }
            }
            
            // Update object palette
            this.updateObjectPalette();
            
            // Draw the level grid and objects
            this.drawLevelGrid();
        },
        
        // Update the object palette with available game objects
        updateObjectPalette: function() {
            if (!elements.objectPalette) return;
            
            // Debug object structure to identify issues
            console.log("Raw game objects:", window.gameObjects);
            
            // Ensure we're using the most up-to-date game objects list
            if (window.gameObjects) {
                console.log("Original objects count:", window.gameObjects.length);
                console.log("Object properties:", window.gameObjects.map(obj => obj ? Object.keys(obj) : "null"));
                
                // Filter out invalid objects and fix undefined names
                gameObjects = window.gameObjects.filter(obj => {
                    if (!obj) {
                        console.warn("Found null/undefined game object");
                        return false;
                    }
                    
                    // Check if the object has a valid name
                    if (!obj.name || typeof obj.name !== 'string') {
                        console.warn("Object missing name or has invalid name:", obj);
                        // Assign a default name if missing
                        if (obj.id) {
                            obj.name = "Object_" + obj.id;
                            console.log("Assigned default name:", obj.name);
                            return true;
                        }
                        return false;
                    }
                    
                    return true;
                });
            }
        
            console.log("Filtered game objects:", gameObjects.length);
            console.log("Object names available:", gameObjects.map(obj => obj.name));
            
            // Rest of your existing code...
            elements.objectPalette.innerHTML = '';
            
            if (gameObjects.length === 0) {
                elements.objectPalette.innerHTML = '<div class="empty-palette">No valid objects available. Please create objects with names.</div>';
                return;
            }
            
            gameObjects.forEach(obj => {
                // Skip undefined or invalid objects - already filtered above
                const paletteItem = document.createElement('div');
                paletteItem.className = 'palette-item';
                
                if (selectedPaletteObject === obj.id) {
                    paletteItem.classList.add('selected');
                }
                
                paletteItem.textContent = obj.name;
                paletteItem.setAttribute('data-id', obj.id);
                
                paletteItem.addEventListener('click', () => {
                    // Select this object for placement
                    selectedPaletteObject = obj.id;
                    
                    // Update UI
                    document.querySelectorAll('.palette-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    paletteItem.classList.add('selected');
                    
                    // Switch to place tool
                    if (elements.placeObjectBtn && elements.eraseBtn) {
                        currentTool = 'place';
                        elements.placeObjectBtn.classList.add('active');
                        elements.eraseBtn.classList.remove('active');
                    }
                });
                
                elements.objectPalette.appendChild(paletteItem);
            });
        },
        
        // Draw the level grid and objects
        drawLevelGrid: function() {
            if (!levelEditorCanvas || !levelEditorCtx || !selectedLevel) return;
            
            const level = levels.find(l => l.id === selectedLevel);
            if (!level) return;
            
            // Update canvas size first
            levelEditorCanvas.width = level.width;
            levelEditorCanvas.height = level.height;
            
            // Make sure the grid container properly holds the canvas size
            const gridContainer = levelEditorCanvas.parentElement;
            if (gridContainer) {
                gridContainer.style.width = level.width + 'px';
                gridContainer.style.height = level.height + 'px';
                gridContainer.style.position = 'relative';
            }
            
            // Clear canvas and fill with background color
            levelEditorCtx.clearRect(0, 0, levelEditorCanvas.width, levelEditorCanvas.height);
            levelEditorCtx.fillStyle = level.backgroundColor || "#333333";
            levelEditorCtx.fillRect(0, 0, levelEditorCanvas.width, levelEditorCanvas.height);

            if (level.backgroundImage) {
                // First check dedicated backgrounds
                let bgSprite = null;
                
                if (window.resources && window.resources.backgrounds) {
                    bgSprite = window.resources.backgrounds.find(sprite => sprite.id === level.backgroundImage);
                }
                
                // Fall back to sprites if not found in backgrounds
                if (!bgSprite && window.resources && window.resources.sprites) {
                    bgSprite = window.resources.sprites.find(sprite => sprite.id === level.backgroundImage);
                }
                
                if (bgSprite && bgSprite.image && bgSprite.image.complete) {
                    if (level.backgroundImageMode === "stretch") {
                        // Stretch mode
                        levelEditorCtx.drawImage(
                            bgSprite.image, 
                            0, 0, 
                            levelEditorCanvas.width, levelEditorCanvas.height
                        );
                    } else {
                        // Tile mode
                        const imgWidth = bgSprite.width || bgSprite.image.width;
                        const imgHeight = bgSprite.height || bgSprite.image.height;
                        
                        for (let y = 0; y < levelEditorCanvas.height; y += imgHeight) {
                            for (let x = 0; x < levelEditorCanvas.width; x += imgWidth) {
                                levelEditorCtx.drawImage(bgSprite.image, x, y);
                            }
                        }
                    }
                }
            }
            
            // Draw grid
            levelEditorCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            levelEditorCtx.lineWidth = 1;
            
            // Vertical grid lines - only draw visible portion
            for (let x = 0; x <= level.width; x += level.gridSize) {
                levelEditorCtx.beginPath();
                levelEditorCtx.moveTo(x, 0);
                levelEditorCtx.lineTo(x, level.height);
                levelEditorCtx.stroke();
            }
            
            // Horizontal grid lines - only draw visible portion
            for (let y = 0; y <= level.height; y += level.gridSize) {
                levelEditorCtx.beginPath();
                levelEditorCtx.moveTo(0, y);
                levelEditorCtx.lineTo(level.width, y);
                levelEditorCtx.stroke();
            }
            
            // Draw objects
            level.objects.forEach(obj => {
                const gameObj = gameObjects.find(o => o.id === obj.objectId);
                if (!gameObj) {
                    console.warn(`Object with ID ${obj.objectId} not found for instance at (${obj.x},${obj.y})`);
                    return;
                }
                
                const x = obj.x;
                const y = obj.y;
                const size = level.gridSize;
                
                // Create a temporary context for drawing the object
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = size;
                tempCanvas.height = size;
                const tempCtx = tempCanvas.getContext('2d');
                
                // Try to use the object's draw event if available
                let customDrawn = false;
                let originalFunctions = {}; // Move declaration here to fix the scope issue
        
                /*if (gameObj.events && gameObj.events.draw && gameObj.events.draw.trim()) {
                    try {
                        // Create a self object to use as the 'this' context
                        const self = {
                            x: 0,
                            y: 0,
                            width: size,
                            height: size,
                            color: "#0000ff", // Default color
                            name: gameObj.name,
                            // Add more common properties that might be used in draw functions
                            bbox_left: 0,
                            bbox_top: 0,
                            bbox_right: size,
                            bbox_bottom: size
                        };
                        
                        // Process the awake event if available to initialize properties
                        if (gameObj.events.awake && gameObj.events.awake.trim()) {
                            try {
                                const awakeFunc = new Function(`
                                    // Add default room properties to prevent errors
                                    const room_width = ${size};
                                    const room_height = ${size};
                                    ${gameObj.events.awake.replace(/\\/g, '\\\\')}
                                `);
                                
                                // Execute awake with self as 'this'
                                awakeFunc.call(self);
                            } catch(e) {
                                console.warn(`Error processing awake event for ${gameObj.name}:`, e);
                            }
                        }
                        
                        // Add any custom properties from the instance
                        if (obj.properties) {
                            Object.assign(self, obj.properties);
                        }
                        
                        // Set up the drawing context
                        tempCtx.clearRect(0, 0, size, size);
                        tempCtx.textAlign = "center";
                        tempCtx.textBaseline = "middle";
                        tempCtx.font = "10px Arial";
                        
                        // Create helper functions in an object
                        const helpers = {
                            draw_set_color: function(color) { 
                                if (!tempCtx) {
                                    console.warn("Drawing context is null");
                                    return;
                                }
                                
                                try {
                                    // Handle different color formats
                                    if (typeof color === 'string') {
                                        tempCtx.fillStyle = color;
                                        tempCtx.strokeStyle = color;
                                    } else if (typeof color === 'object' && color !== null) {
                                        // For color objects
                                        tempCtx.fillStyle = "#FFFFFF";
                                        tempCtx.strokeStyle = "#FFFFFF";
                                    } else if (typeof color === 'number') {
                                        // For numeric color values (hex numbers)
                                        const hexString = color.toString(16).padStart(6, '0');
                                        tempCtx.fillStyle = `#${hexString}`;
                                        tempCtx.strokeStyle = `#${hexString}`;
                                    } else {
                                        // Default fallback
                                        tempCtx.fillStyle = "#FFFFFF";
                                        tempCtx.strokeStyle = "#FFFFFF";
                                    }
                                } catch (e) {
                                    console.warn("Invalid color value in level editor:", color, e);
                                    tempCtx.fillStyle = "#FFFFFF"; 
                                    tempCtx.strokeStyle = "#FFFFFF";
                                }
                            },
                            
                            draw_rectangle: function(x1, y1, x2, y2, outline) {
                                if (!tempCtx) {
                                    console.warn("Drawing context is null");
                                    return;
                                }
                                
                                try {
                                    if (outline) {
                                        tempCtx.beginPath();
                                        tempCtx.rect(x1, y1, x2-x1, y2-y1);
                                        tempCtx.stroke();
                                    } else {
                                        tempCtx.fillRect(x1, y1, x2-x1, y2-y1);
                                    }
                                } catch (e) {
                                    console.warn("Error drawing rectangle:", e);
                                }
                            },
                            
                            draw_text: function(x1, y1, text) {
                                if (!tempCtx) {
                                    console.warn("Drawing context is null");
                                    return;
                                }
                                
                                try {
                                    if (text !== undefined) {
                                        tempCtx.fillText(String(text), x1, y1);
                                    }
                                } catch (e) {
                                    console.warn("Error drawing text:", e);
                                }
                            },
                            
                            draw_set_font: function(size, family) {
                                if (!tempCtx) {
                                    console.warn("Drawing context is null");
                                    return;
                                }
                                
                                try {
                                    tempCtx.font = `${size}px ${family || 'Arial'}`;
                                } catch (e) {
                                    console.warn("Error setting font:", e);
                                    tempCtx.font = "10px Arial";
                                }
                            },
                            
                            draw_set_alpha: function(alpha) {
                                if (!tempCtx) {
                                    console.warn("Drawing context is null");
                                    return;
                                }
                                
                                try {
                                    tempCtx.globalAlpha = alpha !== undefined ? alpha : 1;
                                } catch (e) {
                                    console.warn("Error setting alpha:", e);
                                    tempCtx.globalAlpha = 1;
                                }
                            },
                            
                            // Color constants
                            c_white: "#ffffff",
                            c_black: "#000000",
                            c_red: "#ff0000",
                            c_blue: "#0000ff",
                            c_green: "#00ff00",
                            c_yellow: "#ffff00",
                            c_gray: "#808080",
                            c_ltgray: "#c0c0c0",
                            c_dkgray: "#404040"
                        };

                        // Create a proxy to merge the helper functions and self
                        const proxyObject = new Proxy({}, {
                            get: function(target, prop) {
                                // First check self
                                if (prop in self) {
                                    return self[prop];
                                }
                                // Then check helpers
                                if (prop in helpers) {
                                    return helpers[prop];
                                }
                                // For color constants that might be missing
                                if (prop.startsWith('c_')) {
                                    console.warn(`Color constant ${prop} not found, using white instead`);
                                    return "#FFFFFF";
                                }
                                console.warn(`Property ${prop} not found in drawing context`);
                                return undefined;
                            },
                            set: function(target, prop, value) {
                                // Set properties on self
                                self[prop] = value;
                                return true;
                            }
                        });

                        // Override window-level drawing functions in the level editor context to prevent conflicts
                        originalFunctions = {};
                        ['draw_set_color', 'draw_rectangle', 'draw_text', 'draw_set_font', 'draw_set_alpha'].forEach(funcName => {
                            if (window[funcName]) originalFunctions[funcName] = window[funcName];
                            window[funcName] = helpers[funcName];
                        });
                        
                        // Create and execute the draw function
                        try {
                            const drawFunc = new Function(`
                                ${gameObj.events.draw.replace(/\\/g, '\\\\')}
                            `);
                            
                            // Execute the draw function with the proxy as 'this'
                            drawFunc.call(proxyObject);
                            customDrawn = true;
                        } catch (err) {
                            console.warn(`Error handling draw event for ${gameObj.name}:`, err);
                            customDrawn = false;
                        }
                    } catch (err) {
                        console.warn(`Error in draw setup for ${gameObj.name}:`, err);
                        customDrawn = false;
                    }
                }*/
                
                if (!customDrawn) {
                    // Draw default representation - make it more visible and recognizable
                    tempCtx.fillStyle = 'rgba(50, 120, 200, 0.8)';  // Brighter blue
                    tempCtx.fillRect(0, 0, size, size);
                    
                    // Add a border
                    tempCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                    tempCtx.lineWidth = 2;
                    tempCtx.strokeRect(1, 1, size-2, size-2);
                    
                    // Draw object name
                    tempCtx.fillStyle = 'white';
                    tempCtx.font = '10px Arial';
                    tempCtx.textAlign = 'center';
                    tempCtx.textBaseline = 'middle';
                    
                    // Truncate name if too long
                    let displayName = gameObj.name;
                    if (displayName.length > 10) {
                        displayName = displayName.substring(0, 8) + '...';
                    }
                    
                    tempCtx.fillText(displayName, size / 2, size / 2);
                }
                
                // Draw the result to the main canvas
                levelEditorCtx.drawImage(tempCanvas, x, y);

                // Debug outline to confirm proper placement
                levelEditorCtx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
                levelEditorCtx.strokeRect(x, y, size, size);

                // Restore original window functions
                Object.keys(originalFunctions).forEach(funcName => {
                    window[funcName] = originalFunctions[funcName];
                });
                
            });
        },

        // Get all levels
        getLevels: function() {
            return levels;
        },
        
        // Set levels (for loading from file)
        setLevels: function(newLevels) {
            levels = newLevels;
            selectedLevel = null;
            this.renderLevelsList();
            this.updateLevelDetailView();
        },

        syncResources: function() {
            if (window.resources) {
                console.log("Syncing resources with level editor");
                
                // If selected level exists, update background selection
                if (selectedLevel) {
                    const level = levels.find(l => l.id === selectedLevel);
                    if (level && elements.levelBackgroundSelect) {
                        // Clear current options
                        elements.levelBackgroundSelect.innerHTML = '<option value="">None</option>';
                        
                        // Add backgrounds first
                        if (window.resources.backgrounds && window.resources.backgrounds.length > 0) {
                            window.resources.backgrounds.forEach(bg => {
                                const option = document.createElement('option');
                                option.value = bg.id;
                                option.textContent = bg.name;
                                if (level.backgroundImage === bg.id) {
                                    option.selected = true;
                                    if (document.getElementById('backgroundImageOptions')) {
                                        document.getElementById('backgroundImageOptions').style.display = 'block';
                                    }
                                }
                                elements.levelBackgroundSelect.appendChild(option);
                            });
                        }
                        
                        // Add sprites as fallback
                        if (window.resources.sprites && window.resources.sprites.length > 0) {
                            window.resources.sprites.forEach(sprite => {
                                const option = document.createElement('option');
                                option.value = sprite.id;
                                option.textContent = sprite.name;
                                if (level.backgroundImage === sprite.id) {
                                    option.selected = true;
                                    if (document.getElementById('backgroundImageOptions')) {
                                        document.getElementById('backgroundImageOptions').style.display = 'block';
                                    }
                                }
                                elements.levelBackgroundSelect.appendChild(option);
                            });
                        }
                        
                        console.log("Background selection updated");
                    }
                    
                    // Redraw the level to update any background changes
                    this.drawLevelGrid();
                }
            }
        },

        updateLevelDetailView: function() {
            if (!selectedLevel) {
                // No level selected
                if (elements.levelName) elements.levelName.textContent = 'No Level Selected';
                if (elements.levelActions) elements.levelActions.style.display = 'none';
                if (elements.noLevelSelected) elements.noLevelSelected.style.display = 'flex';
                if (elements.levelEditArea) elements.levelEditArea.style.display = 'none';
                
                // Hide level detail header and tabs
                document.getElementById('levelDetailHeader').style.display = 'none';
                document.getElementById('levelEditorTabs').style.display = 'none';
                
                // Hide all tab panes
                document.querySelectorAll('.level-tab-pane').forEach(pane => {
                    pane.style.display = 'none';
                });
                
                return;
            }
            
            const level = levels.find(l => l.id === selectedLevel);
            if (!level) return;
            
            // Update UI for selected level
            if (elements.levelName) elements.levelName.textContent = level.name;
            if (elements.levelActions) elements.levelActions.style.display = 'flex';
            if (elements.noLevelSelected) elements.noLevelSelected.style.display = 'none';
            if (elements.levelEditArea) elements.levelEditArea.style.display = 'flex';
            
            // Show level detail header and tabs
            document.getElementById('levelDetailHeader').style.display = 'flex';
            document.getElementById('levelEditorTabs').style.display = 'flex';
            
            // Show the active tab pane
            const activeTabButton = document.querySelector('.level-tab-btn.active');
            if (activeTabButton) {
                const tabId = activeTabButton.getAttribute('data-level-tab');
                const activePane = document.getElementById(`${tabId}-tab`);
                if (activePane) {
                    document.querySelectorAll('.level-tab-pane').forEach(pane => {
                        pane.classList.remove('active');
                    });
                    activePane.classList.add('active');
                }
            }
            
            // Update grid size selector
            if (elements.gridSizeSelect) {
                elements.gridSizeSelect.value = level.gridSize.toString();
                gridSize = level.gridSize;
            }
            
            // Update level settings inputs
            if (elements.levelWidthInput) {
                elements.levelWidthInput.value = level.width;
            }
            if (elements.levelHeightInput) {
                elements.levelHeightInput.value = level.height;
            }
            if (elements.viewWidthInput) {
                elements.viewWidthInput.value = level.viewWidth || level.width;
            }
            if (elements.viewHeightInput) {
                elements.viewHeightInput.value = level.viewHeight || level.height;
            }
            if (elements.bgColorInput) {
                elements.bgColorInput.value = level.backgroundColor || "#333333";
            }
            
            if (elements.levelBackgroundSelect) {
                console.log("Updating background selection dropdown");
                console.log("Available resources:", window.resources);
                
                // Populate background select with available sprites
                elements.levelBackgroundSelect.innerHTML = '<option value="">None</option>';
                
                // Debug the resources available
                if (!window.resources) {
                    console.warn("No resources found in window.resources");
                }
                
                // Add backgrounds first if available
                if (window.resources && window.resources.backgrounds && window.resources.backgrounds.length > 0) {
                    console.log("Found backgrounds:", window.resources.backgrounds.length);
                    window.resources.backgrounds.forEach(sprite => {
                        console.log("Adding background option:", sprite.name, sprite.id);
                        const option = document.createElement('option');
                        option.value = sprite.id;
                        option.textContent = sprite.name;
                        if (level.backgroundImage === sprite.id) {
                            option.selected = true;
                            document.getElementById('backgroundImageOptions').style.display = 'block';
                        }
                        elements.levelBackgroundSelect.appendChild(option);
                    });
                }
                
                // Add sprites as fallback
                if (window.resources && window.resources.sprites && window.resources.sprites.length > 0) {
                    console.log("Found sprites:", window.resources.sprites.length);
                    window.resources.sprites.forEach(sprite => {
                        console.log("Adding sprite option:", sprite.name, sprite.id);
                        const option = document.createElement('option');
                        option.value = sprite.id;
                        option.textContent = sprite.name;
                        if (level.backgroundImage === sprite.id) {
                            option.selected = true;
                            document.getElementById('backgroundImageOptions').style.display = 'block';
                        }
                        elements.levelBackgroundSelect.appendChild(option);
                    });
                }
                
                // Set background mode radios
                const modeRadios = document.querySelectorAll('input[name="bgMode"]');
                modeRadios.forEach(radio => {
                    if (radio.value === level.backgroundImageMode) {
                        radio.checked = true;
                    }
                });
            }

            // Set canvas size
            if (levelEditorCanvas) {
                const maxDimension = 30000;
                const width = Math.min(level.width, maxDimension);
                const height = Math.min(level.height, maxDimension);
                
                levelEditorCanvas.width = width;
                levelEditorCanvas.height = height;
                
                // Update the grid container to match canvas size
                const gridContainer = levelEditorCanvas.parentElement;
                if (gridContainer) {
                    gridContainer.style.width = width + 'px';
                    gridContainer.style.height = height + 'px';
                    gridContainer.style.position = 'relative';
                }
                
                // If the level is bigger than what we can render, show a warning
                if (level.width > maxDimension || level.height > maxDimension) {
                    console.warn(`Level dimensions (${level.width}x${level.height}) exceed the maximum canvas size. Displaying at ${width}x${height} instead.`);
                }
            }
            
            // Update object palette
            this.updateObjectPalette();
            
            // Draw the level grid and objects
            this.drawLevelGrid();
        },

        removeObjectsFromLevels: function(objectIds) {
            if (!Array.isArray(objectIds) || objectIds.length === 0) return;
            
            levels.forEach(level => {
                // Filter out objects with matching objectIds
                level.objects = level.objects.filter(obj => !objectIds.includes(obj.objectId));
            });
            
            // Redraw the current level if needed
            if (selectedLevel) {
                this.drawLevelGrid();
            }
        },
        
        generateCode: function() {
            if (levels.length === 0) return null;
            
            let levelCode = '';
        
            // Define the level system
            levelCode += `// Level system initialization\n`;
            levelCode += `var levelSystem = {\n`;
            levelCode += `  currentLevel: null,\n`;
            levelCode += `  levels: {},\n\n`;
            
            // Simplified loadLevel method
            levelCode += `  loadLevel: function(levelName) {\n`;
            levelCode += `    var level = this.levels[levelName];\n`;
            levelCode += `    if (!level) {\n`;
            levelCode += `      console.error("Level not found:", levelName);\n`;
            levelCode += `      return;\n`;
            levelCode += `    }\n\n`;
            levelCode += `    console.log("Loading level:", levelName);\n`;
            levelCode += `    this.currentLevel = levelName;\n\n`;
            
            // Clear existing instances except the control object
            levelCode += `    // Clear existing instances\n`;
            levelCode += `    if (window.engine && window.engine.gameObjects) {\n`;
            levelCode += `      var controlObj = null;\n`;
            levelCode += `      if (window.engine.control) {\n`;
            levelCode += `        // Find the control object so we don't clear it\n`;
            levelCode += `        for (var i = 0; i < window.engine.gameObjects.length; i++) {\n`;
            levelCode += `          var obj = window.engine.gameObjects[i];\n`;
            levelCode += `          if (obj && obj.instances && obj.instances.some(inst => inst === window.engine.control)) {\n`;
            levelCode += `            controlObj = obj;\n`;
            levelCode += `            break;\n`;
            levelCode += `          }\n`;
            levelCode += `        }\n`;
            levelCode += `      }\n\n`;
            
            levelCode += `      // Clear instances for all non-control objects\n`;
            levelCode += `      for (var k = 0; k < window.engine.gameObjects.length; k++) {\n`;
            levelCode += `        var gameObj = window.engine.gameObjects[k];\n`;
            levelCode += `        if (gameObj && gameObj !== controlObj && gameObj.instances) {\n`;
            levelCode += `          gameObj.instances = [];\n`;
            levelCode += `        }\n`;
            levelCode += `      }\n`;
            levelCode += `    }\n\n`;
            
            // Set room and view properties
            levelCode += `    // Set room properties\n`;
            levelCode += `    if (window.engine) {\n`;
            levelCode += `      window.engine.room_width = level.width;\n`;
            levelCode += `      window.engine.room_height = level.height;\n`;
            levelCode += `      window.engine.view_wview = level.viewWidth || level.width;\n`;
            levelCode += `      window.engine.view_hview = level.viewHeight || level.height;\n`;
            levelCode += `      window.engine.background_color = level.backgroundColor;\n`;
        
            // Set background properties
            levelCode += `      // Set background properties\n`;
            levelCode += `      window.engine.current_background = level.backgroundImage;\n`;
            levelCode += `      window.engine.background_mode = level.backgroundImageMode || "stretch";\n`;
            levelCode += `      window.engine.background_speed = level.backgroundImageSpeed || 0;\n`;
            
            // Resize canvas to match view dimensions
            levelCode += `      // Resize canvas to match view dimensions\n`;
            levelCode += `      var canvas = document.getElementById('canvasArea');\n`;
            levelCode += `      if (canvas) {\n`;
            levelCode += `        canvas.width = level.viewWidth || level.width;\n`;
            levelCode += `        canvas.height = level.viewHeight || level.height;\n`;
            levelCode += `      }\n`;
            levelCode += `    }\n\n`;
            
            // Create level objects
            levelCode += `    // Create level objects\n`;
            levelCode += `    level.load();\n`;
            levelCode += `  }\n`;
            levelCode += `};\n\n`;
            
            // Define each level
            levels.forEach(level => {
                levelCode += `// Level: ${level.name}\n`;
                levelCode += `levelSystem.levels["${level.name}"] = {\n`;
                levelCode += `  width: ${level.width},\n`;
                levelCode += `  height: ${level.height},\n`;
                levelCode += `  viewWidth: ${level.viewWidth || level.width},\n`;
                levelCode += `  viewHeight: ${level.viewHeight || level.height},\n`;
                levelCode += `  gridSize: ${level.gridSize},\n`;
                levelCode += `  backgroundColor: "${level.backgroundColor || '#333333'}",\n`;
                levelCode += `  backgroundImage: ${level.backgroundImage ? `"${level.backgroundImage}"` : 'null'},\n`;
                levelCode += `  backgroundImageMode: "${level.backgroundImageMode || 'stretch'}",\n`;
                levelCode += `  backgroundImageSpeed: ${level.backgroundImageSpeed || 0},\n`;
                
                // Create objects for this level - now with priority handling
                levelCode += `  load: function() {\n`;
                levelCode += `    console.log("Creating objects for level: ${level.name}");\n\n`;
        
                // Add setup code if it exists
                if (level.setupCode && level.setupCode.trim()) {
                    levelCode += `    // Execute level setup code\n`;
                    levelCode += `    try {\n`;
                    levelCode += `      (function() {\n`;
                    levelCode += `        ${level.setupCode.trim()}\n`;
                    levelCode += `      })();\n`;
                    levelCode += `      console.log("Level setup code executed.");\n`;
                    levelCode += `    } catch (err) {\n`;
                    levelCode += `      console.error("Error in level setup code:", err);\n`;
                    levelCode += `    }\n\n`;
                }
        
                levelCode += `    // Get instance_create function\n`;
                levelCode += `    var instance_create = window.instance_create || (window.engine && window.engine.instance_create);\n`;
                levelCode += `    if (!instance_create) {\n`;
                levelCode += `      console.error("No instance_create function found!");\n`;
                levelCode += `      return;\n`;
                levelCode += `    }\n\n`;
                
                if (level.objects.length > 0) {
                    // First, group objects by priority and name
                    levelCode += `    // Create level objects - priority objects first\n`;
                    
                    // Get all unique object names in this level
                    const objectNames = [...new Set(level.objects.map(obj => obj.objectName))];
                    
                    // Find which ones are priority objects
                    levelCode += `    // Process priority objects first\n`;
                    
                    // Group objects by object name
                    const objectGroups = {};
                    level.objects.forEach(obj => {
                        if (!objectGroups[obj.objectName]) {
                            objectGroups[obj.objectName] = {
                                instances: [],
                                isPriority: false
                            };
                        }
                        objectGroups[obj.objectName].instances.push(obj);
                        
                        // Check if this object is a priority object in the gameObjects array
                        const gameObj = gameObjects.find(go => go.id === obj.objectId);
                        if (gameObj && gameObj.isPriority) {
                            objectGroups[obj.objectName].isPriority = true;
                        }
                    });
                    
                    // Process priority objects first
                    Object.keys(objectGroups).forEach(objectName => {
                        const group = objectGroups[objectName];
                        
                        if (group.isPriority) {
                            levelCode += `    // Create priority instances of ${objectName}\n`;
                            levelCode += `    if (typeof ${objectName} !== 'undefined') {\n`;
                            levelCode += `      console.log("Creating ${group.instances.length} priority instance(s) of ${objectName}");\n`;
                            
                            // Create each instance
                            group.instances.forEach(obj => {
                                levelCode += `      try {\n`;
                                levelCode += `        var instance = instance_create(${obj.x}, ${obj.y}, ${objectName});\n`;
                                
                                // Apply custom properties if any
                                if (obj.properties && Object.keys(obj.properties).length > 0) {
                                    levelCode += `        // Apply custom properties\n`;
                                    Object.keys(obj.properties).forEach(prop => {
                                        const val = JSON.stringify(obj.properties[prop]);
                                        levelCode += `        instance.${prop} = ${val};\n`;
                                    });
                                }
                                
                                levelCode += `      } catch (err) {\n`;
                                levelCode += `        console.error("Error creating ${objectName} at position (${obj.x}, ${obj.y}):", err);\n`;
                                levelCode += `      }\n`;
                            });
                            
                            levelCode += `    } else {\n`;
                            levelCode += `      console.error("Priority object '${objectName}' not found");\n`;
                            levelCode += `    }\n\n`;
                        }
                    });
                    
                    // Then process non-priority objects
                    levelCode += `    // Now create non-priority objects\n`;
                    Object.keys(objectGroups).forEach(objectName => {
                        const group = objectGroups[objectName];
                        
                        if (!group.isPriority) {
                            levelCode += `    // Create instances of ${objectName}\n`;
                            levelCode += `    if (typeof ${objectName} !== 'undefined') {\n`;
                            levelCode += `      console.log("Creating ${group.instances.length} instance(s) of ${objectName}");\n`;
                            
                            // Create each instance
                            group.instances.forEach(obj => {
                                levelCode += `      try {\n`;
                                levelCode += `        var instance = instance_create(${obj.x}, ${obj.y}, ${objectName});\n`;
                                
                                // Apply custom properties if any
                                if (obj.properties && Object.keys(obj.properties).length > 0) {
                                    levelCode += `        // Apply custom properties\n`;
                                    Object.keys(obj.properties).forEach(prop => {
                                        const val = JSON.stringify(obj.properties[prop]);
                                        levelCode += `        instance.${prop} = ${val};\n`;
                                    });
                                }
                                
                                levelCode += `      } catch (err) {\n`;
                                levelCode += `        console.error("Error creating ${objectName} at position (${obj.x}, ${obj.y}):", err);\n`;
                                levelCode += `      }\n`;
                            });
                            
                            levelCode += `    } else {\n`;
                            levelCode += `      console.error("Object '${objectName}' not found");\n`;
                            levelCode += `    }\n\n`;
                        }
                    });
                } else {
                    levelCode += `    // No objects in this level\n`;
                }
                
                levelCode += `  }\n`;
                levelCode += `};\n\n`;
            });
            
            // Load the first level
            if (levels.length > 0) {
                levelCode += `// Initialize the level system\n`;
                levelCode += `setTimeout(function() {\n`;
                levelCode += `  console.log("Starting level system...");\n`;
                levelCode += `  levelSystem.loadLevel("${levels[0].name}");\n`;
                levelCode += `}, 500);\n`;
            }
            
            return levelCode;
        }
    };
})();

// Export the module
window.LevelEditor = LevelEditor;
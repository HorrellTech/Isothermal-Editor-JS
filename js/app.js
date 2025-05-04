document.addEventListener('DOMContentLoaded', () => {
    initializeGameConsole();
    
    // Initialize the game engine with error handling
    let game;
    try {
        if (typeof createGameEngine === 'undefined') {
            console.error("createGameEngine is not defined. Check that gameEngine.js is loaded correctly.");
            alert("Error: Could not initialize game engine. See console for details.");
            return;
        }
        game = createGameEngine('gameCanvas', 'textbox');
        // Add this line to make the engine globally accessible
        window.engine = game;
    } catch (error) {
        console.error("Error initializing game engine:", error);
        alert("Error initializing the game engine: " + error.message);
        return;
    }

    // Create a module tracking system
    window.moduleRegistry = {
        expected: ['create_physics_module', 'create_platformer_module'],
        loaded: {},
        waitForModules: function(callback, timeout = 5000) {
            const startTime = Date.now();
            const checkModules = () => {
                // Check if all expected modules are loaded
                const allLoaded = this.expected.every(modName => 
                    this.loaded[modName] || 
                    (typeof window[modName] === 'function') ||
                    (window.engine && typeof window.engine[modName] === 'function')
                );
                
                if (allLoaded) {
                    console.log("All modules loaded successfully!");
                    // Ensure all modules are attached to the engine
                    this.expected.forEach(modName => {
                        if (!window.engine[modName] && window[modName]) {
                            window.engine[modName] = window[modName];
                            console.log(`Attached ${modName} to engine from window`);
                        }
                    });
                    callback();
                    return;
                }
                
                // Check timeout
                if (Date.now() - startTime > timeout) {
                    console.error("Module loading timed out!");
                    console.error("Missing modules:", this.expected.filter(modName => 
                        !this.loaded[modName] && 
                        !(typeof window[modName] === 'function') &&
                        !(window.engine && typeof window.engine[modName] === 'function')
                    ));
                    callback(new Error("Module loading timed out"));
                    return;
                }
                
                // Try again in a bit
                setTimeout(checkModules, 50);
            };
            
            checkModules();
        }
    };

    // Create a module registration helper
    window.registerModule = function(name, moduleCreator) {
        console.log(`Registering module: ${name}`);
        
        // Track that this module is loaded
        window.moduleRegistry.loaded[name] = true;
        
        if (window.engine) {
            window.engine[name] = moduleCreator;
            console.log(`Module ${name} attached to engine`);
        } else {
            console.warn(`Engine not available when registering ${name}. Will attach later.`);
            window[name] = moduleCreator;
        }
    };

    // Initialize modules
    initializeModules();
    
    // Game objects state
    let gameObjects = [];
    let folders = [];
    let selectedObject = null;
    let selectedEvent = null;
    
    // Initialize CodeMirror editor with autocomplete
    const editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
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

    // Setup custom hint function for CodeMirror using our engineKeywords
    CodeMirror.registerHelper("hint", "javascript", function(editor) {
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        const start = cursor.ch;
        
        let startPos = start;
        while (startPos > 0 && /[\w\.]/.test(line.charAt(startPos - 1))) startPos--;
        
        const token = line.slice(startPos, start);
        
        // Get the keyword completions
        let list = window.getKeywordCompletions ? window.getKeywordCompletions() : [];
        
        // Filter the list based on the current token
        if (token) {
            list = list.filter(item => item.text.startsWith(token));
        }
        
        return {
            list: list.length ? list : [],
            from: CodeMirror.Pos(cursor.line, startPos),
            to: CodeMirror.Pos(cursor.line, start)
        };
    });

    // Initialize code hint system with improved timing and error handling
    if (window.CodeHintSystem) {
        const initCodeHints = function(maxAttempts = 10) {
            let attempts = 0;
            
            const tryInit = function() {
                attempts++;
                console.log(`Initializing code hints (attempt ${attempts})`);
                
                if (!editor) {
                    if (attempts < maxAttempts) {
                        console.warn("CodeMirror editor not ready yet, retrying...");
                        setTimeout(tryInit, 200);
                    } else {
                        console.error("Failed to initialize code hints: Editor not available");
                    }
                    return;
                }
                
                try {
                    // Initialize the code hint system and store the returned API
                    const hintSystem = window.CodeHintSystem.init(editor);
                    
                    // Store the API consistently at the window level
                    window.codeHintSystem = hintSystem;
                    
                    if (window.codeHintSystem) {
                        console.log("Code hint system initialized successfully");
                        
                        // Apply proper sizing to code mirror and hint box
                        limitCodeMirrorHeight();
                        
                        // Force initial refresh of hints
                        if (typeof window.codeHintSystem.refresh === 'function') {
                            window.codeHintSystem.refresh();
                        }
                        
                        // Ensure the hint panel is properly sized
                        const hintPanel = document.querySelector('.CodeMirror-hints');
                        if (hintPanel) {
                            hintPanel.style.maxHeight = '200px';
                            hintPanel.style.overflowY = 'auto';
                        }
                    } else {
                        console.error("Failed to initialize code hints: init returned null");
                    }
                } catch (err) {
                    console.error("Error initializing code hints:", err);
                }
            };
            
            // Start initialization
            setTimeout(tryInit, 200);
        };
        
        // Call the initialization function
        initCodeHints();
    } else {
        console.error("CodeHintSystem not found! Make sure codeHintSystem.js is loaded correctly.");
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.getAttribute('data-tab') === 'objects' || btn.getAttribute('data-tab') === 'scripts') {
                // Refresh code hints when switching to an editor tab
                if (window.codeHintSystem && typeof window.codeHintSystem.refresh === 'function') {
                    window.codeHintSystem.refresh();
                }
                
                // Also ensure proper sizing
                setTimeout(limitCodeMirrorHeight, 10);
            }
        });
    });

    function limitCodeMirrorHeight() {
        const cmElements = document.querySelectorAll('.CodeMirror');
        cmElements.forEach(cm => {
            cm.style.maxHeight = '500px'; // Adjust this value as needed
            cm.style.height = '500px';    // Set an explicit height instead of 'auto'
            cm.style.overflow = 'auto';   // Ensure overflow is set to auto
            
            // Make sure CodeMirror recalculates its layout
            const cmInstance = cm.CodeMirror;
            if (cmInstance && typeof cmInstance.refresh === 'function') {
                cmInstance.refresh();
            }
        });
        
        // Also resize hint panels if they exist
        const hintPanels = document.querySelectorAll('.CodeMirror-hints');
        hintPanels.forEach(panel => {
            panel.style.maxHeight = '200px';
            panel.style.overflowY = 'auto';
        });
    }

    // Fix event listeners for updating hints while typing
    editor.on("inputRead", function(editor, change) {
        if (window.codeHintSystem && typeof window.codeHintSystem.refresh === 'function') {
            window.codeHintSystem.refresh();
        }
    });

    editor.on("keyup", function(editor, event) {
        if (window.codeHintSystem && typeof window.codeHintSystem.refresh === 'function') {
            // Immediately update hints when pressing keys
            window.codeHintSystem.refresh();
        }
    });
    
    // Also respond to cursor movement
    editor.on("cursorActivity", function(editor) {
        if (window.codeHintSystem && typeof window.codeHintSystem.refresh === 'function') {
            window.codeHintSystem.refresh();
        }
    });

    setTimeout(() => {
        // Fix positioning of CodeMirror container
        const cmContainer = editor.getWrapperElement().parentNode;
        if (cmContainer) {
            cmContainer.style.position = 'relative';
            cmContainer.style.height = '500px'; // Explicit height
            cmContainer.style.overflow = 'hidden'; // Let CodeMirror handle scrolling
        }
        
        // Force an update of the hint panel
        if (window.codeHintSystem && typeof window.codeHintSystem.refresh === 'function') {
            window.codeHintSystem.refresh();
        }
        
        // Ensure proper sizing
        limitCodeMirrorHeight();
        
        // Force CodeMirror to recalculate its layout
        editor.refresh();
    }, 100);

    // Add code hint system to object editor
    if (!window.codeHintSystem) {
        const objectEditorHints = CodeHintSystem.init(editor);
        window.codeHintSystem = objectEditorHints;
    }
    else {
        console.warn("Code hint system already initialized, skipping re-initialization.");
    }

    // Also add to script editor if available
    if (window.ScriptEditor && window.ScriptEditor.getEditor) {
        setTimeout(() => {
            const scriptEditor = window.ScriptEditor.getEditor();
            if (scriptEditor) {
                const scriptEditorHints = CodeHintSystem.init(scriptEditor);
            }
        }, 500); // Delay to ensure script editor is fully initialized
    }

    // Tab system
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            button.classList.add('active');
            
            const tabId = button.getAttribute('data-tab');
            const targetPane = document.getElementById(tabId);
            
            if (targetPane) {
                targetPane.classList.add('active');
                
                // Refresh CodeMirror only when switching to objects tab with an active editor
                if (tabId === 'objects' && selectedEvent) {
                    setTimeout(() => {
                        editor.refresh();
                    }, 10);
                }

                if (tabId === 'scripts' && window.ScriptEditor) {
                    setTimeout(() => {
                        window.ScriptEditor.refresh();
                    }, 10);
                }
            } else {
                console.error(`Tab pane with id "${tabId}" not found`);
            }

            // Refresh CodeMirror editors when switching tabs
            setTimeout(() => {
                if (editor) editor.refresh();
                if (window.ScriptEditor && window.ScriptEditor.getEditor) {
                    const scriptEditor = window.ScriptEditor.getEditor();
                    if (scriptEditor) scriptEditor.refresh();
                }
                limitCodeMirrorHeight();
            }, 10);
        });
    });
    
    // Events for object management
    const objectsList = document.getElementById('objectsList');
    const addObjectBtn = document.getElementById('addObjectBtn');
    const addFolderBtn = document.getElementById('addFolderBtn');
    const renameObjectBtn = document.getElementById('renameObjectBtn');
    const deleteObjectBtn = document.getElementById('deleteObjectBtn');
    const objectName = document.getElementById('objectName');
    const objectActions = document.getElementById('objectActions');
    const noObjectSelected = document.getElementById('noObjectSelected');
    const objectEditArea = document.getElementById('objectEditArea');
    const eventsList = document.getElementById('eventsList');
    const currentEventName = document.getElementById('currentEventName');
    
    // Add a new object with duplicate name checking
    addObjectBtn.addEventListener('click', () => {
        showDialog('New Object', 'Enter object name:', 'Object', (name) => {
            if (!name) return;
            
            // Check for duplicate name
            if (gameObjects.some(obj => obj.name === name)) {
                alert(`An object with name "${name}" already exists. Please use a unique name.`);
                return;
            }
            
            const newObject = {
                id: generateId(),
                name: name,
                type: 'object',
                isPriority : false,
                events: {
                    awake: '// Initialize object\n\n',
                    loop: '// Object update logic\n\n',
                    loop_begin: '// Begin of loop logic\n\n',
                    loop_end: '// End of loop logic',
                    draw: '// Draw object\n\n',
                    draw_gui: '// Draw GUI logic\n\n',
                },
                folderId: null
            };
            
            gameObjects.push(newObject);
            renderObjectsList();
            selectObject(newObject.id);
    
            // Update window.gameObjects to ensure it's always current
            window.gameObjects = gameObjects;
            
            // Explicitly refresh the level editor
            if (window.LevelEditor && typeof window.LevelEditor.refreshGameObjects === 'function') {
                window.LevelEditor.refreshGameObjects();
            }
        });
    });

    // Fix for Canvas prevention issue
    window.addEventListener('keydown', (e) => {
        keyStates[e.keyCode] = true;
        if (e.keyCode === 32 || e.keyCode === 37 || e.keyCode === 38 || e.keyCode === 39 || e.keyCode === 40) {
            const canvasTab = document.getElementById('canvas');
            if (canvasTab && canvasTab.classList.contains('active')) {
                e.preventDefault();
            }
        }
    });
    
    // Add a new folder
    addFolderBtn.addEventListener('click', () => {
        showDialog('New Folder', 'Enter folder name:', 'Folder', (name) => {
            if (!name) return;
            
            const newFolder = {
                id: generateId(),
                name: name,
                type: 'folder',
                collapsed: false
            };
            
            folders.push(newFolder);
            renderObjectsList();
        });
    });
    
    // Rename object
    renameObjectBtn.addEventListener('click', () => {
        if (!selectedObject) return;
        
        const obj = gameObjects.find(o => o.id === selectedObject) || 
                    folders.find(f => f.id === selectedObject);
        
        if (obj) {
            showDialog('Rename', 'Enter new name:', obj.name, (name) => {
                if (!name) return;
                
                // Only check for duplicate names with objects, not folders
                if (obj.type === 'object' && gameObjects.some(o => o.id !== obj.id && o.name === name)) {
                    alert(`An object with name "${name}" already exists. Please use a unique name.`);
                    return;
                }
                
                obj.name = name;
                renderObjectsList();
                objectName.textContent = obj.type === 'object' ? obj.name : 'Folder: ' + obj.name;
            });
        }

        // Update window.gameObjects to ensure it's always current
        window.gameObjects = gameObjects;
        
        // Explicitly refresh the level editor
        if (window.LevelEditor && typeof window.LevelEditor.refreshGameObjects === 'function') {
            window.LevelEditor.refreshGameObjects();
        }
    });
    
    // Delete object or folder
    deleteObjectBtn.addEventListener('click', () => {
        if (!selectedObject) return;
        
        const isFolder = folders.some(f => f.id === selectedObject);
        
        if (isFolder) {
            if (confirm('Delete this folder and all contained objects?')) {
                const folderToRemove = folders.find(f => f.id === selectedObject);
                if (folderToRemove) {
                    // Get all objects in this folder
                    const objectsToRemove = gameObjects.filter(obj => obj.folderId === selectedObject);
                    
                    // Remove all objects from levels
                    if (window.LevelEditor && objectsToRemove.length > 0) {
                        window.LevelEditor.removeObjectsFromLevels(objectsToRemove.map(obj => obj.id));
                    }
                    
                    // Remove all objects in this folder
                    gameObjects = gameObjects.filter(obj => obj.folderId !== selectedObject);
                    folders = folders.filter(f => f.id !== selectedObject);
                    selectedObject = null;
                    updateObjectDetailView();
                    renderObjectsList();
                }
            }
        } else {
            if (confirm('Delete this object?')) {
                const objToRemove = gameObjects.find(obj => obj.id === selectedObject);
                if (objToRemove && window.LevelEditor) {
                    // Remove object from all levels
                    window.LevelEditor.removeObjectsFromLevels([selectedObject]);
                }
                
                gameObjects = gameObjects.filter(obj => obj.id !== selectedObject);
                selectedObject = null;
                updateObjectDetailView();
                renderObjectsList();
            }
        }
    });
    
    // Handle event selection
    eventsList.addEventListener('click', (e) => {
        const eventItem = e.target.closest('.event-item');
        if (!eventItem) return;
        
        const eventName = eventItem.getAttribute('data-event');
        selectEvent(eventName);
    });
    
    // Update editor content when changes are made
    editor.on('change', () => {
        if (selectedObject && selectedEvent) {
            const obj = gameObjects.find(o => o.id === selectedObject);
            if (obj) {
                obj.events[selectedEvent] = editor.getValue();
            }
        }
    });
    
    // Render the objects list
    function renderObjectsList() {
        objectsList.innerHTML = '';
        
        // Render standalone objects first (not in any folder)
        gameObjects
            .filter(obj => !obj.folderId)
            .forEach(obj => {
                const objectEl = createObjectElement(obj);
                objectsList.appendChild(objectEl);
            });
        
        // Render folders and their objects
        folders.forEach(folder => {
            const folderEl = createFolderElement(folder);
            objectsList.appendChild(folderEl);
            
            const folderContents = document.createElement('div');
            folderContents.className = 'folder-contents';
            folderContents.style.display = folder.collapsed ? 'none' : 'block';
            
            // Add objects that belong to this folder
            gameObjects
                .filter(obj => obj.folderId === folder.id)
                .forEach(obj => {
                    const objectEl = createObjectElement(obj);
                    folderContents.appendChild(objectEl);
                });
            
            objectsList.appendChild(folderContents);
        });
    }

    function initializeModules() {
        // Get all potentially registered modules from window
        const moduleKeys = Object.keys(window).filter(key => 
            key.startsWith('create_') && key.endsWith('_module') && typeof window[key] === 'function'
        );
        
        // Attach each module to the engine
        moduleKeys.forEach(key => {
            if (!engine[key]) {
                engine[key] = window[key];
                console.log(`Attached ${key} to engine`);
            }
        });
        
        console.log(`Initialized ${moduleKeys.length} modules`);
    }
    
    function createObjectElement(obj) {
        const objectEl = document.createElement('div');
        objectEl.className = 'object-item';
        objectEl.textContent = obj.name;
        objectEl.setAttribute('data-id', obj.id);
        
        if (selectedObject === obj.id) {
            objectEl.classList.add('selected');
        }
        
        objectEl.addEventListener('click', () => selectObject(obj.id));
        
        // Add drag and drop functionality
        objectEl.draggable = true;
        objectEl.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                id: obj.id,
                type: 'object'
            }));
        });
        
        return objectEl;
    }
    
    function createFolderElement(folder) {
        const folderEl = document.createElement('div');
        folderEl.className = 'folder-item';
        folderEl.setAttribute('data-id', folder.id);
        
        const folderNameEl = document.createElement('div');
        folderNameEl.className = 'folder-name';
        
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'folder-toggle' + (folder.collapsed ? ' collapsed' : '');
        toggleIcon.textContent = '▼';
        toggleIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            folder.collapsed = !folder.collapsed;
            toggleIcon.className = 'folder-toggle' + (folder.collapsed ? ' collapsed' : '');
            const folderContents = folderEl.parentNode.querySelector(`.folder-contents[data-parent="${folder.id}"]`);
            if (folderContents) {
                folderContents.style.display = folder.collapsed ? 'none' : 'block';
            }
        });
        
        folderNameEl.appendChild(toggleIcon);
        folderNameEl.innerHTML += `📁 ${folder.name}`;
        folderEl.appendChild(folderNameEl);
        
        // Handle selection
        folderEl.addEventListener('click', () => selectObject(folder.id));
        
        // Make folder a drop target
        folderEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            folderEl.classList.add('drag-over');
        });
        
        folderEl.addEventListener('dragleave', () => {
            folderEl.classList.remove('drag-over');
        });
        
        folderEl.addEventListener('drop', (e) => {
            e.preventDefault();
            folderEl.classList.remove('drag-over');
            
            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.type === 'object') {
                    const obj = gameObjects.find(o => o.id === data.id);
                    if (obj) {
                        obj.folderId = folder.id;
                        renderObjectsList();
                    }
                }
            } catch (err) {
                console.error('Error processing drop:', err);
            }
        });
        
        return folderEl;
    }
    
    // Select an object or folder
    function selectObject(id) {
        selectedObject = id;
        selectedEvent = null;
        
        // Find if it's an object or folder
        const obj = gameObjects.find(o => o.id === id);
        const folder = folders.find(f => f.id === id);
        
        // Clear selected state from all items
        document.querySelectorAll('.object-item, .folder-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selected state to the clicked item
        const selectedItem = document.querySelector(`[data-id="${id}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
        
        updateObjectDetailView(obj, folder);
    }
    
    // Update the detail view for selected object or folder
    function updateObjectDetailView(obj, folder) {
        if (!obj && !folder) {
            objectName.textContent = 'No Object Selected';
            objectActions.style.display = 'none';
            noObjectSelected.style.display = 'flex';
            objectEditArea.style.display = 'none';
            return;
        }
        
        objectActions.style.display = 'flex';
        noObjectSelected.style.display = 'none';
        
        if (obj) {
            // Show object details
            objectName.textContent = obj.name;
            objectEditArea.style.display = 'flex';

            // Add priority checkbox UI if it doesn't exist
            let priorityCheckContainer = document.getElementById('priorityCheckContainer');
            if (!priorityCheckContainer) {
                priorityCheckContainer = document.createElement('div');
                priorityCheckContainer.id = 'priorityCheckContainer';
                priorityCheckContainer.className = 'priority-check-container';
                priorityCheckContainer.innerHTML = `
                    <label class="priority-label">
                        <input type="checkbox" id="isPriorityCheck" /> Load with priority
                        <span class="tooltip">Priority objects are loaded first to ensure their functions are available to other objects</span>
                    </label>
                `;
                objectActions.appendChild(priorityCheckContainer);
                
                // Add event listener for the checkbox
                document.getElementById('isPriorityCheck').addEventListener('change', function(e) {
                    if (selectedObject) {
                        const selectedObj = gameObjects.find(o => o.id === selectedObject);
                        if (selectedObj) {
                            selectedObj.isPriority = e.target.checked;
                        }
                    }
                });
            }

            // Update priority checkbox state
            const isPriorityCheck = document.getElementById('isPriorityCheck');
            if (isPriorityCheck) {
                isPriorityCheck.checked = obj.isPriority === true;
            }
            
            // Clear selected state from events
            document.querySelectorAll('.event-item').forEach(item => {
                item.classList.remove('selected');
            });
            
            // Select first event by default
            selectEvent('awake');
            
        } else if (folder) {
            // Show folder details
            objectName.textContent = 'Folder: ' + folder.name;
            objectEditArea.style.display = 'none';
            noObjectSelected.style.display = 'flex';
            noObjectSelected.innerHTML = `
                <p>Folder: ${folder.name}</p>
                <p style="font-size: 0.9em; margin-top: 10px;">
                    Drag objects to this folder to organize them.
                </p>
            `;

            // Hide priority checkbox for folders
            const priorityCheckContainer = document.getElementById('priorityCheckContainer');
            if (priorityCheckContainer) {
                priorityCheckContainer.style.display = 'none';
            }
        }
    }

    function applyScreenFitToCanvas() {
        const canvasContainer = document.getElementById('canvasContainer');
        const canvas = document.getElementById('gameCanvas');
        const screenFitMode = screenFitSetting.value;
        
        // Reset styles
        canvas.style.width = '';
        canvas.style.height = '';
        canvas.style.maxWidth = '';
        canvas.style.maxHeight = '';
        canvas.style.imageRendering = '';
        
        switch (screenFitMode) {
            case 'stretch':
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                break;
                
            case 'maintain':
                canvas.style.maxWidth = '100%';
                canvas.style.maxHeight = '100%';
                // Let the aspect ratio be maintained automatically
                break;
                
            case 'integer':
                canvas.style.maxWidth = '100%';
                canvas.style.maxHeight = '100%';
                canvas.style.imageRendering = 'pixelated';
                
                // Calculate integer scaling
                const width = parseInt(canvasWidthSetting.value);
                const height = parseInt(canvasHeightSetting.value);
                const scaleX = Math.floor(canvasContainer.clientWidth / width);
                const scaleY = Math.floor(canvasContainer.clientHeight / height);
                const scale = Math.max(1, Math.min(scaleX, scaleY));
                
                canvas.style.width = (width * scale) + 'px';
                canvas.style.height = (height * scale) + 'px';
                break;
                
            case 'none':
            default:
                // Use native size
                break;
        }
    }
    
    // Select an event for the current object
    function selectEvent(eventName) {
        if (!selectedObject) return;
        
        const obj = gameObjects.find(o => o.id === selectedObject);
        if (!obj) return;
        
        selectedEvent = eventName;
        
        // Update UI
        document.querySelectorAll('.event-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        const eventItem = document.querySelector(`.event-item[data-event="${eventName}"]`);
        if (eventItem) {
            eventItem.classList.add('selected');
        }
        
        // Update editor content
        editor.setValue(obj.events[eventName] || '');
        
        // Update event name display
        currentEventName.textContent = `${obj.name}.${eventName}()`;
        
        // Refresh editor
        setTimeout(() => editor.refresh(), 1);
    }
    
    // Generate unique ID
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    // Show a dialog for input
    function showDialog(title, message, defaultValue, callback) {
        // Create overlay and dialog
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'dialog';
        
        dialog.innerHTML = `
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="dialog-form">
                <input type="text" id="dialogInput" value="${defaultValue || ''}">
            </div>
            <div class="dialog-actions">
                <button class="btn" id="dialogCancel">Cancel</button>
                <button class="btn" id="dialogConfirm">OK</button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Focus the input
        const input = document.getElementById('dialogInput');
        input.focus();
        input.select();
        
        // Handle enter key
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('dialogConfirm').click();
            }
        });
        
        // Cancel button
        document.getElementById('dialogCancel').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        // Confirm button
        document.getElementById('dialogConfirm').addEventListener('click', () => {
            const value = input.value.trim();
            document.body.removeChild(overlay);
            callback(value);
        });
    }
    
    // Keyboard support: keyboard_check implementation for the game engine
    const keyStates = {};
    
    window.addEventListener('keydown', (e) => {
        keyStates[e.keyCode] = true;
        if (e.keyCode === 32 || e.keyCode === 37 || e.keyCode === 38 || e.keyCode === 39 || e.keyCode === 40) {
            if (document.getElementById('canvas').classList.contains('active')) {
                e.preventDefault();
            }
        }
    });
    
    window.addEventListener('keyup', (e) => {
        keyStates[e.keyCode] = false;
    });

    // Play and stop functionality
    const playBtn = document.getElementById('playBtn');
    const stopBtn = document.getElementById('stopBtn');
    let isGameRunning = false;

    playBtn.addEventListener('click', () => {
        if (!isGameRunning) {
            startGame();
        }
    });

    stopBtn.addEventListener('click', () => {
        if (isGameRunning) {
            stopGame();
        }
    });

    const originalStartGame = startGame;
    function startGame() {
        // Wait for all modules to load before starting the game
        window.moduleRegistry.waitForModules(() => {
            let gameCode = '';
            
            // Include scripts if available
            if (window.ScriptEditor) {
                const scriptsCode = window.ScriptEditor.generateScriptsCode();
                gameCode += scriptsCode;
            }
            
            // Set canvas dimensions from settings
            const width = parseInt(canvasWidthSetting.value) || 640;
            const height = parseInt(canvasHeightSetting.value) || 480;
            
            const canvas = document.getElementById('gameCanvas');
            canvas.width = width;
            canvas.height = height;
            
            if (game) {
                game.room_width = width;
                game.room_height = height;
                game.view_wview = width;
                game.view_hview = height;
                
                // IMPORTANT: Manually make sure engine is available to window
                window.engine = game;

                // Log available modules for debugging
                console.log("Available modules before game start:", 
                    Object.keys(window.engine).filter(key => key.startsWith('create_')));
                
                // Ensure global functions are registered
                if (typeof window_global_functions === 'function') {
                    window_global_functions();
                }
            }

            window_global_functions();
            
            // Apply screen fit
            applyScreenFitToCanvas();

            // This ensures they're available even if window-global-functions.js has issues
            window.object_add = function() { return window.engine.object_add(); };
            window.instance_create = function(x, y, object) { return window.engine.instance_create(x, y, object); };
            window.keyboard_check = function(keyCode) { return keyStates[keyCode] === true; };
            window.keyboard_check_pressed = function(keyCode) { return window.engine.keyboard_check_pressed(keyCode); };
            window.draw_set_color = function(color) { return window.engine.draw_set_color(color); };
            window.draw_rectangle = function(x1, y1, x2, y2, outline) { return window.engine.draw_rectangle(x1, y1, x2, y2, outline); };
            window.draw_text = function(x, y, text) { return window.engine.draw_text(x, y, text); };
            
            // Rest of your original startGame function...
            // Generate resource code
            const resourcesCode = generateResourcesCode();
            gameCode += resourcesCode;
            
            // Generate object definitions
            gameObjects.forEach(obj => {
                gameCode += `// Create ${obj.name} object\n`;
                gameCode += `const ${obj.name} = object_add();\n\n`;
                
                // Add event handlers
                Object.keys(obj.events).forEach(event => {
                    if (obj.events[event] && obj.events[event].trim()) {
                        gameCode += `${obj.name}.${event} = function() {\n`;
                        gameCode += `  ${obj.events[event].replace(/\n/g, '\n  ')}\n`;
                        gameCode += `};\n\n`;
                    }
                });
            });
            
            // Generate level code
            if (window.LevelEditor) {
                const levelCode = window.LevelEditor.generateCode();
                if (levelCode) {
                    gameCode += levelCode;
                } else {
                    // Fallback: create instances at center if no levels defined
                    gameObjects.forEach(obj => {
                        gameCode += `// Create ${obj.name} instance\n`;
                        gameCode += `const ${obj.name}_inst = instance_create(room_width / 2, room_height / 2, ${obj.name});\n\n`;
                    });
                }
            } else {
                // Fallback if level editor not available
                gameObjects.forEach(obj => {
                    gameCode += `// Create ${obj.name} instance\n`;
                    gameCode += `const ${obj.name}_inst = instance_create(room_width / 2, room_height / 2, ${obj.name});\n\n`;
                });
            }
            
            // Set the code to the textbox (used by gameEngine)
            const textbox = document.getElementById('textbox');
            if (textbox) {
                textbox.value = gameCode;
            }
            
            // Switch to canvas tab
            const canvasTabBtn = document.querySelector('[data-tab="canvas"]');
            if (canvasTabBtn) {
                canvasTabBtn.click();
            }
            
            // Start the game
            game.gameRestartEval();

            // Ensure global functions are registered
            if (typeof window_global_functions === 'function') {
                window_global_functions();
            }
            
            // Update button states
            playBtn.disabled = true;
            stopBtn.disabled = false;
            isGameRunning = true;
        });
    }
    
    // Generate code from all objects
    function generateGameCode() {
        let code = '// Generated game code\n\n';
        
        // Add object definitions
        gameObjects.forEach(obj => {
            code += `// Create ${obj.name} object\n`;
            code += `const ${obj.name} = object_add();\n\n`;
            
            // Add event handlers
            Object.keys(obj.events).forEach(event => {
                if (obj.events[event] && obj.events[event].trim()) {
                    code += `${obj.name}.${event} = function() {\n`;
                    code += `  ${obj.events[event].replace(/\n/g, '\n  ')}\n`;
                    code += `};\n\n`;
                }
            });
            
            // Add instance creation
            code += `// Create ${obj.name} instance\n`;
            code += `const ${obj.name}_inst = instance_create(room_width / 2, room_height / 2, ${obj.name});\n\n`;
        });
        
        return code;
    }

    // Generate game code including resources
    function generateGameCodeWithResources() {
        let resourcesCode = '// Resource definitions\n\n';
        
        // Add sprite definitions
        resources.sprites.forEach(sprite => {
            resourcesCode += resourceTypes.sprites.template(sprite.name, sprite.src) + '\n\n';
        });
        
        // Add sound definitions
        resources.sounds.forEach(sound => {
            resourcesCode += resourceTypes.sounds.template(sound.name, sound.src) + '\n\n';
        });
        
        // Add font definitions
        resources.fonts.forEach(font => {
            resourcesCode += resourceTypes.fonts.template(font.name, font.src) + '\n\n';
        });
        
        // Add data definitions
        resources.data.forEach(dataItem => {
            resourcesCode += resourceTypes.data.template(dataItem.name, dataItem.src) + '\n\n';
        });

        // Generate the rest of the game code
        const objectsCode = generateGameCode();
        
        return resourcesCode + objectsCode;
    }

    function stopGame() {
        // Stop the game
        if (game && game.animationFrame) {
            cancelAnimationFrame(game.animationFrame);
        }
        
        // Clear canvas
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        // Update button states
        playBtn.disabled = false;
        stopBtn.disabled = true;
        isGameRunning = false;
    }

    // Settings functionality
    const themeSetting = document.getElementById('themeSetting');
    const fontSizeSetting = document.getElementById('fontSizeSetting');
    const canvasWidthSetting = document.getElementById('canvasWidthSetting');
    const canvasHeightSetting = document.getElementById('canvasHeightSetting');
    const applyCanvasSettings = document.getElementById('applyCanvasSettings');

    // Theme change
    themeSetting.addEventListener('change', () => {
        editor.setOption('theme', themeSetting.value);
    });

    // Font size change
    fontSizeSetting.addEventListener('change', () => {
        document.querySelector('.CodeMirror').style.fontSize = `${fontSizeSetting.value}px`;
        editor.refresh();
    });

    // Canvas size change
    applyCanvasSettings.addEventListener('click', () => {
        const width = parseInt(canvasWidthSetting.value);
        const height = parseInt(canvasHeightSetting.value);
        
        if (width > 0 && height > 0) {
            const canvas = document.getElementById('gameCanvas');
            canvas.width = width;
            canvas.height = height;
            
            if (game) {
                game.view_wview = width;
                game.view_hview = height;
            }
            
            // Apply screen fit mode
            applyScreenFitToCanvas();
            
            if (isGameRunning) {
                stopGame();
                startGame();
            }
        }
    });

    // File operations: New, Save, Load and Export
    const newProject = document.getElementById('newProject');
    const saveProject = document.getElementById('saveProject');
    const loadProject = document.getElementById('loadProject');
    const loadFileInput = document.getElementById('loadFile');
    const downloadLink = document.getElementById('downloadLink');
    const exportHTML = document.getElementById('exportHTML');

    // New Project
    newProject.addEventListener('click', () => {
        if (confirm('Starting a new project will discard any unsaved changes. Continue?')) {
            // First, stop any running game
            if (isGameRunning) {
                stopGame();
            }
    
            // 1. Reset game objects and folders
            gameObjects = [];
            folders = [];
            selectedObject = null;
            selectedEvent = null;
    
            // 2. Reset the script editor
            if (window.ScriptEditor) {
                window.ScriptEditor.setScriptsData([], []);
                // Add default utility script as a starting point
                window.ScriptEditor.addScript('Utilities', `/**
     * Utility Functions
     * Common helper functions that can be used in your game
     */
    
    /**
     * Calculate distance between two points
     * 
     * @param {number} x1 - X coordinate of first point
     * @param {number} y1 - Y coordinate of first point
     * @param {number} x2 - X coordinate of second point
     * @param {number} y2 - Y coordinate of second point
     * @returns {number} - Distance between points
     */
    function util_distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    }
    
    /**
     * Get random integer between min and max (inclusive)
     * 
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} - Random integer
     */
    function util_random_int(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    `);
            }
    
            // 3. Reset level editor
            if (window.LevelEditor) {
                window.LevelEditor.setLevels([]);
            }
    
            // 4. Reset resources
            resources = {
                sprites: [],
                backgrounds: [],
                sounds: [],
                fonts: [],
                data: []
            };
            window.resources = resources;
    
            // Update any resource displays
            if (document.querySelector('.resource-type.active')) {
                const activeType = document.querySelector('.resource-type.active').getAttribute('data-type');
                if (renderResourcesList) {
                    renderResourcesList(activeType);
                }
            }
    
            // 5. Reset the game engine state
            if (game) {
                // Reset game canvas dimensions to default values
                game.room_width = parseInt(canvasWidthSetting.value) || 640;
                game.room_height = parseInt(canvasHeightSetting.value) || 480;
                game.view_wview = game.room_width;
                game.view_hview = game.room_height;
    
                // Reset canvas
                const canvas = document.getElementById('gameCanvas');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    canvas.width = game.room_width;
                    canvas.height = game.room_height;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    // Apply screen fit to reset canvas appearance
                    applyScreenFitToCanvas();
                }
    
                // Clear any game instances and their state
                if (game.gameObjects) {
                    game.gameObjects.forEach(obj => {
                        if (obj.instances) {
                            obj.instances = [];
                        }
                    });
                }
            }
    
            // 6. Clear the game console if it exists
            if (window.GameConsole && typeof window.GameConsole.clear === 'function') {
                window.GameConsole.clear();
                window.GameConsole.info("New project started");
            }
    
            // 7. Reset any editor tabs to default state
            // Switch to objects tab by default
            const objectsTabBtn = document.querySelector('[data-tab="objects"]');
            if (objectsTabBtn) {
                objectsTabBtn.click();
            }
    
            // 8. Update UI to reflect reset
            renderObjectsList();
            updateObjectDetailView();
    
            // 9. Add a default object to help get started
            const newObject = {
                id: generateId(),
                name: 'objPlayer',
                type: 'object',
                isPriority : false,
                events: {
                    awake: '// Initialize object\nthis.x = room_width / 2;\nthis.y = room_height / 2;\nthis.width = 32;\nthis.height = 32;\nthis.color = c_blue;\n',
                    loop: '// Object update logic\nif (keyboard_check(vk_right)) this.x += 2;\nif (keyboard_check(vk_left)) this.x -= 2;\nif (keyboard_check(vk_up)) this.y -= 2;\nif (keyboard_check(vk_down)) this.y += 2;\n',
                    draw: '// Draw object\ndraw_set_color(this.color);\ndraw_rectangle(this.x, this.y, this.x + this.width, this.y + this.height, false);\n',
                    loop_begin: '// Begin of loop logic\n',
                    loop_end: '// End of loop logic\n',
                    draw_gui: '// Draw GUI logic\n',
                },
                folderId: null
            };
            gameObjects.push(newObject);
            renderObjectsList();
            selectObject(newObject.id);
    
            // 10. Update the window reference
            window.gameObjects = gameObjects;
    
            // 11. Show confirmation to the user
            console.log("Project reset to initial state");
        }
    });

    // Save Project
    saveProject.addEventListener('click', async () => {
        try {
            // Create a new JSZip instance
            const zip = new JSZip();
            
            // Create a copy of resources for saving without circular references
            const resourcesForSave = {};
            
            // Track all resource files to add to the ZIP
            const resourceFiles = [];
            
            // Process each resource type
            for (const type in resources) {
                resourcesForSave[type] = [];
                
                // Create directory for each resource type
                zip.folder(`resources/${type}`);
                
                for (const resource of resources[type]) {
                    // Create a resource entry without circular references
                    const resourceEntry = {
                        id: resource.id,
                        name: resource.name,
                        originalName: resource.originalName || resource.name,
                        type: type,
                        width: resource.width,
                        height: resource.height
                    };
                    
                    // Use the original file if available, otherwise fetch from the blob URL
                    if (resource.file) {
                        const filename = `resources/${type}/${resource.id}-${resource.originalName}`;
                        zip.file(filename, resource.file);
                        resourceEntry.src = filename;
                        resourceFiles.push(filename);
                    } else if (resource.src && resource.src.startsWith('blob:')) {
                        // Fetch the blob data and store it
                        try {
                            const response = await fetch(resource.src);
                            const blob = await response.blob();
                            const filename = `resources/${type}/${resource.id}-${resource.originalName || resource.name}`;
                            zip.file(filename, blob);
                            resourceEntry.src = filename;
                            resourceFiles.push(filename);
                        } catch (err) {
                            console.error(`Failed to add resource ${resource.name}:`, err);
                            resourceEntry.src = resource.src; // Fall back to original URL
                        }
                    } else {
                        // Just store the source URL (might be an external URL)
                        resourceEntry.src = resource.src;
                    }
                    
                    resourcesForSave[type].push(resourceEntry);
                }
            }
            
            // Get levels data from level editor if available
            let levelsData = [];
            if (window.LevelEditor) {
                levelsData = window.LevelEditor.getLevels();
            }
    
            // Get scripts data if available
            let scriptsData = { scripts: [], scriptFolders: [] };
            if (window.ScriptEditor) {
                scriptsData = window.ScriptEditor.getScriptsData();
            }
            
            // Create the project data
            const projectData = {
                gameObjects: gameObjects,
                folders: folders,
                scripts: scriptsData.scripts,
                scriptFolders: scriptsData.scriptFolders,
                resources: resourcesForSave,
                levels: levelsData,
                settings: {
                    canvasWidth: parseInt(canvasWidthSetting.value),
                    canvasHeight: parseInt(canvasHeightSetting.value),
                    screenFitMode: screenFitSetting.value
                },
                version: '1.0.0' // Add version for future compatibility checks
            };
            
            // Add the project data JSON to the ZIP
            zip.file("project.json", JSON.stringify(projectData, null, 2));
            
            // Generate the ZIP file
            const zipBlob = await zip.generateAsync({type: "blob"});
            
            // Save the ZIP file using FileSaver.js with .iproj extension
            saveAs(zipBlob, "isothermal-project.iproj");
            
        } catch (error) {
            console.error("Error saving project:", error);
            alert("Failed to save project: " + error.message);
        }
    });

    // Load Project
    loadProject.addEventListener('click', () => {
        // Update the accept attribute to handle ZIP files
        loadFileInput.accept = 'iproj,.zip';
        loadFileInput.click();
    });

    loadFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            // Check if it's a ZIP or IPROJ file
            if (file.name.toLowerCase().endsWith('.zip') || file.name.toLowerCase().endsWith('.iproj')) {
                // Read the ZIP file
                const zip = await JSZip.loadAsync(file);
                
                // Load the project.json file
                const projectDataText = await zip.file("project.json").async("text");
                const projectData = JSON.parse(projectDataText);
                
                // Before loading, stop any running game
                if (isGameRunning) {
                    stopGame();
                }
                
                // Load objects and folders
                if (projectData.gameObjects) {
                    gameObjects = projectData.gameObjects;
                }
                if (projectData.folders) {
                    folders = projectData.folders;
                }
                
                // Load scripts if available
                if (projectData.scripts && window.ScriptEditor) {
                    window.ScriptEditor.setScriptsData(projectData.scripts, projectData.scriptFolders);
                }
                
                // Reset the selection state
                selectedObject = null;
                selectedEvent = null;
                
                // Reset resources
                resources = {
                    sprites: [],
                    backgrounds: [],
                    sounds: [],
                    fonts: [],
                    data: []
                };
                
                // Load resources
                if (projectData.resources) {
                    // Process each resource type
                    for (const type in projectData.resources) {
                        if (!Array.isArray(projectData.resources[type])) continue;
                        
                        for (const resourceData of projectData.resources[type]) {
                            try {
                                const resource = {
                                    id: resourceData.id,
                                    name: resourceData.name,
                                    originalName: resourceData.originalName,
                                    loaded: false
                                };
                                
                                // Check if the resource file is in the ZIP
                                if (resourceData.src && resourceData.src.startsWith('resources/')) {
                                    const resourceZipFile = zip.file(resourceData.src);
                                    if (resourceZipFile) {
                                        // Extract the file data and create a blob URL
                                        const fileData = await resourceZipFile.async("blob");
                                        resource.src = URL.createObjectURL(fileData);
                                        resource.file = fileData;
                                        
                                        // Load additional properties based on resource type
                                        if (type === 'sprites' || type === 'backgrounds') {
                                            const img = new Image();
                                            img.onload = () => {
                                                resource.width = img.width;
                                                resource.height = img.height;
                                                resource.image = img;
                                                resource.loaded = true;
                                            };
                                            img.src = resource.src;
                                        } else if (type === 'sounds') {
                                            const audio = new Audio();
                                            audio.oncanplaythrough = () => {
                                                resource.audio = audio;
                                                resource.loaded = true;
                                            };
                                            audio.src = resource.src;
                                        }
                                    } else {
                                        console.warn(`Resource file not found in ZIP: ${resourceData.src}`);
                                        resource.src = resourceData.src;
                                    }
                                } else {
                                    resource.src = resourceData.src;
                                }
                                
                                resources[type].push(resource);
                            } catch (resourceErr) {
                                console.error(`Failed to load resource ${resourceData.name}:`, resourceErr);
                            }
                        }
                    }
                }
                
                // Load levels if level editor is initialized
                if (projectData.levels && window.LevelEditor) {
                    window.LevelEditor.setLevels(projectData.levels);
                }
                
                // Load settings
                if (projectData.settings) {
                    if (projectData.settings.canvasWidth) {
                        canvasWidthSetting.value = projectData.settings.canvasWidth;
                    }
                    if (projectData.settings.canvasHeight) {
                        canvasHeightSetting.value = projectData.settings.canvasHeight;
                    }
                    if (projectData.settings.screenFitMode) {
                        screenFitSetting.value = projectData.settings.screenFitMode;
                    }
                    
                    applyCanvasSettings.click();
                }
                
                // Update UI
                renderObjectsList();
                updateObjectDetailView();
                
                // Update resource UI if imports tab is visible
                const activeType = document.querySelector('.resource-type.active');
                if (activeType) {
                    renderResourcesList(activeType.getAttribute('data-type'));
                }
                
                // Provide feedback about the loaded project
                console.log("Project loaded successfully");
                console.log(`Loaded ${gameObjects.length} objects, ${resources.sprites.length} sprites, ${resources.sounds.length} sounds`);
                
                // Show success message
                alert(`Project loaded successfully!
    - ${gameObjects.length} objects
    - ${projectData.scripts ? projectData.scripts.length : 0} scripts
    - ${resources.sprites.length + resources.backgrounds.length + resources.sounds.length + resources.fonts.length + resources.data.length} resources`);
            } else {
                // Handle old JSON format for backwards compatibility
                alert("This file format is not supported. Please use .iproj files.");
            }
            
            // Reset the file input
            loadFileInput.value = '';
            
        } catch (error) {
            console.error("Error loading project:", error);
            alert("Failed to load project: " + error.message);
            loadFileInput.value = '';
        }
    });

    // Export HTML5
    exportHTML.addEventListener('click', async () => {
        try {
            // Create a new JSZip instance for HTML export
            const zip = new JSZip();

            // Generate scripts code
            let scriptsCode = '';
            if (window.ScriptEditor) {
                scriptsCode = window.ScriptEditor.generateScriptsCode();
            }
            
            // Generate resource code
            const resourcesCode = generateResourcesCode();
            
            // Generate object code
            let objectsCode = '';
            gameObjects.forEach(obj => {
                objectsCode += `// Create ${obj.name} object\n`;
                objectsCode += `const ${obj.name} = object_add();\n\n`;
                
                // Add event handlers
                Object.keys(obj.events).forEach(event => {
                    if (obj.events[event] && obj.events[event].trim()) {
                        objectsCode += `${obj.name}.${event} = function() {\n`;
                        objectsCode += `  ${obj.events[event].replace(/\n/g, '\n  ')}\n`;
                        objectsCode += `};\n\n`;
                    }
                });
            });
            
            // Generate level code
            let levelCode = '';
            if (window.LevelEditor) {
                const generatedLevelCode = window.LevelEditor.generateCode();
                if (generatedLevelCode) {
                    levelCode = generatedLevelCode;
                } else {
                    // Fallback for no levels
                    gameObjects.forEach(obj => {
                        levelCode += `// Create ${obj.name} instance\n`;
                        levelCode += `const ${obj.name}_inst = instance_create(room_width / 2, room_height / 2, ${obj.name});\n\n`;
                    });
                }
            } else {
                // Fallback for no level editor
                gameObjects.forEach(obj => {
                    levelCode += `// Create ${obj.name} instance\n`;
                    levelCode += `const ${obj.name}_inst = instance_create(room_width / 2, room_height / 2, ${obj.name});\n\n`;
                });
            }
            
            const gameCode = scriptsCode + resourcesCode + objectsCode + levelCode;
            const width = parseInt(canvasWidthSetting.value);
            const height = parseInt(canvasHeightSetting.value);
            const screenFitMode = screenFitSetting.value;
            
            // Add resource files to the ZIP
            const resourcePromises = [];
            
            for (const type in resources) {
                for (const resource of resources[type]) {
                    if (resource.src && (resource.file || resource.src.startsWith('blob:'))) {
                        const filename = `resources/${type}/${resource.id}-${resource.originalName || resource.name}`;
                        
                        // Create a promise to fetch and add the file to the ZIP
                        const promise = (async () => {
                            try {
                                let fileBlob;
                                if (resource.file) {
                                    fileBlob = resource.file;
                                } else {
                                    const response = await fetch(resource.src);
                                    fileBlob = await response.blob();
                                }
                                zip.file(filename, fileBlob);
                                return { src: resource.src, path: filename };
                            } catch (err) {
                                console.error(`Failed to add resource file ${resource.name}:`, err);
                                return { src: resource.src, path: resource.src };
                            }
                        })();
                        
                        resourcePromises.push(promise);
                    }
                }
            }
            
            // Wait for all resource files to be added to ZIP
            const resourceMappings = await Promise.all(resourcePromises);
            
            // Create a map of original URLs to local paths
            const resourceMap = {};
            resourceMappings.forEach(mapping => {
                resourceMap[mapping.src] = mapping.path;
            });
            
            // Update the resource code to use local paths
            let updatedGameCode = gameCode;
            for (const [originalSrc, localPath] of Object.entries(resourceMap)) {
                updatedGameCode = updatedGameCode.replace(new RegExp(escapeRegExp(originalSrc), 'g'), localPath);
            }
            
            // Serialize the game engine function
            const gameEngineSrc = createGameEngine.toString();
            
            // Create the HTML file with screen fit options
            const htmlContent = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Isothermal-JS Game</title>
        <style>
            body, html { 
                margin: 0; 
                padding: 0; 
                overflow: hidden; 
                background-color: #1e1e1e; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                width: 100vw;
            }
            
            #canvasContainer {
                position: relative;
                display: flex;
                justify-content: center;
                align-items: center;
                width: 100%;
                height: 100%;
            }
            
            canvas { 
                background-color: #333; 
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
                ${screenFitMode === 'none' ? '' : 'max-width: 100%; max-height: 100%;'}
                ${screenFitMode === 'stretch' ? 'width: 100%; height: 100%;' : ''}
                ${screenFitMode === 'integer' ? 'image-rendering: pixelated; image-rendering: crisp-edges;' : ''}
            }
        </style>
    </head>
    <body>
        <div id="canvasContainer">
            <canvas id="gameCanvas" width="${width}" height="${height}"></canvas>
        </div>
        <textarea id="textbox" style="display: none;">${updatedGameCode}</textarea>
        <script>
            // Game engine implementation
            ${gameEngineSrc}
    
            // Add keyboard support
            const keyStates = {};
            window.addEventListener('keydown', (e) => { keyStates[e.keyCode] = true; });
            window.addEventListener('keyup', (e) => { keyStates[e.keyCode] = false; });
            
            // Initialize game
            document.addEventListener('DOMContentLoaded', () => {
                const game = createGameEngine('gameCanvas', 'textbox');
                
                // Set up global functions
                window.keyboard_check = function(keyCode) { return keyStates[keyCode] === true; };
                window.clamp = function(value, min, max) { return Math.min(Math.max(value, min), max); };
                
                // Add game engine globals to the window
                window.object_add = function() { return game.object_add(); };
                window.instance_create = function(x, y, obj) { return game.instance_create(x, y, obj); };
                window.draw_set_color = function(color) { return game.draw_set_color(color); };
                window.draw_rectangle = function(x1, y1, x2, y2, outline) { return game.draw_rectangle(x1, y1, x2, y2, outline); };
                window.draw_text = function(x, y, text) { return game.draw_text(x, y, text); };
                window.point_distance = function(x1, y1, x2, y2) { return game.point_distance(x1, y1, x2, y2); };
                window.point_direction = function(x1, y1, x2, y2) { return game.point_direction(x1, y1, x2, y2); };
                window.lengthdir_x = function(len, dir) { return game.lengthdir_x(len, dir); };
                window.lengthdir_y = function(len, dir) { return game.lengthdir_y(len, dir); };
                window.floor = game.floor;
                window.ceil = game.ceil;
                window.round = game.round;
                
                // Game state variables
                Object.defineProperty(window, 'room_width', {
                    get: function() { return game.room_width; },
                    set: function(value) { game.room_width = value; }
                });
                
                Object.defineProperty(window, 'room_height', {
                    get: function() { return game.room_height; },
                    set: function(value) { game.room_height = value; }
                });
                
                Object.defineProperty(window, 'mouse_x', {
                    get: function() { return game.mouse_x; }
                });
                
                Object.defineProperty(window, 'mouse_y', {
                    get: function() { return game.mouse_y; }
                });
                
                // Color constants
                window.c_white = game.c_white;
                window.c_black = game.c_black;
                window.c_red = game.c_red;
                window.c_blue = game.rgb(0, 0, 255);
                window.c_green = game.rgb(0, 255, 0);
                window.c_yellow = game.rgb(255, 255, 0);
                window.c_gray = game.c_gray;
                window.c_ltgray = game.c_ltgray;
                window.c_dkgray = game.c_dkgray;
                
                // Alpha constants
                window.a_100 = game.a_100;
                window.a_75 = game.a_75;
                window.a_50 = game.a_50;
                window.a_25 = game.a_25;
                window.a_0 = game.a_0;

                // MutationObserver to handle any dynamic changes to the canvas
                if ("${screenFitMode}" !== "none") {
                    const canvasObserver = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                            if (mutation.type === 'attributes' && 
                                (mutation.attributeName === 'width' || mutation.attributeName === 'height')) {
                                setTimeout(resizeCanvas, 100);
                            }
                        });
                    });
                    
                    // Start observing the canvas after it's fully loaded
                    window.addEventListener('load', () => {
                        const canvas = document.getElementById('gameCanvas');
                        canvasObserver.observe(canvas, { attributes: true });
                    });
                }
                
                // Screen fit functions for maintaining aspect ratio
                if ("${screenFitMode}" === "maintain") {
                    function resizeCanvas() {
                        const canvas = document.getElementById('gameCanvas');
                        const container = document.getElementById('canvasContainer');
                        
                        // Calculate the scaling ratio
                        const aspectRatio = ${width} / ${height};
                        const containerWidth = container.clientWidth;
                        const containerHeight = container.clientHeight;
                        const containerRatio = containerWidth / containerHeight;
                        
                        if (containerRatio > aspectRatio) {
                            // Container is wider than needed
                            canvas.style.width = 'auto';
                            canvas.style.height = '100%';
                        } else {
                            // Container is taller than needed
                            canvas.style.width = '100%';
                            canvas.style.height = 'auto';
                        }
                    }
                    
                    // Resize on load and when window size changes
                    window.addEventListener('load', resizeCanvas);
                    window.addEventListener('resize', resizeCanvas);
                    
                    // Call resize after a short delay to ensure elements are ready
                    setTimeout(resizeCanvas, 100);
                } else if ("${screenFitMode}" === "integer") {
                    function resizeCanvas() {
                        const canvas = document.getElementById('gameCanvas');
                        const container = document.getElementById('canvasContainer');
                        
                        // Find the largest integer scaling factor that fits in the container
                        const scaleX = Math.floor(container.clientWidth / ${width});
                        const scaleY = Math.floor(container.clientHeight / ${height});
                        const scale = Math.max(1, Math.min(scaleX, scaleY));
                        
                        canvas.style.width = (${width} * scale) + 'px';
                        canvas.style.height = (${height} * scale) + 'px';
                    }
                    
                    // Resize on load and when window size changes
                    window.addEventListener('load', resizeCanvas);
                    window.addEventListener('resize', resizeCanvas);
                    
                    // Call resize after a short delay to ensure elements are ready
                    setTimeout(resizeCanvas, 100);
                }
                
                // Start the game
                game.gameRestartEval();
            });
        </script>
    </body>
    </html>`;
    
            // Add the HTML file to the ZIP
            zip.file("index.html", htmlContent);
            
            // Generate the ZIP file
            const zipBlob = await zip.generateAsync({type: "blob"});
            
            // Save the ZIP file
            saveAs(zipBlob, "isothermal-game.zip");
            
        } catch (error) {
            console.error("Error exporting HTML:", error);
            alert("Failed to export HTML: " + error.message);
        }
    });
    
    // Resource management for Imports tab
    const resourceTypes = {
        sprites: {
            name: 'Sprites',
            extensions: '.png,.jpg,.gif,.webp',
            template: (name, src) => `const ${name} = {
  src: "${src}",
  width: 0,  // Will be set when loaded
  height: 0, // Will be set when loaded
  image: null,
  loaded: false,
  load: function() {
    this.image = new Image();
    this.image.onload = () => {
      this.width = this.image.width;
      this.height = this.image.height;
      this.loaded = true;
    };
    this.image.src = this.src;
  }
};
${name}.load();`
        },
        backgrounds: {
            name: 'Backgrounds',
            extensions: '.png,.jpg,.gif,.webp',
            template: (name, src) => `const ${name} = {
src: "${src}",
width: 0,  // Will be set when loaded
height: 0, // Will be set when loaded
image: null,
loaded: false,
load: function() {
this.image = new Image();
this.image.onload = () => {
    this.width = this.image.width;
    this.height = this.image.height;
    this.loaded = true;
};
this.image.src = this.src;
}
};
${name}.load();`
        },
        sounds: {
            name: 'Sounds',
            extensions: '.mp3,.wav,.ogg',
            template: (name, src) => `const ${name} = {
  src: "${src}",
  audio: null,
  loaded: false,
  load: function() {
    this.audio = new Audio(this.src);
    this.audio.oncanplaythrough = () => {
      this.loaded = true;
    };
  },
  play: function() {
    if (this.audio) {
      this.audio.currentTime = 0;
      this.audio.play();
    }
  },
  loop: function(shouldLoop) {
    if (this.audio) {
      this.audio.loop = shouldLoop;
    }
  }
};
${name}.load();`
        },
        fonts: {
            name: 'Fonts',
            extensions: '.ttf,.otf,.woff,.woff2',
            template: (name, src) => `const ${name} = {
  src: "${src}",
  fontFace: null,
  loaded: false,
  load: function() {
    this.fontFace = new FontFace('${name}', 'url(${src})');
    document.fonts.add(this.fontFace);
    this.fontFace.load().then(() => {
      this.loaded = true;
    });
  }
};
${name}.load();`
        },
        data: {
            name: 'Data',
            extensions: '.json,.txt,.csv',
            template: (name, src) => `const ${name} = {
  src: "${src}",
  data: null,
  loaded: false,
  load: function() {
    fetch(this.src)
      .then(response => response.json())
      .then(data => {
        this.data = data;
        this.loaded = true;
      });
  }
};
${name}.load();`
        }
    };

    // Resources storage
    let resources = {
        sprites: [],
        backgrounds: [],
        sounds: [],
        fonts: [],
        data: []
    };

    // Initialize import tab content
    function initializeImportsTab() {
        const importsTab = document.getElementById('imports');
        if (!importsTab) return;

        let importsContent = `
            <div class="resources-container">
                <div class="resources-sidebar">
                    <div class="sidebar-header">
                        <h3>Resources</h3>
                    </div>
                    <div class="resources-types">
                        <div class="resource-type active" data-type="sprites">Sprites</div>
                        <div class="resource-type" data-type="backgrounds">Backgrounds</div>
                        <div class="resource-type" data-type="sounds">Sounds</div>
                        <div class="resource-type" data-type="fonts">Fonts</div>
                        <div class="resource-type" data-type="data">Data</div>
                    </div>
                </div>
                <div class="resources-content">
                    <div class="resources-header">
                        <h3 id="resourceTypeTitle">Sprites</h3>
                        <button id="addResourceBtn" class="add-resource-btn">+ Add Resource</button>
                    </div>
                    <div class="resources-list" id="resourcesList">
                        <div class="empty-resources">
                            <p>No resources added yet.</p>
                            <p>Click "Add Resource" to upload a file.</p>
                        </div>
                    </div>
                </div>
            </div>`;

        importsTab.innerHTML = importsContent;

        // Add resource type switching
        const resourceTypeBtns = document.querySelectorAll('.resource-type');
        resourceTypeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                resourceTypeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const resourceType = btn.getAttribute('data-type');
                document.getElementById('resourceTypeTitle').textContent = resourceTypes[resourceType].name;
                renderResourcesList(resourceType);
                handleResourceUpdate();
            });
        });

        // Add resource button
        document.getElementById('addResourceBtn').addEventListener('click', () => {
            const activeType = document.querySelector('.resource-type.active').getAttribute('data-type');
            showAddResourceDialog(activeType);
            handleResourceUpdate();
        });

        // Initial render of resources list
        renderResourcesList('sprites');
    }

    function handleResourceUpdate() {
        // Make resources available globally
        window.resources = resources;
        
        console.log("Updated resources:", resources);
        
        // Sync resources with level editor if it's available
        if (window.LevelEditor && typeof window.LevelEditor.syncResources === 'function') {
            console.log("Syncing resources with level editor");
            window.LevelEditor.syncResources();
        }
    }

    function generateResourcesCode() {
        let resourcesCode = '// Resource definitions\n\n';
        
        // Add sprite definitions
        resources.sprites.forEach(sprite => {
            resourcesCode += resourceTypes.sprites.template(sprite.name, sprite.src) + '\n\n';
        });

        // Add background definitions
        resources.backgrounds.forEach(background => {
            resourcesCode += resourceTypes.backgrounds.template(background.name, background.src) + '\n\n';
        });
        
        // Add sound definitions
        resources.sounds.forEach(sound => {
            resourcesCode += resourceTypes.sounds.template(sound.name, sound.src) + '\n\n';
        });
        
        // Add font definitions
        resources.fonts.forEach(font => {
            resourcesCode += resourceTypes.fonts.template(font.name, font.src) + '\n\n';
        });
        
        // Add data definitions
        resources.data.forEach(dataItem => {
            resourcesCode += resourceTypes.data.template(dataItem.name, dataItem.src) + '\n\n';
        });
    
        return resourcesCode;
    }

    // Render resources list for a specific type
    function renderResourcesList(type) {
        const resourcesList = document.getElementById('resourcesList');
        if (!resourcesList) return;

        if (resources[type].length === 0) {
            resourcesList.innerHTML = `
                <div class="empty-resources">
                    <p>No ${resourceTypes[type].name.toLowerCase()} added yet.</p>
                    <p>Click "Add Resource" to upload a file.</p>
                </div>`;
            return;
        }

        let html = '';
        resources[type].forEach(resource => {
            let preview = '';
            if (type === 'sprites' || type === 'backgrounds') {
                preview = `<div class="resource-preview"><img src="${resource.src}" alt="${resource.name}"></div>`;
            } else if (type === 'sounds') {
                preview = `<div class="resource-preview sound-preview">🔊</div>`;
            } else if (type === 'fonts') {
                preview = `<div class="resource-preview font-preview" style="font-family: '${resource.name}'">Aa</div>`;
            } else {
                preview = `<div class="resource-preview data-preview">📄</div>`;
            }

            html += `
                <div class="resource-item" data-id="${resource.id}">
                    ${preview}
                    <div class="resource-details">
                        <div class="resource-name">${resource.name}</div>
                        <div class="resource-path">${resource.src}</div>
                    </div>
                    <div class="resource-actions">
                        <button class="resource-action-btn rename-btn" data-id="${resource.id}" title="Rename">✏️</button>
                        <button class="resource-action-btn delete-btn" data-id="${resource.id}" title="Delete">🗑️</button>
                    </div>
                </div>`;
        });

        resourcesList.innerHTML = html;

        // Add event listeners for resource actions
        document.querySelectorAll('.rename-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const resourceId = btn.getAttribute('data-id');
                const activeType = document.querySelector('.resource-type.active').getAttribute('data-type');
                const resource = resources[activeType].find(r => r.id === resourceId);
                
                if (resource) {
                    showDialog('Rename Resource', 'Enter new name:', resource.name, (newName) => {
                        if (newName) {
                            resource.name = newName;
                            renderResourcesList(activeType);
                        }
                    });
                }
            });
        });

        // Apply screen fit when window resizes
        window.addEventListener('resize', () => {
            if (document.getElementById('canvas').classList.contains('active')) {
                applyScreenFitToCanvas();
            }
        });

        // Apply screen fit when switching to canvas tab
        document.querySelector('.tab-btn[data-tab="canvas"]').addEventListener('click', () => {
            setTimeout(applyScreenFitToCanvas, 100);
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const resourceId = btn.getAttribute('data-id');
                const activeType = document.querySelector('.resource-type.active').getAttribute('data-type');
                
                if (confirm('Delete this resource?')) {
                    resources[activeType] = resources[activeType].filter(r => r.id !== resourceId);
                    renderResourcesList(activeType);
                }
            });
        });

        // Sound preview playback
        if (type === 'sounds') {
            document.querySelectorAll('.sound-preview').forEach((preview, index) => {
                preview.addEventListener('click', () => {
                    const resource = resources.sounds[index];
                    if (resource && resource.audio) {
                        resource.audio.currentTime = 0;
                        resource.audio.play();
                    }
                });
            });
        }
    }

    function initializeGameConsole() {
        if (window.GameConsole) {
            const console = window.GameConsole.init();
            
            // Access console controls using:
            // GameConsole.log(), GameConsole.error(), GameConsole.warn(), etc.
            
            // Add error handling to the game start/stop functions
            const originalStartGame = window.startGame;
            window.startGame = function() {
                try {
                    GameConsole.info("Game starting...");
                    if (originalStartGame) {
                        originalStartGame.apply(this, arguments);
                    }
                    GameConsole.info("Game started successfully");
                } catch (error) {
                    GameConsole.error("Error starting game", error.stack);
                    throw error; // Re-throw to maintain original behavior
                }
            };
            
            const originalStopGame = window.stopGame;
            window.stopGame = function() {
                try {
                    GameConsole.info("Game stopping...");
                    if (originalStopGame) {
                        originalStopGame.apply(this, arguments);
                    }
                    GameConsole.info("Game stopped successfully");
                } catch (error) {
                    GameConsole.error("Error stopping game", error.stack);
                    throw error;
                }
            };
            
            // Add special handling for runtime errors in game code
            window.handleGameError = function(error, source) {
                GameConsole.error(`Runtime error in ${source || 'game code'}: ${error.message}`, error.stack);
            };
            
            GameConsole.info("Game Console initialized and ready");
        } else {
            console.warn("Game Console not available. Make sure console.js is loaded correctly.");
        }
    }

    function initializeLevelEditor() {
        if (window.LevelEditor) {
            // Initialize the level editor with references to shared data and functions
            window.LevelEditor.init(
                gameObjects,       // Pass reference to gameObjects array
                generateId,        // Pass reference to ID generator function
                showDialog         // Pass reference to dialog function
            );
        } else {
            console.warn("Level Editor module not found. Make sure levelEditor.js is included in your project.");
        }
    }

    // Show dialog to add a new resource
    function showAddResourceDialog(type) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = resourceTypes[type].extensions;
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
    
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) {
                document.body.removeChild(fileInput);
                return;
            }
    
            // Generate a friendly name from the filename
            const baseName = file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            
            showDialog('Add Resource', 'Enter resource name:', baseName, (name) => {
                if (!name) {
                    document.body.removeChild(fileInput);
                    return;
                }
    
                // Create a blob URL for the file
                const resourceUrl = URL.createObjectURL(file);
                
                // Create the resource object
                const resource = {
                    id: generateId(),
                    name: name,
                    src: resourceUrl,
                    file: file,
                    originalName: file.name,
                    loaded: false
                };
    
                // For sprites, backgrounds, and images, preload them
                if (type === 'sprites' || type === 'backgrounds') {
                    const img = new Image();
                    img.onload = () => {
                        resource.width = img.width;
                        resource.height = img.height;
                        resource.image = img;
                        resource.loaded = true;
                        renderResourcesList(type);
                        
                        // Force update level editor resources
                        if (window.LevelEditor && typeof window.LevelEditor.syncResources === 'function') {
                            window.LevelEditor.syncResources();
                        }
                    };
                    img.src = resourceUrl;
                } else if (type === 'sounds') {
                    // Rest of your existing sound loading code
                }
    
                // Add resource to the appropriate collection
                resources[type].push(resource);
                
                // Update the UI
                renderResourcesList(type);
                document.body.removeChild(fileInput);
    
                console.log(`Added ${type} resource: ${name}`);
                console.log("Current resources:", resources);
    
                // Explicitly update window.resources for global access
                window.resources = resources;
    
                // Force sync with level editor
                handleResourceUpdate();
            });
        });
    
        fileInput.click();
    }

    // Initialize with a default objects
    // Player Object
gameObjects.push({
    id: generateId(),
    name: 'objPlayer',
    type: 'object',
    events: {
        awake: `// Initialize player
this.width = 32;
this.height = 48;
this.color = c_blue;
this.is_dead = false;
this.score = 0;
this.invincible = false;
this.invincible_time = 0;

// Add physics module
const physics = this.module_add(engine.create_physics_module());
physics.friction = 0.1;
physics.gravity = 0.6;
physics.max_gravity_speed = 12;

// Add platformer controller module
const platformer = this.module_add(engine.create_platformer_module());
platformer.max_speed = 4;
platformer.jump_force = 10;
platformer.can_jump = true;
platformer.max_jumps = 2; // Double jump enabled`,

        loop: `// Get modules
const physics = this.module_get('physics');
const platformer = this.module_get('platformer');
if (!physics || !platformer) return;

// Handle input for player movement
let moveInput = 0;

if (keyboard_check(vk_left) || keyboard_check(65)) { // Left arrow or A
    moveInput = -1;
} else if (keyboard_check(vk_right) || keyboard_check(68)) { // Right arrow or D
    moveInput = 1;
}

// Set the movement input on the platformer
platformer.set_move_input(moveInput);

// Handle jump input
const jumpPressed = keyboard_check_pressed(vk_space) 
|| keyboard_check_pressed(vk_up) || keyboard_check_pressed(87); // Space, Up arrow or W
platformer.set_jump_input(jumpPressed);

// Handle collisions with enemies
const enemies = objEnemy.instances;
for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (this.check_collision(enemy) && !this.invincible) {
        // Check if we're landing on top of the enemy
        if (this.yprevious < enemy.y - enemy.height/2 && physics.yspeed > 0) {
            // Bounce off enemy
            physics.yspeed = -8;
            
            // Kill enemy
            enemy.instance_destroy();
            
            // Add score
            this.score += 100;
        } else {
            // We got hit
            this.take_damage();
        }
    }
}

// Death condition - falling off the screen
if (this.y > room_height + 100) {
    this.die();
}`,

        loop_begin: `// Decrease invincible timer if active
if (this.invincible && this.invincible_time > 0) {
    this.invincible_time -= dt;
    if (this.invincible_time <= 0) {
        this.invincible = false;
    }
}`,

        loop_end: `// Update animation based on movement
const platformer = this.module_get('platformer');
if (platformer) {
    this.facing = platformer.facing;
}`,

        draw: `// Draw player with flashing effect when invincible
if (!this.invincible || Math.floor(this.invincible_time * 10) % 2 === 0) {
    draw_set_color(this.color);
    draw_rectangle(this.x, this.y, this.x + this.width, this.y + this.height, false);
    
    // Draw face direction
    draw_set_color(c_white);
    
    // Draw eyes based on facing direction
    if (this.facing > 0) {
        // Right-facing eye
        draw_rectangle(this.x + this.width - 10, this.y + 10, this.x + this.width - 5, this.y + 15, false);
    } else {
        // Left-facing eye
        draw_rectangle(this.x + 5, this.y + 10, this.x + 10, this.y + 15, false);
    }
}`,

        draw_gui: `// Draw score
draw_set_color(c_white);
draw_text(10, 10, "Score: " + this.score);`
    },
    folderId: null
});

// Block Object
gameObjects.push({
    id: generateId(),
    name: 'objBlock',
    type: 'object',
    events: {
        awake: `// Initialize block
this.width = 32;
this.height = 32;
this.color = c_gray;
this.solid = true;`,

        loop: `// Blocks are solid and static`,

        draw: `// Draw block
draw_set_color(this.color);
draw_rectangle(this.x, this.y, this.x + this.width, this.y + this.height, false);

// Draw block outline for visibility
draw_set_color(c_dkgray);
draw_rectangle(this.x, this.y, this.x + this.width, this.y + this.height, true);`
    },
    folderId: null
});

// Enemy Object
gameObjects.push({
    id: generateId(),
    name: 'objEnemy',
    type: 'object',
    events: {
        awake: `// Initialize enemy
this.width = 32;
this.height = 32;
this.color = c_red;
this.move_speed = 2;
this.direction = 1; // 1 = right, -1 = left

// Add physics module for gravity
const physics = this.module_add(engine.create_physics_module());
physics.friction = 0.1;
physics.gravity = 0.5;
physics.max_gravity_speed = 10;
physics.has_collision = true;`,

        loop: `// Get physics module
const physics = this.module_get('physics');
if (!physics) return;

// Move horizontally
physics.xspeed = this.move_speed * this.direction;

// Check for edge or wall and turn around
const leftCheck = instance_position(this.x - 2, this.y + this.height + 5, objBlock);
const rightCheck = instance_position(this.x + this.width + 2, this.y + this.height + 5, objBlock);
const leftWall = instance_position(this.x - 2, this.y + this.height/2, objBlock);
const rightWall = instance_position(this.x + this.width + 2, this.y + this.height/2, objBlock);

if ((this.direction < 0 && (!leftCheck || leftWall)) || 
    (this.direction > 0 && (!rightCheck || rightWall))) {
    // Turn around
    this.direction *= -1;
}`,

        draw: `// Draw enemy
draw_set_color(this.color);
draw_rectangle(this.x, this.y, this.x + this.width, this.y + this.height, false);

// Draw eyes
draw_set_color(c_white);
if (this.direction > 0) {
    // Looking right
    draw_rectangle(this.x + this.width - 12, this.y + 8, this.x + this.width - 8, this.y + 12, false);
} else {
    // Looking left
    draw_rectangle(this.x + 8, this.y + 8, this.x + 12, this.y + 12, false);
}`,
    },
    folderId: null
});

// Helper Functions for the Player
gameObjects.push({
    id: generateId(),
    name: 'objHelperFunctions',
    type: 'object',
    isPriority: true,
    events: {
        awake: `// This object adds utility functions to other objects
this.visible = false; // Don't draw this object`,
        
        loop_begin: `// Add helper functions to player if they don't exist yet
if (objPlayer.instances.length > 0) {
    const player = objPlayer.instances[0];
    
    if (!player.die) {
        player.die = function() {
            console.log("Player died!");
            
            // Reset player to start position
            this.x = 64;
            this.y = 64;
            
            // Reset physics
            const physics = this.module_get('physics');
            if (physics) {
                physics.xspeed = 0;
                physics.yspeed = 0;
            }
            
            // Set invincibility
            this.invincible = true;
            this.invincible_time = 2;
        };
    }
    
    if (!player.take_damage) {
        player.take_damage = function() {
            if (!this.invincible) {
                this.invincible = true;
                this.invincible_time = 1.5;
                
                // Knock the player back
                const physics = this.module_get('physics');
                if (physics) {
                    physics.yspeed = -6;
                    
                    // Knock in opposite direction of movement
                    const platformer = this.module_get('platformer');
                    if (platformer) {
                        physics.xspeed = -platformer.facing * 8;
                    }
                }
            }
        };
    }
}`,
    },
    folderId: null
});

// Level Boundary Helper
gameObjects.push({
    id: generateId(),
    name: 'objCollisionHelper',
    type: 'object',
    isPriority: true,
    events: {
        awake: `// Initialize collision helper
this.visible = false; // Don't draw this object

// Define a function to check collision at specific position
window.instance_position = function(x, y, object) {
    if (!object || !object.instances) return null;
    
    for (let i = 0; i < object.instances.length; i++) {
        const inst = object.instances[i];
        if (inst.active && 
            x >= inst.x && 
            x < inst.x + inst.width &&
            y >= inst.y && 
            y < inst.y + inst.height) {
            return inst;
        }
    }
    
    return null;
};`,
    },
    folderId: null
});

    // Initialize imports tab
    initializeImportsTab();
    
    // Initialize level editor
    initializeLevelEditor();
    
    initializeScriptEditor();

    // Also call it on initial load
    limitCodeMirrorHeight();

    window.resources = resources;
    window.resourceTypes = resourceTypes;
    
    renderObjectsList();

    // Initialize the Script Editor when DOM is loaded
    function initializeScriptEditor() {
        if (window.ScriptEditor) {
            // Pass the required utility functions to the script editor
            window.ScriptEditor.init(generateId, showDialog);
        } else {
            console.warn("Script Editor module not found. Make sure scriptEditor.js is included in your project.");
        }
    }

    /*(function() {
        // Check if the level editor is available
        if (!window.LevelEditor) {
            console.error("Level Editor not found!");
            return;
        }
        
        // Create a new platformer level
        const createPlatformerLevel = function() {
            // Generate a unique ID
            const generateId = function() {
                return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            };
            
            // Create level data structure
            const platformerLevel = {
                id: generateId(),
                name: "Platformer 1",
                width: 1280,
                height: 720,
                viewWidth: 640,
                viewHeight: 480,
                gridSize: 32,
                backgroundColor: "#87CEEB", // Sky blue
                backgroundImage: null,
                backgroundImageMode: "stretch",
                backgroundImageSpeed: 0,
                objects: [],
                setupCode: "// Setup global level variables\nwindow.levelScore = 0;\nwindow.levelCoins = 0;\n"
            };
            
            // Get game objects reference
            const gameObjects = window.gameObjects || [];
            
            // Find object IDs by name
            const findObjectByName = function(name) {
                const obj = gameObjects.find(o => o.name === name);
                return obj ? obj.id : null;
            };
            
            // Object IDs
            const playerObjId = findObjectByName("objPlayer");
            const blockObjId = findObjectByName("objBlock");
            const enemyObjId = findObjectByName("objEnemy");
            const helperObjId = findObjectByName("objHelperFunctions");
            const collisionObjId = findObjectByName("objCollisionHelper");
            
            // If we can't find necessary objects, abort
            if (!playerObjId || !blockObjId) {
                console.error("Required game objects not found!");
                return null;
            }
            
            // Create helper and collision objects (these are priority objects)
            if (helperObjId) {
                platformerLevel.objects.push({
                    id: generateId(),
                    objectId: helperObjId,
                    objectName: "objHelperFunctions",
                    gridX: 0,
                    gridY: 0,
                    x: 0, 
                    y: 0,
                    properties: {}
                });
            }
            
            if (collisionObjId) {
                platformerLevel.objects.push({
                    id: generateId(),
                    objectId: collisionObjId,
                    objectName: "objCollisionHelper",
                    gridX: 1,
                    gridY: 0,
                    x: 32, 
                    y: 0,
                    properties: {}
                });
            }
            
            // Create player at starting position
            if (playerObjId) {
                platformerLevel.objects.push({
                    id: generateId(),
                    objectId: playerObjId,
                    objectName: "objPlayer",
                    gridX: 2,
                    gridY: 5,
                    x: 2 * 32, 
                    y: 5 * 32,
                    properties: {}
                });
            }
            
            // Create platform blocks
            if (blockObjId) {
                // Ground platforms
                for (let x = 0; x < 40; x++) {
                    platformerLevel.objects.push({
                        id: generateId(),
                        objectId: blockObjId,
                        objectName: "objBlock",
                        gridX: x,
                        gridY: 20,
                        x: x * 32, 
                        y: 20 * 32,
                        properties: {}
                    });
                }
                
                // Left wall
                for (let y = 15; y < 20; y++) {
                    platformerLevel.objects.push({
                        id: generateId(),
                        objectId: blockObjId,
                        objectName: "objBlock",
                        gridX: 0,
                        gridY: y,
                        x: 0, 
                        y: y * 32,
                        properties: {}
                    });
                }
                
                // Platforms
                // Platform 1
                for (let x = 5; x < 10; x++) {
                    platformerLevel.objects.push({
                        id: generateId(),
                        objectId: blockObjId,
                        objectName: "objBlock",
                        gridX: x,
                        gridY: 15,
                        x: x * 32, 
                        y: 15 * 32,
                        properties: {}
                    });
                }
                
                // Platform 2
                for (let x = 12; x < 18; x++) {
                    platformerLevel.objects.push({
                        id: generateId(),
                        objectId: blockObjId,
                        objectName: "objBlock",
                        gridX: x,
                        gridY: 12,
                        x: x * 32, 
                        y: 12 * 32,
                        properties: {}
                    });
                }
                
                // Platform 3
                for (let x = 20; x < 25; x++) {
                    platformerLevel.objects.push({
                        id: generateId(),
                        objectId: blockObjId,
                        objectName: "objBlock",
                        gridX: x,
                        gridY: 10,
                        x: x * 32, 
                        y: 10 * 32,
                        properties: {}
                    });
                }
                
                // Platform 4
                for (let x = 27; x < 35; x++) {
                    platformerLevel.objects.push({
                        id: generateId(),
                        objectId: blockObjId,
                        objectName: "objBlock",
                        gridX: x,
                        gridY: 8,
                        x: x * 32, 
                        y: 8 * 32,
                        properties: {}
                    });
                }
            }
            
            // Add enemies
            if (enemyObjId) {
                // Enemy on platform 1
                platformerLevel.objects.push({
                    id: generateId(),
                    objectId: enemyObjId,
                    objectName: "objEnemy",
                    gridX: 7,
                    gridY: 14,
                    x: 7 * 32, 
                    y: 14 * 32,
                    properties: {}
                });
                
                // Enemy on platform 2
                platformerLevel.objects.push({
                    id: generateId(),
                    objectId: enemyObjId,
                    objectName: "objEnemy",
                    gridX: 15,
                    gridY: 11,
                    x: 15 * 32, 
                    y: 11 * 32,
                    properties: {}
                });
                
                // Enemy on platform 3
                platformerLevel.objects.push({
                    id: generateId(),
                    objectId: enemyObjId,
                    objectName: "objEnemy",
                    gridX: 22,
                    gridY: 9,
                    x: 22 * 32, 
                    y: 9 * 32,
                    properties: {}
                });
                
                // Enemy on platform 4
                platformerLevel.objects.push({
                    id: generateId(),
                    objectId: enemyObjId,
                    objectName: "objEnemy",
                    gridX: 30,
                    gridY: 7,
                    x: 30 * 32, 
                    y: 7 * 32,
                    properties: {}
                });
                
                // Enemy on ground
                platformerLevel.objects.push({
                    id: generateId(),
                    objectId: enemyObjId,
                    objectName: "objEnemy",
                    gridX: 35,
                    gridY: 19,
                    x: 35 * 32, 
                    y: 19 * 32,
                    properties: {}
                });
            }
            
            return platformerLevel;
        };
        
        // Create the level data
        const platformerLevel = createPlatformerLevel();
        
        if (platformerLevel) {
            // Get current levels
            let levels = window.LevelEditor.getLevels() || [];
            
            // Add our new level
            levels.push(platformerLevel);
            
            // Update levels in level editor
            window.LevelEditor.setLevels(levels);
            
            console.log("Sample platformer level created successfully!");
        }
    })();*/
});
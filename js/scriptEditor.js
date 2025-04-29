/**
 * Script Editor Module
 * Manages JavaScript scripts that can be organized in folders and used in games
 */
const ScriptEditor = (function() {
    // Private variables
    let scripts = [];
    let scriptFolders = [];
    let selectedScript = null;
    let scriptEditor = null;
    
    // Helper functions references (will be set during initialization)
    let generateId = null;
    let showDialog = null;
    
    // DOM elements
    let scriptsList = null;
    let scriptName = null;
    let scriptActions = null;
    let noScriptSelected = null;
    let scriptEditArea = null;
    
    /**
     * Initialize the script editor
     * @param {Function} generateIdFn - Function to generate unique IDs
     * @param {Function} showDialogFn - Function to show dialog boxes
     */
    function init(generateIdFn, showDialogFn) {
        // Store references to helper functions
        generateId = generateIdFn;
        showDialog = showDialogFn;
        
        // Get DOM elements
        scriptsList = document.getElementById('scriptsList');
        scriptName = document.getElementById('scriptName');
        scriptActions = document.getElementById('scriptActions');
        noScriptSelected = document.getElementById('noScriptSelected');
        scriptEditArea = document.getElementById('scriptEditArea');
        
        // Initialize CodeMirror for script editing
        scriptEditor = CodeMirror.fromTextArea(document.getElementById('script-code-editor'), {
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
        
        // Enable auto-completion for script editor
        scriptEditor.on("inputRead", function(editor, change) {
            if (change.origin !== "+input") return;
            if (change.text.length > 1 && change.text[0] !== ".") return;
            
            const hasPoint = change.text[0] === ".";
            
            if (hasPoint || /[\w]/.test(change.text[0])) {
                editor.showHint({
                    completeSingle: false,
                    alignWithWord: true
                });
            }
        });
        
        // Update script content when changes are made
        scriptEditor.on('change', () => {
            if (selectedScript) {
                const script = scripts.find(s => s.id === selectedScript);
                if (script) {
                    script.code = scriptEditor.getValue();
                }
            }
        });
        
        // Set up event listeners for buttons
        setupEventListeners();
        
        // Add default script if none exist
        if (scripts.length === 0) {
            addDefaultScript();
        }
        
        // Render the initial UI
        renderScriptsList();
    }
    
    /**
     * Set up event listeners for script management buttons
     */
    function setupEventListeners() {
        const addScriptBtn = document.getElementById('addScriptBtn');
        const addScriptFolderBtn = document.getElementById('addScriptFolderBtn');
        const renameScriptBtn = document.getElementById('renameScriptBtn');
        const deleteScriptBtn = document.getElementById('deleteScriptBtn');
        
        if (addScriptBtn) {
            addScriptBtn.addEventListener('click', () => {
                showDialog('New Script', 'Enter script name:', 'MyScript', (name) => {
                    if (!name) return;
                    
                    // Check for duplicate name
                    if (scripts.some(script => script.name === name)) {
                        alert(`A script with name "${name}" already exists. Please use a unique name.`);
                        return;
                    }
                    
                    addScript(name);
                });
            });
        }
        
        if (addScriptFolderBtn) {
            addScriptFolderBtn.addEventListener('click', () => {
                showDialog('New Script Folder', 'Enter folder name:', 'ScriptFolder', (name) => {
                    if (!name) return;
                    
                    addFolder(name);
                });
            });
        }
        
        if (renameScriptBtn) {
            renameScriptBtn.addEventListener('click', () => {
                if (!selectedScript) return;
                
                const item = scripts.find(s => s.id === selectedScript) || 
                            scriptFolders.find(f => f.id === selectedScript);
                
                if (item) {
                    showDialog('Rename', 'Enter new name:', item.name, (name) => {
                        if (!name) return;
                        
                        // Check for duplicate names for scripts (not folders)
                        if (item.type === 'script' && scripts.some(s => s.id !== item.id && s.name === name)) {
                            alert(`A script with name "${name}" already exists. Please use a unique name.`);
                            return;
                        }
                        
                        item.name = name;
                        renderScriptsList();
                        scriptName.textContent = item.type === 'script' ? item.name : 'Folder: ' + item.name;
                    });
                }
            });
        }
        
        if (deleteScriptBtn) {
            deleteScriptBtn.addEventListener('click', () => {
                if (!selectedScript) return;
                
                const isFolder = scriptFolders.some(f => f.id === selectedScript);
                
                if (isFolder) {
                    if (confirm('Delete this folder and all contained scripts?')) {
                        const folderToRemove = scriptFolders.find(f => f.id === selectedScript);
                        if (folderToRemove) {
                            // Remove all scripts in this folder
                            scripts = scripts.filter(s => s.folderId !== selectedScript);
                            scriptFolders = scriptFolders.filter(f => f.id !== selectedScript);
                            selectedScript = null;
                            updateScriptDetailView();
                            renderScriptsList();
                        }
                    }
                } else {
                    if (confirm('Delete this script?')) {
                        scripts = scripts.filter(s => s.id !== selectedScript);
                        selectedScript = null;
                        updateScriptDetailView();
                        renderScriptsList();
                    }
                }
            });
        }
    }
    
    /**
     * Add a new script
     * @param {string} name - Script name
     * @param {string} [code] - Optional initial code
     * @param {string} [folderId] - Optional folder ID to place the script in
     * @returns {Object} - The created script object
     */
    function addScript(name, code, folderId = null) {
        const defaultCode = `/**
 * ${name} Script Functions
 * You can define functions here that can be called from your game objects
 */

/**
 * Example function
 * 
 * @param {number} param1 - First parameter
 * @param {number} param2 - Second parameter
 * @returns {number} - The result
 */
function ${name.toLowerCase()}_example(param1, param2) {
    return param1 + param2;
}
`;
        
        const newScript = {
            id: generateId(),
            name: name,
            type: 'script',
            code: code || defaultCode,
            folderId: folderId
        };
        
        scripts.push(newScript);
        renderScriptsList();
        selectScript(newScript.id);
        
        return newScript;
    }
    
    /**
     * Add a new folder for organizing scripts
     * @param {string} name - Folder name
     * @returns {Object} - The created folder object
     */
    function addFolder(name) {
        const newFolder = {
            id: generateId(),
            name: name,
            type: 'folder',
            collapsed: false
        };
        
        scriptFolders.push(newFolder);
        renderScriptsList();
        
        return newFolder;
    }
    
    /**
     * Add default utility script as an example
     */
    function addDefaultScript() {
        addScript('Utilities', `/**
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

/**
 * Check if a point is inside a rectangle
 * 
 * @param {number} px - Point X coordinate
 * @param {number} py - Point Y coordinate
 * @param {number} rx - Rectangle top-left X
 * @param {number} ry - Rectangle top-left Y
 * @param {number} rw - Rectangle width
 * @param {number} rh - Rectangle height
 * @returns {boolean} - True if point is inside rectangle
 */
function util_point_in_rect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

/**
 * Clamp a value between min and max
 * 
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum bound
 * @param {number} max - Maximum bound
 * @returns {number} - Clamped value
 */
function util_clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 * 
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} - Interpolated value
 */
function util_lerp(a, b, t) {
    return a + (b - a) * util_clamp(t, 0, 1);
}
`);
    }
    
    /**
     * Render the scripts list UI
     */
    function renderScriptsList() {
        if (!scriptsList) return;
        
        scriptsList.innerHTML = '';
        
        // Render standalone scripts first (not in any folder)
        scripts
            .filter(script => !script.folderId)
            .forEach(script => {
                const scriptEl = createScriptElement(script);
                scriptsList.appendChild(scriptEl);
            });
        
        // Render folders and their scripts
        scriptFolders.forEach(folder => {
            const folderEl = createScriptFolderElement(folder);
            scriptsList.appendChild(folderEl);
            
            const folderContents = document.createElement('div');
            folderContents.className = 'folder-contents';
            folderContents.setAttribute('data-parent', folder.id);
            folderContents.style.display = folder.collapsed ? 'none' : 'block';
            
            // Add scripts that belong to this folder
            scripts
                .filter(script => script.folderId === folder.id)
                .forEach(script => {
                    const scriptEl = createScriptElement(script);
                    folderContents.appendChild(scriptEl);
                });
            
            scriptsList.appendChild(folderContents);
        });
    }
    
    /**
     * Create a script element for the UI
     * @param {Object} script - Script object
     * @returns {HTMLElement} - The created script element
     */
    function createScriptElement(script) {
        const scriptEl = document.createElement('div');
        scriptEl.className = 'script-item';
        scriptEl.textContent = script.name;
        scriptEl.setAttribute('data-id', script.id);
        
        if (selectedScript === script.id) {
            scriptEl.classList.add('selected');
        }
        
        scriptEl.addEventListener('click', () => selectScript(script.id));
        
        // Add drag and drop functionality
        scriptEl.draggable = true;
        scriptEl.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                id: script.id,
                type: 'script'
            }));
        });
        
        return scriptEl;
    }
    
    /**
     * Create a folder element for the UI
     * @param {Object} folder - Folder object
     * @returns {HTMLElement} - The created folder element
     */
    function createScriptFolderElement(folder) {
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
            const folderContents = document.querySelector(`.folder-contents[data-parent="${folder.id}"]`);
            if (folderContents) {
                folderContents.style.display = folder.collapsed ? 'none' : 'block';
            }
        });
        
        folderNameEl.appendChild(toggleIcon);
        folderNameEl.innerHTML += `📁 ${folder.name}`;
        folderEl.appendChild(folderNameEl);
        
        // Handle selection
        folderEl.addEventListener('click', () => selectScript(folder.id));
        
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
                if (data.type === 'script') {
                    const script = scripts.find(s => s.id === data.id);
                    if (script) {
                        script.folderId = folder.id;
                        renderScriptsList();
                    }
                }
            } catch (err) {
                console.error('Error processing drop:', err);
            }
        });
        
        return folderEl;
    }
    
    /**
     * Select a script or folder
     * @param {string} id - Script or folder ID
     */
    function selectScript(id) {
        selectedScript = id;
        
        // Find if it's a script or folder
        const script = scripts.find(s => s.id === id);
        const folder = scriptFolders.find(f => f.id === id);
        
        // Clear selected state from all items
        document.querySelectorAll('.script-item, .folder-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selected state to the clicked item
        const selectedItem = document.querySelector(`[data-id="${id}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
        
        updateScriptDetailView(script, folder);
    }
    
    /**
     * Update the detail view for selected script or folder
     * @param {Object} script - Selected script or undefined
     * @param {Object} folder - Selected folder or undefined
     */
    function updateScriptDetailView(script, folder) {
        if (!script && !folder) {
            scriptName.textContent = 'No Script Selected';
            scriptActions.style.display = 'none';
            noScriptSelected.style.display = 'flex';
            scriptEditArea.style.display = 'none';
            return;
        }
        
        scriptActions.style.display = 'flex';
        noScriptSelected.style.display = 'none';
        
        if (script) {
            // Show script details
            scriptName.textContent = script.name;
            scriptEditArea.style.display = 'flex';
            
            // Set script code to editor
            scriptEditor.setValue(script.code || '');
            
            // Refresh editor
            setTimeout(() => scriptEditor.refresh(), 1);
            
        } else if (folder) {
            // Show folder details
            scriptName.textContent = 'Folder: ' + folder.name;
            scriptEditArea.style.display = 'none';
            noScriptSelected.style.display = 'flex';
            noScriptSelected.innerHTML = `
                <p>Folder: ${folder.name}</p>
                <p style="font-size: 0.9em; margin-top: 10px;">
                    Drag scripts to this folder to organize them.
                </p>
            `;
        }
    }
    
    /**
     * Generate code from all scripts for inclusion in game
     * @returns {string} - Combined script code
     */
    function generateScriptsCode() {
        let code = '// ===== BEGIN SCRIPTS =====\n\n';
        
        scripts.forEach(script => {
            code += `// Script: ${script.name}\n`;
            code += script.code;
            code += '\n\n';
        });
        
        code += '// ===== END SCRIPTS =====\n\n';
        return code;
    }
    
    /**
     * Set scripts data (used when loading a project)
     * @param {Array} scriptsData - Array of script objects
     * @param {Array} foldersData - Array of folder objects
     */
    function setScriptsData(scriptsData, foldersData) {
        scripts = scriptsData || [];
        scriptFolders = foldersData || [];
        
        // Reset selection state
        selectedScript = null;
        
        // Update UI
        renderScriptsList();
        updateScriptDetailView();
    }
    
    /**
     * Get scripts data for saving
     * @returns {Object} - Object containing scripts and folders arrays
     */
    function getScriptsData() {
        return {
            scripts: scripts,
            scriptFolders: scriptFolders
        };
    }
    
    /**
     * Refresh the script editor (needed when switching tabs)
     */
    function refresh() {
        if (scriptEditor) {
            scriptEditor.refresh();
        }
    }
    
    // Public API
    return {
        init,
        generateScriptsCode,
        setScriptsData,
        getScriptsData,
        refresh,
        addScript,
        addFolder
    };
})();

// Make the module globally available
window.ScriptEditor = ScriptEditor;
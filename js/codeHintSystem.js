/**
 * Code Hint System
 * Provides real-time hints and documentation for CodeMirror editors
 */
const CodeHintSystem = (function() {
    // Private variables
    let activeEditor = null;
    let hintPanel = null;
    let resizeHandle = null;
    let helpButton = null;
    let lastWord = "";
    let lastTokens = [];
    let panelHeight = 150; // Default height
    let isDragging = false;
    let isInitialized = false;
    
    /**
     * Initialize the code hint system
     * @param {Object} editor - CodeMirror editor instance
     */
    function init(editor) {
        console.log("CodeHintSystem.init called for editor");
        
        // Prevent multiple initializations on the same editor
        if (editor._hintSystemInitialized) {
            console.log("Editor already has hint system initialized, returning API");
            return {
                refresh: function() { updateHints(); },
                resize: function(height) { setPanelHeight(height); },
                hide: function() { 
                    const container = editor.getWrapperElement().nextElementSibling;
                    if (container && container.classList.contains('code-hint-container')) {
                        container.style.display = 'none';
                    }
                },
                show: function() {
                    const container = editor.getWrapperElement().nextElementSibling;
                    if (container && container.classList.contains('code-hint-container')) {
                        container.style.display = 'block';
                    }
                },
                updateHints: updateHints  // Explicitly expose updateHints
            };
        }
        
        activeEditor = editor;
        
        // Create a unique ID for this editor instance
        const editorId = 'editor_' + Math.random().toString(36).substring(2, 10);
        editor._hintId = editorId;
        editor._hintSystemInitialized = true;
        
        // Check if this editor already has a hint panel
        const wrapper = editor.getWrapperElement();
        let panelContainer = wrapper.nextElementSibling;
        if (!panelContainer || !panelContainer.classList.contains('code-hint-container')) {
            // Create the hint panel for this editor
            panelContainer = createHintPanel(wrapper);
        }
        
        // Store reference to this panel
        hintPanel = panelContainer.querySelector('.code-hint-panel');
        resizeHandle = panelContainer.querySelector('.code-hint-resize-handle');
        helpButton = panelContainer.querySelector('.code-hint-help-button');
        
        // Set up event listeners for editor
        setupEditorEvents(editor);
        
        // Initialize with current cursor position
        updateHints();
        
        // Mark as initialized
        isInitialized = true;
        
        // Show welcome message
        showWelcomeMessage();
        
        // Return API object
        return {
            refresh: function() { updateHints(); },
            resize: function(height) { setPanelHeight(height); },
            hide: function() { 
                if (panelContainer) panelContainer.style.display = 'none'; 
            },
            show: function() { 
                if (panelContainer) panelContainer.style.display = 'block'; 
            },
            updateHints: updateHints  // Explicitly expose updateHints
        };
    }
    
    /**
     * Show welcome message with basic instructions
     */
    function showWelcomeMessage() {
        if (!hintPanel) return;
        
        const content = `
            <div class="hint-section">
                <div class="hint-section-title">Code Hints Active</div>
                <p>Type any letter to see code suggestions.</p>
                <p>Type a function name followed by <code>(</code> to see parameter help.</p>
                <p>Click on any suggestion to insert it at cursor position.</p>
                <p>Press <code>Ctrl+Space</code> for manual suggestions.</p>
            </div>
            
            <div class="hint-section">
                <div class="hint-section-title">Try Typing:</div>
                <div class="keyword-list">
                    <span class="hint-item function" data-text="draw_" 
                        onclick="CodeHintSystem.insertCompletion('draw_')">
                        draw_
                    </span>
                    <span class="hint-item function" data-text="keyboard_" 
                        onclick="CodeHintSystem.insertCompletion('keyboard_')">
                        keyboard_
                    </span>
                    <span class="hint-item constant" data-text="c_" 
                        onclick="CodeHintSystem.insertCompletion('c_')">
                        c_
                    </span>
                </div>
            </div>
        `;
        
        hintPanel.innerHTML = content;
    }

    /**
     * Delayed update to avoid too many updates
     */
    function delayedUpdateHints() {
        if (window.hintUpdateTimeout) {
            clearTimeout(window.hintUpdateTimeout);
        }
        // Reduce delay from 300ms to 50ms for more responsive updates
        window.hintUpdateTimeout = setTimeout(updateHints, 50);
    }

    /**
     * Set up event listeners for editor interactions
     * @param {Object} editor - CodeMirror editor instance
     */
    function setupEditorEvents(editor) {
        // Update hints on cursor movement
        editor.on('cursorActivity', delayedUpdateHints);
        
        // Update when content changes - this is key for showing hints during typing
        editor.on('changes', delayedUpdateHints);
        
        // Add direct input handler for more immediate updates
        editor.on('inputRead', function(cm, change) {
            updateHints(); // Update immediately on input
        });
        
        // Handle editor focus events
        editor.on('focus', () => {
            activeEditor = editor;
            updateHints();
        });
    }
    
    /**
     * Create the hint panel and append it to the editor
     * @param {HTMLElement} editorWrapper - The editor wrapper element
     */
    function createHintPanel(editorWrapper) {
        console.log("Creating hint panel for editor wrapper");

        // Make sure the editor wrapper exists
        if (!editorWrapper) {
            console.error("Editor wrapper is null or undefined");
            return null;
        }
        
        // Create container for the hint panel
        const container = document.createElement('div');
        container.className = 'code-hint-container';
        container.id = 'codeHintPanel_' + Math.random().toString(36).substring(2, 10); // Use unique ID
        container.style.display = 'block'; // Ensure visibility
        
        // Create the resize handle
        resizeHandle = document.createElement('div');
        resizeHandle.className = 'code-hint-resize-handle';
        
        // Create the panel content area
        hintPanel = document.createElement('div');
        hintPanel.className = 'code-hint-panel';
        
        // Create the help button (question mark)
        helpButton = document.createElement('div');
        helpButton.className = 'code-hint-help-button';
        helpButton.innerHTML = '?';
        helpButton.title = 'Click to view full documentation';
        
        // Append elements
        container.appendChild(resizeHandle);
        container.appendChild(hintPanel);
        container.appendChild(helpButton);
        
        // Set initial height
        container.style.height = panelHeight + 'px';
        container.style.width = editorWrapper.offsetWidth + 'px';
        
        // Make sure the container is positioned correctly relative to the editor
        container.style.width = '100%';
        
        // Add the container directly after the editor wrapper
        //if (editorWrapper.nextSibling) {
        //    editorWrapper.parentNode.insertBefore(container, editorWrapper.nextSibling);
        //} else {
            editorWrapper.parentNode.appendChild(container);
        //}
        
        console.log("Hint panel created:", container);
        
        // Add resize functionality
        setupResizeHandling();
        
        // Add help button click handler
        helpButton.addEventListener('click', showDocumentationModal);
        
        return container;
    }
    
    /**
     * Set up event listeners for editor interactions
     * @param {Object} editor - CodeMirror editor instance
     */
    function setupEditorEvents(editor) {
        // Update hints on cursor movement
        editor.on('cursorActivity', delayedUpdateHints);
        
        // Update when content changes
        editor.on('changes', delayedUpdateHints);
        
        // Handle editor focus events
        editor.on('focus', () => {
            activeEditor = editor;
            updateHints();
        });
    }
    
    /**
     * Delayed update to avoid too many updates
     */
    function delayedUpdateHints() {
        if (window.hintUpdateTimeout) {
            clearTimeout(window.hintUpdateTimeout);
        }
        window.hintUpdateTimeout = setTimeout(updateHints, 300);
    }
    
    /**
     * Update the hint panel with relevant information based on cursor position
     */
    function updateHints() {
        if (!activeEditor || !hintPanel) {
            console.warn("Cannot update hints: activeEditor or hintPanel is null");
            return;
        }
        
        // Get the container and ensure it's visible
        const container = hintPanel.closest('.code-hint-container');
        if (container) {
            container.style.display = 'block';
        }
        
        const cursor = activeEditor.getCursor();
        const line = activeEditor.getLine(cursor.line);
        
        // Get the word at or before cursor
        const wordAtCursor = getWordAtCursor(line, cursor.ch);
        lastWord = wordAtCursor;
        
        // Determine if we're inside function parameters
        const functionContext = getFunctionContext(line, cursor.ch);
        
        // Find matching hints based on context
        if (functionContext) {
            // We're inside a function call, show parameter help
            showFunctionParameterHelp(functionContext);
        } else if (wordAtCursor && wordAtCursor.length > 0) {
            // We have a partial word, find matching keywords
            const matchingKeywords = findMatchingKeywords(wordAtCursor);
            showMatchingKeywords(matchingKeywords);
        } else {
            // Default view
            showDefaultHints();
        }
    }
    
    /**
     * Show parameter help for a function
     */
    function showFunctionParameterHelp(functionContext) {
        const funcDoc = window.getFunctionDocs ? window.getFunctionDocs(functionContext.functionName) : null;
        
        if (!funcDoc) {
            showDefaultHints();
            return;
        }
        
        let content = `
            <div class="hint-section">
                <div class="hint-section-title">Function Help</div>
                ${generateFunctionDetailHtml(funcDoc, functionContext.paramIndex)}
            </div>
        `;
        
        hintPanel.innerHTML = content;
    }
    
    /**
     * Show matching keywords
     */
    function showMatchingKeywords(keywords) {
        if (!keywords || keywords.length === 0) {
            showDefaultHints();
            return;
        }
        
        let content = `
            <div class="hint-section">
                <div class="hint-section-title">Matching Keywords (${keywords.length})</div>
                <div class="keyword-list">
                    ${keywords.map(keyword => `
                        <span class="hint-item ${keyword.type || ''}" 
                            data-text="${keyword.text}" 
                            onclick="CodeHintSystem.insertCompletion('${keyword.text}')">
                            ${keyword.text}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
        
        // If there's a function in the results, show its details first
        const firstFunction = keywords.find(k => k.type === 'function');
        if (firstFunction) {
            const funcDoc = window.getFunctionDocs ? window.getFunctionDocs(firstFunction.text) : null;
            if (funcDoc) {
                content += generateFunctionDetailHtml(funcDoc);
            }
        }
        
        hintPanel.innerHTML = content;
    }
    
    /**
     * Show default hints when no specific context
     */
    function showDefaultHints() {
        const commonFunctions = [
            { text: 'draw_rectangle', type: 'function' },
            { text: 'draw_text', type: 'function' },
            { text: 'keyboard_check', type: 'function' },
            { text: 'instance_create', type: 'function' },
            { text: 'point_distance', type: 'function' }
        ];
        
        let content = `
            <div class="hint-section">
                <div class="hint-section-title">Code Hints</div>
                <p>Type to see suggestions for functions, properties, and keywords.</p>
            </div>
            
            <div class="hint-section">
                <div class="hint-section-title">Common Functions</div>
                <div class="keyword-list">
                    ${commonFunctions.map(func => `
                        <span class="hint-item function" 
                            data-text="${func.text}" 
                            onclick="CodeHintSystem.insertCompletion('${func.text}')">
                            ${func.text}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
        
        hintPanel.innerHTML = content;
    }
    
    /**
     * Parse the code context to understand what the user is typing
     * @param {string} line - Current line of code
     * @param {number} cursorPos - Cursor position in the line
     * @returns {Array} - Array of tokens
     */
    function parseCodeContext(line, cursorPos) {
        // Simple tokenization for JavaScript
        const tokens = [];
        let currentToken = '';
        let inString = false;
        let stringChar = '';
        
        // Only process up to cursor position
        const relevantPart = line.substring(0, cursorPos);
        
        for (let i = 0; i < relevantPart.length; i++) {
            const char = relevantPart[i];
            
            // Handle strings
            if ((char === '"' || char === "'") && (i === 0 || relevantPart[i-1] !== '\\')) {
                if (!inString) {
                    // Starting a new string
                    if (currentToken) {
                        tokens.push({type: 'identifier', value: currentToken});
                        currentToken = '';
                    }
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    // Ending the string
                    tokens.push({type: 'string', value: currentToken});
                    currentToken = '';
                    inString = false;
                } else {
                    // Inside string
                    currentToken += char;
                }
                continue;
            }
            
            if (inString) {
                currentToken += char;
                continue;
            }
            
            // Handle other tokens
            if (/[a-zA-Z0-9_$]/.test(char)) {
                // Part of identifier
                currentToken += char;
            } else {
                if (currentToken) {
                    tokens.push({type: 'identifier', value: currentToken});
                    currentToken = '';
                }
                
                if (char.trim()) {
                    // Operators and punctuation
                    if (".,(){}[]+-*/=&|<>!?:;".includes(char)) {
                        tokens.push({type: 'operator', value: char});
                    }
                }
            }
        }
        
        // Add final token if any
        if (currentToken) {
            tokens.push({type: inString ? 'string' : 'identifier', value: currentToken});
        }
        
        return tokens;
    }
    
    /**
     * Get the word at or just before the cursor
     * @param {string} line - Current line of code
     * @param {number} cursorPos - Cursor position
     * @returns {string} - The word at cursor
     */
    function getWordAtCursor(line, cursorPos) {
        // Find the word boundary
        let start = cursorPos;
        while (start > 0 && /[a-zA-Z0-9_$]/.test(line.charAt(start - 1))) {
            start--;
        }
        
        // Extract the word
        return line.substring(start, cursorPos);
    }
    
    /**
     * Find matching keywords based on current word
     * @param {string} word - Current word or prefix
     * @returns {Array} - Matching keywords
     */
    function findMatchingKeywords(word) {
        if (!word) return [];
        
        // Make sure keywords are available
        ensureKeywordsAvailable();
        
        // Use our keyword completions
        const allKeywords = window.getKeywordCompletions ? window.getKeywordCompletions() : [];
        
        // Filter keywords that match the current word (case insensitive)
        return allKeywords.filter(keyword => 
            keyword.text.toLowerCase().startsWith(word.toLowerCase())
        );
    }
    
    /**
     * Ensure we have keywords available
     */
    function ensureKeywordsAvailable() {
        if (typeof window.getKeywordCompletions !== 'function' || 
            !Array.isArray(window.getKeywordCompletions())) {
            
            console.warn("Keywords not properly initialized. Setting up defaults.");
            
            // Set up default keywords if not available
            window.getKeywordCompletions = function() {
                return [
                    { text: 'draw_rectangle', type: 'function' },
                    { text: 'draw_text', type: 'function' },
                    { text: 'draw_sprite', type: 'function' },
                    { text: 'keyboard_check', type: 'function' },
                    { text: 'keyboard_check_pressed', type: 'function' },
                    { text: 'instance_create', type: 'function' },
                    { text: 'object_add', type: 'function' },
                    { text: 'draw_set_color', type: 'function' },
                    { text: 'c_white', type: 'constant' },
                    { text: 'c_black', type: 'constant' },
                    { text: 'c_red', type: 'constant' },
                    { text: 'c_green', type: 'constant' },
                    { text: 'c_blue', type: 'constant' },
                    { text: 'c_yellow', type: 'constant' },
                    { text: 'room_width', type: 'property' },
                    { text: 'room_height', type: 'property' }
                ];
            };
        }
    }
    
    /**
     * Check if cursor is inside function parameters and extract function name
     * @param {string} line - Current line of code
     * @param {number} cursorPos - Cursor position
     * @returns {Object|null} - Function context or null
     */
    function getFunctionContext(line, cursorPos) {
        // Find if we're inside parentheses
        let openParenPos = -1;
        let paramIndex = 0;
        let nestingLevel = 0;
        
        // Scan backward from cursor to find the opening parenthesis
        for (let i = cursorPos - 1; i >= 0; i--) {
            if (line[i] === ')') nestingLevel++;
            if (line[i] === '(') {
                nestingLevel--;
                if (nestingLevel === -1) {
                    openParenPos = i;
                    break;
                }
            }
            
            // Count commas at the current nesting level to determine parameter index
            if (nestingLevel === 0 && line[i] === ',') {
                paramIndex++;
            }
        }
        
        if (openParenPos === -1) return null; // Not inside function params
        
        // Extract function name (identifier before parenthesis)
        let funcNameEnd = openParenPos;
        let funcNameStart = funcNameEnd;
        
        while (funcNameStart > 0 && /[a-zA-Z0-9_$]/.test(line[funcNameStart - 1])) {
            funcNameStart--;
        }
        
        const functionName = line.substring(funcNameStart, funcNameEnd);
        if (!functionName) return null;
        
        // Extract all parameters text
        const paramsText = line.substring(openParenPos + 1, cursorPos);
        
        return {
            functionName: functionName,
            paramIndex: paramIndex,
            paramsText: paramsText
        };
    }
    
    /**
     * Generate HTML for function details
     * @param {Object} func - Function documentation object
     * @param {number} highlightParam - Index of parameter to highlight
     * @returns {string} - HTML content
     */
    function generateFunctionDetailHtml(func, highlightParam = -1) {
        if (!func) return '';
        
        let html = `<div class="hint-function-details">
            <div class="hint-function-signature">${func.name}(`;
        
        // Format the parameter list with highlighting
        if (func.parameters && func.parameters.length) {
            html += func.parameters.map((param, index) => {
                if (index === highlightParam) {
                    return `<span class="current-param">${param.name}</span>`;
                }
                return param.name;
            }).join(', ');
        }
        
        html += `)</div>
            <div class="hint-function-description">${func.description || 'No description available'}</div>`;
        
        // Add parameters section if available
        if (func.parameters && func.parameters.length) {
            html += `<div class="hint-parameters">`;
            func.parameters.forEach((param, index) => {
                const highlightClass = (index === highlightParam) ? 'current-param' : '';
                html += `<span class="hint-param ${highlightClass}">
                    <span class="param-name">${param.name}</span>: 
                    <span class="param-type">${param.type || 'any'}</span> - ${param.description || 'No description'}
                </span>`;
            });
            html += `</div>`;
        }
        
        // Add return value if available
        if (func.returns) {
            html += `<div class="hint-return">
                <strong>Returns:</strong> ${func.returns}
            </div>`;
        }
        
        html += `</div>`;
        return html;
    }
    
    /**
     * Show the documentation modal with all functions
     */
    function showDocumentationModal() {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'doc-modal-overlay';
        
        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'doc-modal';
        
        // Make sure keywords are available
        ensureKeywordsAvailable();
        
        // Get all documentation entries
        const allDocs = window.getKeywordCompletions ? window.getKeywordCompletions() : [];
        
        // Group by categories
        const categories = {};
        allDocs.forEach(doc => {
            const type = doc.type || 'other';
            if (!categories[type]) categories[type] = [];
            categories[type].push(doc);
        });
        
        // Create modal content
        modal.innerHTML = `
            <div class="doc-modal-header">
                <div class="doc-modal-title">Function Reference</div>
                <button class="doc-modal-close">&times;</button>
            </div>
            
            <div class="doc-search-container">
                <input type="text" class="doc-search-input" placeholder="Search functions...">
            </div>
            
            <div class="doc-modal-content">
                <div class="doc-modal-sidebar">
                    ${Object.keys(categories).map(category => `
                        <div class="doc-category">
                            <div class="doc-category-title">${capitalize(category)}s</div>
                            <ul class="doc-function-list" data-category="${category}">
                                ${categories[category].map(doc => `
                                    <li class="doc-function-item" data-name="${doc.text}">${doc.text}</li>
                                `).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
                
                <div class="doc-modal-body">
                    <div class="doc-function-detail">
                        <p>Select a function from the list to view its documentation.</p>
                    </div>
                </div>
            </div>
        `;
        
        // Append to document
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Add event listeners
        const closeBtn = modal.querySelector('.doc-modal-close');
        closeBtn.addEventListener('click', () => document.body.removeChild(overlay));
        
        // Allow closing with ESC key
        document.addEventListener('keydown', function closeOnEsc(e) {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', closeOnEsc);
            }
        });
        
        // Select function to show details
        const functionItems = modal.querySelectorAll('.doc-function-item');
        const modalBody = modal.querySelector('.doc-modal-body');
        
        functionItems.forEach(item => {
            item.addEventListener('click', () => {
                // Remove selected class from all items
                functionItems.forEach(i => i.classList.remove('selected'));
                
                // Add selected class to clicked item
                item.classList.add('selected');
                
                // Show function details
                const funcName = item.getAttribute('data-name');
                const funcDoc = window.getFunctionDocs ? window.getFunctionDocs(funcName) : null;
                
                if (funcDoc) {
                    modalBody.innerHTML = generateFullDocHtml(funcDoc);
                } else {
                    // Simple doc for functions without full documentation
                    modalBody.innerHTML = `
                        <div class="doc-function-detail">
                            <h2 class="doc-function-name">${funcName}</h2>
                            <div class="doc-function-description">
                                No detailed documentation available for this function.
                            </div>
                        </div>
                    `;
                }
            });
        });
        
        // Search functionality
        const searchInput = modal.querySelector('.doc-search-input');
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            
            if (!searchTerm) {
                // Show all functions when search is empty
                functionItems.forEach(item => {
                    item.style.display = '';
                    item.innerHTML = item.getAttribute('data-name');
                });
                return;
            }
            
            // Filter and highlight matching functions
            functionItems.forEach(item => {
                const funcName = item.getAttribute('data-name').toLowerCase();
                
                if (funcName.includes(searchTerm)) {
                    item.style.display = '';
                    
                    // Highlight the matching part
                    const highlightedName = item.getAttribute('data-name')
                        .replace(new RegExp(searchTerm, 'gi'), match => 
                            `<span class="search-highlight">${match}</span>`
                        );
                    item.innerHTML = highlightedName;
                } else {
                    item.style.display = 'none';
                }
            });
            
            // Update category visibility
            Object.keys(categories).forEach(category => {
                const list = modal.querySelector(`.doc-function-list[data-category="${category}"]`);
                const categoryEl = list.parentElement;
                
                // Count visible items
                const visibleItems = Array.from(list.querySelectorAll('li'))
                    .filter(li => li.style.display !== 'none').length;
                
                // Hide empty categories
                categoryEl.style.display = visibleItems === 0 ? 'none' : '';
            });
        });
        
        // Focus search input
        searchInput.focus();
    }
    
    /**
     * Generate full documentation HTML for modal view
     * @param {Object} func - Function documentation object
     * @returns {string} - HTML content
     */
    function generateFullDocHtml(func) {
        if (!func) return '<p>Documentation not found.</p>';
        
        let html = `<div class="doc-function-detail">
            <h2 class="doc-function-name">${func.name}</h2>
            <div class="doc-function-description">${func.description || 'No description available'}</div>`;
        
        // Add parameters section if available
        if (func.parameters && func.parameters.length) {
            html += `<div class="doc-function-params">
                <h3>Parameters</h3>
                <ul>`;
                
            func.parameters.forEach(param => {
                html += `<li class="doc-param-item">
                    <span class="doc-param-name">${param.name}</span>
                    <span class="doc-param-type">(${param.type || 'any'})</span>: 
                    ${param.description || 'No description'}
                </li>`;
            });
            
            html += `</ul></div>`;
        }
        
        // Add return value if available
        if (func.returns) {
            html += `<div class="doc-function-return">
                <h3>Returns</h3>
                <p>${func.returns}</p>
            </div>`;
        }
        
        // Add example if available
        if (func.example) {
            html += `<div class="doc-function-example-section">
                <h3>Example</h3>
                <pre class="doc-function-example">${func.example}</pre>
            </div>`;
        }
        
        html += `</div>`;
        return html;
    }
    
    /**
     * Insert the selected completion into the editor
     * @param {string} text - Text to insert
     */
    function insertCompletion(text) {
        if (!activeEditor || !lastWord) return;
        
        const cursor = activeEditor.getCursor();
        const line = activeEditor.getLine(cursor.line);
        
        // Find the start position of the word we're replacing
        let start = cursor.ch;
        while (start > 0 && /[a-zA-Z0-9_$]/.test(line.charAt(start - 1))) {
            start--;
        }
        
        // Replace the word with the completion
        activeEditor.replaceRange(text, {line: cursor.line, ch: start}, cursor);
        
        // Focus editor
        activeEditor.focus();
    }
    
    /**
     * Set up event handlers for resizing the panel
     */
    function setupResizeHandling() {
        if (!resizeHandle) return;
        
        resizeHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            e.preventDefault();
            
            // Store initial values
            const startY = e.clientY;
            const startHeight = panelHeight;
            
            // Handle mouse move for resizing
            function onMouseMove(e) {
                if (!isDragging) return;
                
                // Calculate new height (moving up decreases height)
                const newHeight = Math.max(50, startHeight - (e.clientY - startY));
                setPanelHeight(newHeight);
                
                // Prevent text selection during resize
                e.preventDefault();
            }
            
            // Handle mouse up to stop resizing
            function onMouseUp() {
                isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
            
            // Add document-level event listeners
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }
    
    /**
     * Set the height of the hint panel
     * @param {number} height - Height in pixels
     */
    function setPanelHeight(height) {
        panelHeight = height;
        
        // Find all hint panels
        const panels = document.querySelectorAll('.code-hint-container');
        panels.forEach(panel => {
            panel.style.height = panelHeight + 'px';
        });
    }
    
    /**
     * Helper function to capitalize first letter of string
     * @param {string} str - String to capitalize
     * @returns {string} - Capitalized string
     */
    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    // Public API
    return {
        init,
        insertCompletion,
        updateHints
    };
})();

// Make the insertCompletion function available globally
window.CodeHintSystem = CodeHintSystem;
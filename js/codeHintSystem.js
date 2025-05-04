/**
 * Code Hint System
 * Provides real-time hints and documentation for CodeMirror editors
 */
const CodeHintSystem = (function() {
    // Private variables
    let activeEditor = null;
    let hintPanel = null;
    let lastWord = "";
    let isInitialized = false;
    let panelHeight = 200; // Default height
    
    /**
     * Initialize the code hint system
     * @param {Object} editor - CodeMirror editor instance
     */
    function init(editor) {
        console.log("CodeHintSystem.init called for editor");
        
        // Clean up any existing panels for this editor first
        cleanupExistingPanels(editor);
        
        // Prevent multiple initializations on the same editor
        if (editor._hintSystemInitialized) {
            console.log("Editor already has hint system initialized");
            return createAPI();
        }
        
        activeEditor = editor;
        
        // Create a unique ID for this editor instance
        const editorId = 'editor_' + Math.random().toString(36).substring(2, 10);
        editor._hintId = editorId;
        editor._hintSystemInitialized = true;
    
        // Create the hint panel for this editor
        createHintPanel(editor);
        
        // Set up event listeners for editor
        setupEditorEvents(editor);
        
        // Make sure keywords are available
        ensureKeywordsAvailable();
        
        // Initialize with current cursor position
        updateHints();
        
        // Mark as initialized
        isInitialized = true;
        
        // Show welcome message
        showWelcomeMessage();
        
        // Return API object
        return createAPI();
    }
    
    /**
     * Create the public API
     */
    function createAPI() {
        return {
            refresh: function() {
                updateHints();
            },
            resize: function(height) {
                setPanelHeight(height);
            },
            hide: hidePanel,
            show: showPanel,
            updateHints: updateHints,
            getPanel: function() {
                return hintPanel;
            }
        };
    }

    function cleanupExistingPanels(editor) {
        const wrapper = editor.getWrapperElement();
        if (!wrapper) return;
    
        const container = wrapper.closest('.editor-container');
        if (!container) return;
    
        // Remove any existing hint containers
        const existingContainers = container.querySelectorAll('.code-hint-container');
        existingContainers.forEach(container => container.remove());
    
        // Remove any existing resizers
        const existingResizers = container.querySelectorAll('.resizer');
        existingResizers.forEach(resizer => resizer.remove());
    
        // Reset the editor's initialization flag
        editor._hintSystemInitialized = false;
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
     * Create the hint panel and append it to the editor
     * @param {Object} editor - CodeMirror editor instance
     */
    function createHintPanel(editor) {
        // Find or create the editor container
        let container = editor.getWrapperElement().closest('.editor-container');
        if (!container) {
            // Create new container structure
            container = document.createElement('div');
            container.className = 'editor-container';
            
            // Move the editor into the container
            const editorWrapper = editor.getWrapperElement();
            editorWrapper.parentNode.insertBefore(container, editorWrapper);
            container.appendChild(editorWrapper);
        }
    
        // Create or find resizer
        let resizer = container.querySelector('.resizer');
        if (!resizer) {
            resizer = document.createElement('div');
            resizer.className = 'resizer';
            container.appendChild(resizer);
        }
    
        // Create or find hint container
        let hintContainer = container.querySelector('.code-hint-container');
        if (!hintContainer) {
            hintContainer = document.createElement('div');
            hintContainer.className = 'code-hint-container';
            container.appendChild(hintContainer);
        }
    
        // Create or find hint panel
        let panel = hintContainer.querySelector('.code-hint-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.className = 'code-hint-panel';
            hintContainer.appendChild(panel);
        }
    
        // Store reference to the hint panel
        hintPanel = panel;
    
        // Initialize resizer functionality
        initializeResizer(editor);
    
        return panel;
    }

    function initializeResizer(editor) {
        const container = editor.getWrapperElement().closest('.editor-container');
        if (!container) return;
    
        const resizer = container.querySelector('.resizer');
        const hintContainer = container.querySelector('.code-hint-container');
        if (!resizer || !hintContainer) return;
    
        let startY;
        let startHeight;
    
        function startResize(e) {
            e.preventDefault();
            startY = e.clientY;
            startHeight = parseInt(getComputedStyle(hintContainer).height, 10);
            document.documentElement.addEventListener('mousemove', resize);
            document.documentElement.addEventListener('mouseup', stopResize);
        }
    
        function resize(e) {
            e.preventDefault();
            const delta = startY - e.clientY;
            const newHeight = Math.max(100, Math.min(window.innerHeight / 2, startHeight + delta));
            hintContainer.style.height = `${newHeight}px`;
            editor.refresh();
        }
    
        function stopResize() {
            document.documentElement.removeEventListener('mousemove', resize);
            document.documentElement.removeEventListener('mouseup', stopResize);
        }
    
        resizer.addEventListener('mousedown', startResize);
    }

    function ensureEditorWrapper(editor) {
        const editorElement = editor.getWrapperElement();
        if (!editorElement.closest('.editor-hint-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'editor-hint-wrapper';
            editorElement.parentNode.insertBefore(wrapper, editorElement);
            wrapper.appendChild(editorElement);
        }
    }
    
    /**
     * Add CSS rules to the page
     */
    function addCssToPage() {
        // Check if our styles are already added
        if (document.getElementById('code-hint-system-styles')) return;
        
        const styleTag = document.createElement('style');
        styleTag.id = 'code-hint-system-styles';
        
        // Any additional inline styles can go here
        styleTag.textContent = `
            .code-hint-panel {
                height: 100%;
                overflow: auto;
            }
        `;
        
        document.head.appendChild(styleTag);
    }
    
    /**
     * Set up event listeners for editor interactions
     * @param {Object} editor - CodeMirror editor instance
     */
    function setupEditorEvents(editor) {
        editor.on("cursorActivity", delayedUpdateHints);
        editor.on("keyup", delayedUpdateHints);
        editor.on("change", delayedUpdateHints);
    }
    
    /**
     * Delayed update to avoid too many updates
     */
    let updateTimeout = null;
    function delayedUpdateHints() {
        if (updateTimeout) clearTimeout(updateTimeout);
        updateTimeout = setTimeout(updateHints, 200);
    }
    
    /**
     * Show the hint panel
     */
    function showPanel() {
        const container = getHintContainer();
        if (container) {
            container.style.display = 'block';
            container.style.visibility = 'visible';
            container.style.opacity = '1';
            fixLayoutGaps(); // Ensure proper positioning
        }
    }
    
    /**
     * Hide the hint panel
     */
    function hidePanel() {
        const container = getHintContainer();
        if (container) {
            container.style.display = 'none';
            container.style.visibility = 'hidden';
            container.style.opacity = '0';
        }
    }
    
    /**
     * Get the hint container element
     * @returns {HTMLElement} - The hint container
     */
    function getHintContainer() {
        if (!activeEditor) return null;
        
        const container = activeEditor.getWrapperElement().closest('.editor-container');
        if (!container) return null;
        
        return container.querySelector('.code-hint-container');
    }
    
    /**
     * Set the height of the hint panel
     * @param {number} height - Height in pixels
     */
    function setPanelHeight(height) {
        panelHeight = height;
        const container = getHintContainer();
        if (container) {
            container.style.height = height + 'px';
        }
    }
    
    /**
     * Update the hint panel with relevant information based on cursor position
     */
    function updateHints() {
        if (!activeEditor || !hintPanel) return;
        
        const cursor = activeEditor.getCursor();
        const line = activeEditor.getLine(cursor.line) || '';
        const cursorPos = cursor.ch;
        
        // First check if we're inside function parameters
        const functionContext = getFunctionContext(line, cursorPos);
        if (functionContext) {
            showFunctionParameterHelp(functionContext);
            showPanel();
            return;
        }
        
        // Get current word at cursor
        const word = getWordAtCursor(line, cursorPos);
        
        if (word && word.length > 0) {
            lastWord = word;
            // Find matching keywords
            const keywords = findMatchingKeywords(word);
            if (keywords.length > 0) {
                showMatchingKeywords(keywords);
                showPanel();
                return;
            }
        }
        
        // Only show default hints if we have some text
        if (word && word.length > 0) {
            showDefaultHints();
            showPanel();
        } else {
            hidePanel();
        }
    }
    
    /**
     * Show parameter help for a function
     */
    function showFunctionParameterHelp(functionContext) {
        // Look up function documentation
        const functionName = functionContext.functionName;
        const currentParamIndex = functionContext.paramIndex;
        
        // Find the function in our engine keywords
        let functionDoc = null;
        if (window.engineKeywords) {
            functionDoc = window.engineKeywords.find(k => k.name === functionName || k.text === functionName);
        }
        
        if (functionDoc) {
            hintPanel.innerHTML = generateFunctionDetailHtml(functionDoc, currentParamIndex);
            
            // Highlight the currently active parameter in the UI
            const currentParam = hintPanel.querySelector(`.hint-param:nth-child(${currentParamIndex + 1})`);
            if (currentParam) {
                currentParam.classList.add('current-param');
                
                // Make sure the highlighted parameter is visible by scrolling to it if needed
                currentParam.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } else {
            // Function not found in documentation
            hintPanel.innerHTML = `
                <div class="hint-section">
                    <div class="hint-section-title">Function: ${functionName}</div>
                    <p>No documentation available for this function.</p>
                </div>
            `;
        }
    }
    
    /**
     * Show matching keywords
     */
    function showMatchingKeywords(keywords) {
        let content = `
            <div class="hint-section">
                <div class="hint-section-title">Suggestions for "${lastWord}"</div>
                <div class="keyword-list">
        `;
        
        keywords.forEach(keyword => {
            const item = keyword.text || keyword.name || '';
            const type = keyword.type || 'function';
            
            content += `
                <span class="hint-item ${type}" 
                      data-text="${item}" 
                      onclick="CodeHintSystem.insertCompletion('${item}')">
                    ${item}
                </span>
            `;
        });
        
        content += `
                </div>
            </div>
        `;
        
        // Show first item's details if available
        if (keywords[0] && (keywords[0].description || keywords[0].parameters)) {
            content += generateFunctionDetailHtml(keywords[0]);
        }
        
        hintPanel.innerHTML = content;
    }
    
    /**
     * Show default hints when no specific context
     */
    function showDefaultHints() {
        let content = `
            <div class="hint-section">
                <div class="hint-section-title">Available Functions</div>
                <div class="keyword-list">
        `;
        
        // Get some commonly used functions
        const commonFunctions = window.engineKeywords ? 
            window.engineKeywords
                .filter(k => k.type === 'function')
                .slice(0, 8) : [];
        
        commonFunctions.forEach(func => {
            const name = func.text || func.name || '';
            content += `
                <span class="hint-item function" 
                      data-text="${name}" 
                      onclick="CodeHintSystem.insertCompletion('${name}')">
                    ${name}
                </span>
            `;
        });
        
        content += `
                </div>
            </div>
            <div class="hint-section">
                <div class="hint-section-title">Constants</div>
                <div class="keyword-list">
        `;
        
        // Get some commonly used constants
        const commonConstants = window.engineKeywords ? 
            window.engineKeywords
                .filter(k => k.type === 'constant')
                .slice(0, 8) : [];
        
        commonConstants.forEach(constant => {
            const name = constant.text || constant.name || '';
            content += `
                <span class="hint-item constant" 
                      data-text="${name}" 
                      onclick="CodeHintSystem.insertCompletion('${name}')">
                    ${name}
                </span>
            `;
        });
        
        content += `
                </div>
            </div>
        `;
        
        hintPanel.innerHTML = content;
    }
    
    /**
     * Get the word at or just before the cursor
     * @param {string} line - Current line of code
     * @param {number} cursorPos - Cursor position
     * @returns {string} - The word at cursor
     */
    function getWordAtCursor(line, cursorPos) {
        let start = cursorPos;
        // Look backwards to find start of word
        while (start > 0 && /[a-zA-Z0-9_$.]/.test(line.charAt(start - 1))) {
            start--;
        }
        // Look forwards to find end of word if cursor is in middle
        let end = cursorPos;
        while (end < line.length && /[a-zA-Z0-9_$.]/.test(line.charAt(end))) {
            end++;
        }
        return line.substring(start, end);
    }
    
    /**
     * Find matching keywords based on current word
     * @param {string} word - Current word or prefix
     * @returns {Array} - Matching keywords
     */
    function findMatchingKeywords(word) {
        if (!window.engineKeywords) return [];
        
        // Convert to lowercase for case-insensitive matching
        const searchWord = word.toLowerCase();
        
        return window.engineKeywords
            .filter(keyword => {
                const keywordName = (keyword.text || keyword.name || '').toLowerCase();
                // Match anywhere in the word, not just start
                return keywordName.includes(searchWord);
            })
            .sort((a, b) => {
                const nameA = (a.text || a.name || '').toLowerCase();
                const nameB = (b.text || b.name || '').toLowerCase();
                // Prioritize exact matches and starts-with matches
                if (nameA.startsWith(searchWord) && !nameB.startsWith(searchWord)) return -1;
                if (!nameA.startsWith(searchWord) && nameB.startsWith(searchWord)) return 1;
                return nameA.localeCompare(nameB);
            });
    }
    
    /**
     * Ensure we have keywords available
     */
    function ensureKeywordsAvailable() {
        if (!window.engineKeywords && window.getKeywordCompletions) {
            window.engineKeywords = window.getKeywordCompletions();
        }
        
        if (!window.engineKeywords) {
            console.warn("No engine keywords available for code hints");
            window.engineKeywords = [];
        }
    }
    
    /**
     * Check if cursor is inside function parameters and extract function name
     * @param {string} line - Current line of code
     * @param {number} cursorPos - Cursor position
     * @returns {Object|null} - Function context or null
     */
    function getFunctionContext(line, cursorPos) {
        // Find opening parenthesis before cursor
        let openParenPos = -1;
        let nestingLevel = 0;
        
        for (let i = cursorPos - 1; i >= 0; i--) {
            if (line[i] === ')') {
                nestingLevel++;
            } else if (line[i] === '(') {
                if (nestingLevel === 0) {
                    openParenPos = i;
                    break;
                } else {
                    nestingLevel--;
                }
            }
        }
        
        if (openParenPos === -1) return null;
        
        // Count commas before cursor to determine parameter index
        let paramIndex = 0;
        nestingLevel = 0;
        
        for (let i = openParenPos + 1; i < cursorPos; i++) {
            if (line[i] === '(') {
                nestingLevel++;
            } else if (line[i] === ')') {
                nestingLevel--;
            } else if (line[i] === ',' && nestingLevel === 0) {
                paramIndex++;
            }
        }
        
        // Get function name
        let funcNameStart = openParenPos;
        while (funcNameStart > 0 && /[a-zA-Z0-9_$.]/.test(line[funcNameStart - 1])) {
            funcNameStart--;
        }
        
        const functionName = line.substring(funcNameStart, openParenPos);
        
        return {
            functionName,
            paramIndex,
            openParenPos,
            cursorPos
        };
    }

    function createAPI() {
        return {
            refresh: function() {
                updateHints();
            },
            resize: function(height) {
                setPanelHeight(height);
            },
            hide: hidePanel,
            show: showPanel,
            updateHints: updateHints,
            getPanel: function() {
                return hintPanel;
            },
            cleanupForEditor: function(editor) {
                // Clean up existing hint panels for this editor
                if (!editor) return;
                
                const wrapper = editor.getWrapperElement();
                if (!wrapper) return;
                
                // Find any existing hint containers
                const existingContainer = wrapper.parentNode.querySelector('.code-hint-container');
                if (existingContainer) {
                    existingContainer.remove();
                }
                
                // Find existing resizer
                const existingResizer = wrapper.parentNode.querySelector('.resizer');
                if (existingResizer) {
                    existingResizer.remove();
                }
                
                // Reset the editor's hint initialization flag
                editor._hintSystemInitialized = false;
            },
            fixLayout: function() {
                // Fix layout issues with the current hint panel
                const container = getHintContainer();
                if (container) {
                    // Ensure the container is visible
                    container.style.display = 'block';
                    
                    // Fix positioning
                    container.style.position = 'relative';
                    container.style.top = '0';
                    container.style.left = '0';
                    container.style.width = '100%';
                    
                    // Set a reasonable height
                    container.style.height = '200px';
                    container.style.maxHeight = '40vh';
                    
                    // Remove any margins that could cause spacing issues
                    container.style.margin = '0';
                    
                    // Make sure it's properly attached to the editor
                    const editorWrapper = activeEditor.getWrapperElement();
                    const parent = editorWrapper.parentNode;
                    
                    // Make sure the parent of the editor has proper layout
                    if (parent.classList.contains('editor-hint-wrapper')) {
                        parent.style.display = 'flex';
                        parent.style.flexDirection = 'column';
                    }
                    
                    // Additionally call our gap fixing function
                    fixLayoutGaps();
                }
            },
            fixGaps: fixLayoutGaps,
            // Add new function to handle tab switching specifically
            handleTabSwitch: function() {
                setTimeout(() => {
                    // First refresh editor to ensure it renders correctly
                    if (activeEditor) {
                        activeEditor.refresh();
                    }
                    
                    // Then fix layout
                    fixLayoutGaps();
                    
                    // Then update hints
                    updateHints();
                    
                    // Make extra sure the container is visible
                    const container = getHintContainer();
                    if (container) {
                        container.style.display = 'block';
                    }
                }, 50);
            }
        };
    }

    /**
     * Fix layout issues with gaps between CodeMirror and hint panel
     * This function will be enhanced to better handle tab switching
     */
    function fixLayoutGaps() {
        if (!activeEditor) return;
        
        const container = activeEditor.getWrapperElement().closest('.editor-container');
        if (!container) return;
        
        const hintContainer = container.querySelector('.code-hint-container');
        const resizer = container.querySelector('.resizer');
        
        if (hintContainer) {
            // Ensure proper display
            hintContainer.style.display = 'block';
            hintContainer.style.position = 'relative';
            hintContainer.style.width = '100%';
            hintContainer.style.marginTop = '0';
            
            // Force editor refresh
            setTimeout(() => activeEditor.refresh(), 0);
            
            // Ensure resizer is properly positioned
            if (resizer) {
                resizer.style.margin = '0';
                resizer.style.height = '4px';
                
                // Make sure resizer is between editor and hint container
                const editorWrapper = activeEditor.getWrapperElement();
                const resizerIndex = Array.from(container.children).indexOf(resizer);
                const editorIndex = Array.from(container.children).indexOf(editorWrapper);
                const hintIndex = Array.from(container.children).indexOf(hintContainer);
                
                if (!(resizerIndex > editorIndex && resizerIndex < hintIndex)) {
                    container.insertBefore(resizer, hintContainer);
                }
            }
        }
    }
    
    /**
     * Generate HTML for function details
     * @param {Object} func - Function documentation object
     * @param {number} highlightParam - Index of parameter to highlight
     * @returns {string} - HTML content
     */
    function generateFunctionDetailHtml(func, highlightParam = -1) {
        const name = func.text || func.name || '';
        const description = func.description || '';
        const parameters = func.parameters || [];
        const returns = func.returns || '';
        const example = func.example || '';
        
        // Create function signature with all parameters
        let signature = `${name}(`;
        signature += parameters.map(p => p.name).join(', ');
        signature += ')';
        
        let html = `
            <div class="hint-function-details">
                <div class="hint-function-signature">${signature}</div>
                <div class="hint-function-description">${description}</div>
        `;
        
        if (parameters.length > 0) {
            html += `<div class="hint-parameters">`;
            html += `<div class="hint-section-title">Parameters:</div>`;
            
            parameters.forEach((param, index) => {
                const isCurrentParam = index === highlightParam;
                html += `
                    <div class="hint-param ${isCurrentParam ? 'current-param' : ''}">
                        <span class="param-name">${param.name}</span>
                        <span class="param-type">{${param.type || 'any'}}</span>
                        - ${param.description || ''}
                    </div>
                `;
            });
            
            html += `</div>`;
        }
        
        if (returns) {
            html += `
                <div class="hint-return">
                    <div class="hint-section-title">Returns:</div>
                    <div>${returns}</div>
                </div>
            `;
        }
        
        if (example) {
            html += `
                <div class="hint-example">
                    <div class="hint-section-title">Example:</div>
                    <pre class="code-example">${example}</pre>
                </div>
            `;
        }
        
        html += `</div>`;
        
        return html;
    }
    
    /**
     * Insert the selected completion into the editor
     * @param {string} text - Text to insert
     */
    function insertCompletion(text) {
        if (!activeEditor) return;
        
        const cursor = activeEditor.getCursor();
        const line = activeEditor.getLine(cursor.line);
        let start = cursor.ch;
        
        // Find start of current word
        while (start > 0 && /[a-zA-Z0-9_$]/.test(line.charAt(start - 1))) {
            start--;
        }
        
        // Replace current word with the selected completion
        activeEditor.replaceRange(text, 
            {line: cursor.line, ch: start}, 
            {line: cursor.line, ch: cursor.ch}
        );
    }
    
    // Public API
    return {
        init,
        insertCompletion,
        updateHints
    };
})();

// Make the CodeHintSystem available globally
window.CodeHintSystem = CodeHintSystem;
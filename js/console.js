/**
 * GameConsole - A simplified console implementation for Isothermal-JS
 * Captures console logs and errors to display them in-game
 * Focused on errors and warnings for troubleshooting
 */
const GameConsole = (function() {
    // Private variables
    let consoleContainer = null;
    let consoleContent = null;
    let maxEntries = 100;
    let autoScroll = true;
    let isInitialized = false;
    let isVisible = false;
    let originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        info: console.info
    };
    let entries = [];
    
    // Initialize the console UI
    function init() {
        if (isInitialized) return;
        
        // Create console tab if it doesn't exist
        createConsoleTab();
        
        // Capture console logs
        setupConsoleCaptureHooks();
        
        // Mark as initialized
        isInitialized = true;
        
        // Log initialization
        info('Game Error Console initialized - Only showing errors and warnings');
        
        return {
            log: log,
            warn: warn,
            error: error,
            info: info,
            clear: clear,
            show: show,
            hide: hide,
            toggle: toggle
        };
    }
    
    function createConsoleTab() {
        // Find the tab container
        const tabContainer = document.querySelector('.tab-buttons');
        
        if (!tabContainer) {
            // Try to find the tab header as an alternative
            const tabHeader = document.querySelector('.tab-header');
            if (!tabHeader) {
                console.error("Could not find tab container for game console");
                return;
            } else {
                // Create console tab button if it doesn't exist
                if (!document.querySelector('[data-tab="console"]')) {
                    const consoleTabBtn = document.createElement('button');
                    consoleTabBtn.className = 'tab-btn';
                    consoleTabBtn.setAttribute('data-tab', 'console');
                    consoleTabBtn.innerHTML = '<span style="color:#ff5555;">⚠</span> Console';
                    tabHeader.appendChild(consoleTabBtn);
                }
            }
        } else {
            // Create console tab button if it doesn't exist
            if (!document.querySelector('[data-tab="console"]')) {
                const consoleTabBtn = document.createElement('button');
                consoleTabBtn.className = 'tab-btn';
                consoleTabBtn.setAttribute('data-tab', 'console');
                consoleTabBtn.innerHTML = '<span style="color:#ff5555;">⚠</span> Console';
                tabContainer.appendChild(consoleTabBtn);
            }
        }
        
        // Create console tab content if it doesn't exist
        if (!document.getElementById('console')) {
            const tabContent = document.querySelector('.tab-content');
            if (tabContent) {
                const consoleTab = document.createElement('div');
                consoleTab.id = 'console';
                consoleTab.className = 'tab-pane';
                
                // Create console UI
                consoleTab.innerHTML = `
                    <div class="console-container">
                        <div class="console-header">
                            <div class="console-title">Game Error Console</div>
                            <div class="console-controls">
                                <label class="console-autoscroll">
                                    <input type="checkbox" id="console-autoscroll" checked>
                                    Auto-scroll
                                </label>
                                <button id="console-clear" class="console-btn">Clear</button>
                            </div>
                        </div>
                        <div id="console-content" class="console-content"></div>
                    </div>
                `;
                
                tabContent.appendChild(consoleTab);
                
                // Add console styling
                addConsoleStyles();
                
                // Cache DOM elements
                consoleContainer = document.querySelector('.console-container');
                consoleContent = document.getElementById('console-content');
                
                // Setup event listeners
                document.getElementById('console-clear').addEventListener('click', clear);
                document.getElementById('console-autoscroll').addEventListener('change', (e) => {
                    autoScroll = e.target.checked;
                    if (autoScroll) scrollToBottom();
                });
            }
        }
    }
    
    function addConsoleStyles() {
        if (document.getElementById('game-console-styles')) return;
        
        const styleEl = document.createElement('style');
        styleEl.id = 'game-console-styles';
        styleEl.textContent = `
            .console-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                background-color: #1e1e1e;
                color: #f0f0f0;
                font-family: monospace;
            }
            
            .console-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background-color: #333;
                border-bottom: 1px solid #444;
            }
            
            .console-title {
                font-weight: bold;
                font-size: 14px;
            }
            
            .console-controls {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            
            .console-btn {
                background-color: #555;
                border: none;
                color: #fff;
                padding: 4px 8px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            }
            
            .console-btn:hover {
                background-color: #666;
            }
            
            .console-autoscroll {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 12px;
            }
            
            .console-content {
                flex: 1;
                overflow-y: auto;
                padding: 8px 12px;
                font-size: 13px;
                line-height: 1.4;
                height: calc(100% - 40px);
            }
            
            .console-entry {
                margin-bottom: 5px;
                padding: 4px 0;
                border-bottom: 1px solid rgba(255,255,255,0.05);
                white-space: pre-wrap;
                word-break: break-word;
            }
            
            .console-entry:last-child {
                margin-bottom: 0;
            }
            
            .console-entry.warn {
                color: #f5c842;
            }
            
            .console-entry.error {
                color: #ff5555;
                background-color: rgba(255,85,85,0.1);
                padding: 6px;
                border-left: 2px solid #ff5555;
            }
            
            .entry-time {
                color: #888;
                margin-right: 8px;
            }
            
            .entry-stack {
                display: block;
                margin-top: 5px;
                padding-left: 20px;
                font-size: 12px;
                color: #888;
                border-left: 1px solid #444;
            }
            
            .context-info {
                color: #4a9df3;
                font-size: 12px;
                margin-bottom: 5px;
                padding-left: 20px;
            }
            
            .error-function {
                color: #ff8080;
                font-style: italic;
            }
            
            .error-var {
                color: #b58900;
                font-weight: bold;
            }

            .error-location {
                color: #2aa198;
            }
            
            /* Fix footer visibility */
            .footer {
                display: block !important;
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                z-index: 1000;
                padding: 4px 10px;
                background-color: #1e1e1e;
                border-top: 1px solid #333;
            }
            
            .tab-content {
                padding-bottom: 25px; /* Add space for footer */
            }
        `;
        
        document.head.appendChild(styleEl);
    }
    
    function setupConsoleCaptureHooks() {
        // Override console methods
        console.log = function() {
            // Only forward to original, don't show in game console
            originalConsole.log.apply(console, arguments);
        };
        
        console.warn = function() {
            originalConsole.warn.apply(console, arguments);
            log(Array.from(arguments).join(' '), 'warn');
        };
        
        console.error = function() {
            originalConsole.error.apply(console, arguments);
            
            // Extract stack trace if the first argument is an error
            let message = Array.from(arguments).join(' ');
            let stack = '';
            
            if (arguments[0] instanceof Error) {
                stack = arguments[0].stack || '';
                message = arguments[0].message || message;
            }
            
            log(message, 'error', stack);
        };
        
        console.info = function() {
            // Only forward to original, don't show in game console
            originalConsole.info.apply(console, arguments);
        };
        
        // Simple error event listener
        window.addEventListener('error', function(e) {
            const errorObj = e.error || new Error(e.message || 'Unknown error');
            const stack = errorObj.stack || '';
            const message = errorObj.message || e.message || 'Script error';
            
            // Extract object/method information from stack if available
            let gameObjectInfo = null;
            
            // Look for game object methods in the stack trace
            if (stack) {
                // Pattern: "at objEnemy.loop"
                const objMatch = stack.match(/at\s+(\w+)\.(\w+)/);
                if (objMatch) {
                    gameObjectInfo = {
                        objectName: objMatch[1],
                        eventName: objMatch[2]
                    };
                }
            }
            
            // Log to game console
            log(message, 'error', stack, gameObjectInfo);
            
            // Print raw error details to browser console for debugging
            originalConsole.log('Error details:', message, stack);
            return false;
        });
        
        // Simple promise rejection handler
        window.addEventListener('unhandledrejection', function(e) {
            const message = e.reason.message || 'Uncaught Promise rejection';
            const stack = e.reason.stack || '';
            
            log(message, 'error', stack);
            return false;
        });
    }
    
    // Add an entry to the console (only warnings and errors will be shown)
    function addEntry(message, type, stack = '', contextInfo = null) {
        // Only process warnings and errors
        if (type !== 'warn' && type !== 'error') {
            return null;
        }

        // Create entry object
        const time = new Date();
        const timeString = time.toTimeString().split(' ')[0];
        
        const entry = {
            time: timeString,
            message: message,
            type: type,
            stack: stack,
            contextInfo: contextInfo,
            id: 'entry-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
        };
        
        // Add to entries array
        entries.push(entry);
        
        // Limit entries to maxEntries
        if (entries.length > maxEntries) {
            entries.shift();
        }
        
        // Render entry if console is visible
        if (consoleContent) {
            renderEntry(entry);
            
            // Auto scroll if enabled
            if (autoScroll) {
                scrollToBottom();
            }
            
            // If this is an error, automatically switch to the console tab
            if (type === 'error') {
                show();
            }
        }
        
        return entry;
    }
    
    // Simple entry renderer
    function renderEntry(entry) {
        if (!consoleContent) return;
        
        const entryEl = document.createElement('div');
        entryEl.id = entry.id;
        entryEl.className = `console-entry ${entry.type}`;
        
        // Basic entry content with timestamp and message
        let entryContent = `<span class="entry-time">${entry.time}</span>${formatMessage(entry.message)}`;
        
        // Add context info if available
        if (entry.contextInfo) {
            const contextDesc = `<span class="error-function">${entry.contextInfo.objectName}.${entry.contextInfo.eventName}()</span>`;
            entryContent += `<div class="context-info">${contextDesc}</div>`;
        }
        
        // Show stack trace for errors
        if (entry.stack && entry.type === 'error') {
            const formattedStack = formatStackTrace(entry.stack);
            entryContent += `<span class="entry-stack">${formattedStack}</span>`;
        }
        
        entryEl.innerHTML = entryContent;
        consoleContent.appendChild(entryEl);
    }
    
    // Format message for safe display in HTML
    function formatMessage(message) {
        if (typeof message === 'object') {
            try {
                return JSON.stringify(message, null, 2);
            } catch (err) {
                return String(message);
            }
        }
        
        return String(message)
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
    
    // Format stack trace with syntax highlighting
    function formatStackTrace(stack) {
        if (!stack) return '';
        
        return stack
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            // Highlight object methods
            .replace(/(at\s+)(\w+\.\w+)(\s|\()/g, '$1<span class="error-function">$2</span>$3')
            // Highlight undefined variables
            .replace(/(\w+) is not defined/g, '<span class="error-var">$1</span> is not defined')
            // Highlight file locations
            .replace(/(<eval>\/[^:]+):(\d+):(\d+)/g, '<span class="error-location">$1:$2:$3</span>')
            .replace(/([\w-]+\.js):(\d+):(\d+)/g, '<span class="error-location">$1:$2:$3</span>')
            // Format for readability
            .replace(/\n/g, '<br>')
            .replace(/\s{4}/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
    }
    
    // Scroll console to bottom
    function scrollToBottom() {
        if (consoleContent) {
            consoleContent.scrollTop = consoleContent.scrollHeight;
        }
    }
    
    // Public API methods
    function log(message, type = 'log', stack = '', contextInfo = null) {
        if (type === 'warn' || type === 'error') {
            return addEntry(message, type, stack, contextInfo);
        }
        return null;
    }
    
    function warn(message) {
        return log(message, 'warn');
    }
    
    function error(message, stack = '', contextInfo = null) {
        return log(message, 'error', stack, contextInfo);
    }
    
    function info(message) {
        originalConsole.info(message);
        return null;
    }
    
    function clear() {
        entries = [];
        if (consoleContent) {
            consoleContent.innerHTML = '';
        }
        info('Console cleared');
    }
    
    function show() {
        isVisible = true;
        const consoleTab = document.querySelector('[data-tab="console"]');
        if (consoleTab) {
            consoleTab.click();
        }
    }
    
    function hide() {
        isVisible = false;
    }
    
    function toggle() {
        if (isVisible) {
            hide();
        } else {
            show();
        }
        return isVisible;
    }
    
    // Initialize on load
    document.addEventListener('DOMContentLoaded', init);
    
    // Public API
    return {
        init,
        log,
        warn,
        error,
        info,
        clear,
        show,
        hide,
        toggle
    };
})();

// Make the console available globally
window.GameConsole = GameConsole;
/**
 * Event handlers for initializing code hint system in object editors
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("Setting up object event editor initialization...");
    
    // Handle event selection in the object editor
    document.addEventListener('click', function(event) {
        // Check if an event item is clicked in the objects tab
        const eventItem = event.target.closest('.event-item');
        if (eventItem) {
            console.log("Event item clicked, initializing editor hints...");
            
            // Wait for the editor to update
            setTimeout(function() {
                initializeObjectEventEditor();
            }, 200);
        }
    });
    
    // Initialize when an object is selected
    document.addEventListener('click', function(event) {
        // Check if an object item is clicked
        const objectItem = event.target.closest('.object-item');
        if (objectItem) {
            // Wait for the object to be selected and UI to update
            setTimeout(function() {
                initializeObjectEventEditor();
            }, 300);
        }
    });
    
    // Initialize when switching to objects tab
    const objectsTabBtn = document.querySelector('.tab-btn[data-tab="objects"]');
    if (objectsTabBtn) {
        objectsTabBtn.addEventListener('click', function() {
            setTimeout(function() {
                initializeObjectEventEditor();
            }, 200);
        });
    }
});

/**
 * Initialize code hint system for the object event editor
 */
function initializeObjectEventEditor() {
    // Find the current active CodeMirror instance in the object editor area
    const objEditorWrapper = document.querySelector('.object-detail .CodeMirror');
    if (!objEditorWrapper) {
        console.log("No CodeMirror instance found in object editor");
        return;
    }
    
    const cmInstance = objEditorWrapper.CodeMirror;
    if (!cmInstance) {
        console.log("CodeMirror instance not found");
        return;
    }
    
    // Check if this editor already has hints initialized
    if (cmInstance._hintSystemInitialized) {
        console.log("Hint system already initialized for this editor");
        return;
    }
    
    console.log("Initializing code hint system for object event editor");
    
    // Initialize the code hint system for this editor
    try {
        window.codeHintSystem = window.CodeHintSystem.init(cmInstance);
        
        // Explicitly wrap the editor in the editor-hint-wrapper if needed
        const parentElement = objEditorWrapper.parentElement;
        if (!parentElement.classList.contains('editor-hint-wrapper') && 
            !parentElement.closest('.editor-hint-wrapper')) {
            
            // Create wrapper element
            const wrapper = document.createElement('div');
            wrapper.className = 'editor-hint-wrapper';
            
            // Replace the editor with the wrapper containing the editor
            parentElement.insertBefore(wrapper, objEditorWrapper);
            wrapper.appendChild(objEditorWrapper);
            
            // Re-initialize hint system with the proper wrapper
            window.codeHintSystem = window.CodeHintSystem.init(cmInstance);
        }
        
        // Force display the hint container
        const hintContainer = objEditorWrapper.closest('.editor-hint-wrapper')?.querySelector('.code-hint-container');
        if (hintContainer) {
            hintContainer.style.display = 'block';
            hintContainer.style.height = '200px';
        }
        
        cmInstance.refresh();
    } catch (error) {
        console.error("Error initializing hint system:", error);
    }
}

// Add global function to force initialize all editors
window.initializeAllEditorHints = function() {
    // Initialize hints for the currently visible editor
    const activeTab = document.querySelector('.tab-pane.active');
    if (activeTab) {
        const cmElements = activeTab.querySelectorAll('.CodeMirror');
        cmElements.forEach(cmElement => {
            if (cmElement.CodeMirror) {
                window.CodeHintSystem.init(cmElement.CodeMirror);
            }
        });
    }
};

// Run once after page load
setTimeout(window.initializeAllEditorHints, 2000);
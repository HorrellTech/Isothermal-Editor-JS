/**
 * Object Event Editor Handler
 * Ensures proper initialization and display of code hints for object events
 */

// Function to prepare the event code editor for proper hint display
function prepareEventCodeEditor() {
    // Find the event code editor container
    const eventCodeEditor = document.getElementById('eventCodeEditor');
    if (!eventCodeEditor) return;
    
    // Check if it already has the wrapper
    if (eventCodeEditor.querySelector('.editor-hint-wrapper')) return;
    
    console.log("Preparing event code editor for hints...");
    
    // Get existing content
    const existingContent = eventCodeEditor.innerHTML;
    
    // Replace with proper wrapper structure
    eventCodeEditor.innerHTML = `
        <div class="editor-hint-wrapper">
            ${existingContent}
        </div>
    `;
}

// Function to be called when selecting an event
function onEventSelected(eventName, objectId) {
    console.log(`Event selected: ${eventName} for object ${objectId}`);
    
    // Make sure the editor is prepared with proper structure
    prepareEventCodeEditor();
    
    // Wait for CodeMirror to update
    setTimeout(() => {
        // Find the CodeMirror instance in the event editor
        const cmElement = document.querySelector('#eventCodeEditor .CodeMirror');
        if (cmElement && cmElement.CodeMirror) {
            const cmInstance = cmElement.CodeMirror;
            
            // Force refresh the editor first
            cmInstance.refresh();
            
            // Initialize code hint system
            if (window.CodeHintSystem) {
                // Clear any existing hint system to prevent duplicates
                if (window.codeHintSystem && window.codeHintSystem.cleanupForEditor) {
                    window.codeHintSystem.cleanupForEditor(cmInstance);
                }
                
                // Initialize new hint system for this editor
                window.codeHintSystem = window.CodeHintSystem.init(cmInstance);
                
                // Use the new tab switch handler for proper layout
                if (window.codeHintSystem && window.codeHintSystem.handleTabSwitch) {
                    window.codeHintSystem.handleTabSwitch();
                }
                
                // Force refresh and show with a longer delay for tab switching
                setTimeout(() => {
                    cmInstance.refresh();
                    if (window.codeHintSystem && window.codeHintSystem.show) {
                        window.codeHintSystem.show();
                    }
                }, 200);
            }
        }
    }, 300);
}

// Export the function so it can be called from app.js
window.onEventSelected = onEventSelected;

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Prepare the event code editor structure
    prepareEventCodeEditor();
    
    // Hook into tab switching to ensure hints are reinitialized
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            if (tabId === 'objects' && window.selectedEvent) {
                // If switching to objects tab and an event is selected,
                // reinitialize the hints after the tab content is visible
                setTimeout(() => {
                    onEventSelected(window.selectedEvent, window.selectedObject);
                }, 300);
            }
        });
    });
    
    // Ensure hint container stays visible on CodeMirror events
    document.addEventListener('click', function(event) {
        if (event.target.closest('#eventCodeEditor')) {
            const hintContainer = document.querySelector('#eventCodeEditor .editor-hint-wrapper .code-hint-container');
            if (hintContainer) {
                hintContainer.style.display = 'block';
            }
        }
    });
});
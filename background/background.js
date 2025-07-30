/**
 * GitHub PR AutoComplete Background Script
 * Service worker for the Chrome extension
 */

// Default trigger characters for autocomplete
const DEFAULT_TRIGGER_CHARACTERS = [
    '.', // Method/property access
    '_', // Snake case variables
    '-', // Kebab case
    ':', // CSS properties, object keys
    '/', // File paths
    '#', // IDs, comments
    '@', // Mentions, decorators
    '$', // Variables in some languages
    '{', // Template literals, object start
    '(', // Function calls
    '[', // Array access
    ' ', // Space for general word completion
    '\n', // New line
    '\t'  // Tab
];

// Extension installation and update handling
chrome.runtime.onInstalled.addListener((details) => {
    console.log('GitHub PR AutoComplete: Extension installed/updated', details);
    
    if (details.reason === 'install') {
        console.log('GitHub PR AutoComplete: First time installation');
        
        // Set default settings
        chrome.storage.sync.set({
            enabled: true,
            maxSuggestions: 10,
            minWordLength: 2,
            debounceDelay: 300,
            triggerCharacters: DEFAULT_TRIGGER_CHARACTERS,
            fuzzyMatching: true,
            caseInsensitive: true
        });
    }
    
    if (details.reason === 'update') {
        console.log('GitHub PR AutoComplete: Extension updated to version', chrome.runtime.getManifest().version);
        
        // Update settings with new defaults if they don't exist
        chrome.storage.sync.get(null, (settings) => {
            const updates = {};
            
            if (settings.triggerCharacters === undefined) {
                updates.triggerCharacters = DEFAULT_TRIGGER_CHARACTERS;
            }
            if (settings.fuzzyMatching === undefined) {
                updates.fuzzyMatching = true;
            }
            if (settings.caseInsensitive === undefined) {
                updates.caseInsensitive = true;
            }
            
            if (Object.keys(updates).length > 0) {
                chrome.storage.sync.set(updates);
                console.log('GitHub PR AutoComplete: Updated settings with new defaults', updates);
            }
        });
    }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('GitHub PR AutoComplete: Extension started');
});

// Message handling for communication with content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('GitHub PR AutoComplete: Message received', request);
    
    switch (request.action) {
        case 'getSettings':
            // Return current settings
            chrome.storage.sync.get([
                'enabled',
                'maxSuggestions', 
                'minWordLength',
                'debounceDelay',
                'triggerCharacters',
                'fuzzyMatching',
                'caseInsensitive'
            ], (settings) => {
                sendResponse({
                    success: true,
                    settings: {
                        enabled: settings.enabled !== false, // Default to true
                        maxSuggestions: settings.maxSuggestions || 10,
                        minWordLength: settings.minWordLength || 2,
                        debounceDelay: settings.debounceDelay || 300,
                        triggerCharacters: settings.triggerCharacters || DEFAULT_TRIGGER_CHARACTERS,
                        fuzzyMatching: settings.fuzzyMatching !== false, // Default to true
                        caseInsensitive: settings.caseInsensitive !== false // Default to true
                    }
                });
            });
            return true; // Keep message channel open for async response
            
        case 'updateSettings':
            // Update settings
            chrome.storage.sync.set(request.settings, () => {
                sendResponse({ success: true });
                console.log('GitHub PR AutoComplete: Settings updated', request.settings);
            });
            return true;
            
        case 'resetSettings':
            // Reset to default settings
            const defaultSettings = {
                enabled: true,
                maxSuggestions: 10,
                minWordLength: 2,
                debounceDelay: 300,
                triggerCharacters: DEFAULT_TRIGGER_CHARACTERS,
                fuzzyMatching: true,
                caseInsensitive: true
            };
            chrome.storage.sync.set(defaultSettings, () => {
                sendResponse({ success: true, settings: defaultSettings });
                console.log('GitHub PR AutoComplete: Settings reset to defaults');
            });
            return true;
            
        case 'getStats':
            // Could be used for analytics or debugging
            sendResponse({
                success: true,
                version: chrome.runtime.getManifest().version,
                timestamp: Date.now()
            });
            break;
            
        default:
            console.warn('GitHub PR AutoComplete: Unknown message action', request.action);
            sendResponse({ success: false, error: 'Unknown action' });
    }
});

// Tab update handling (for GitHub page navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only act on GitHub PR pages
    if (changeInfo.status === 'complete' && 
        tab.url && 
        tab.url.includes('github.com') && 
        tab.url.includes('/pull/')) {
        
        console.log('GitHub PR AutoComplete: PR page loaded', tab.url);
        
        // Could send a message to content script to reinitialize if needed
        chrome.tabs.sendMessage(tabId, {
            action: 'pageLoaded',
            url: tab.url
        }).catch(() => {
            // Content script might not be ready yet, that's okay
        });
    }
});

// Error handling
chrome.runtime.onSuspend.addListener(() => {
    console.log('GitHub PR AutoComplete: Extension suspending');
});

// Keep service worker alive if needed (for debugging)
// Note: Only enable this during development to prevent service worker from sleeping
const DEVELOPMENT_MODE = false; // Set to true during development if needed

if (DEVELOPMENT_MODE) {
    setInterval(() => {
        console.log('GitHub PR AutoComplete: Service worker keepalive');
    }, 20000);
}
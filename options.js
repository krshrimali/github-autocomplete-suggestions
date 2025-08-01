/**
 * Options page script for GitHub PR AutoComplete extension
 */

// DOM elements
const form = document.getElementById('settingsForm');
const statusMessage = document.getElementById('statusMessage');
const resetBtn = document.getElementById('resetBtn');

// Default settings
const DEFAULT_SETTINGS = {
    enabled: true,
    maxSuggestions: 10,
    minWordLength: 2,
    debounceDelay: 300,
    triggerCharacters: [
        '.', '_', '-', ':', '/', '#', '@', '$', '{', '(', '[', ' ', '\n', '\t'
    ],
    fuzzyMatching: true,
    caseInsensitive: true
};

/**
 * Load settings from Chrome storage and populate the form
 */
async function loadSettings() {
    try {
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'getSettings' }, resolve);
        });

        if (response && response.success) {
            const settings = response.settings;
            
            // Populate form fields
            document.getElementById('enabled').checked = settings.enabled;
            document.getElementById('fuzzyMatching').checked = settings.fuzzyMatching;
            document.getElementById('caseInsensitive').checked = settings.caseInsensitive;
            document.getElementById('maxSuggestions').value = settings.maxSuggestions;
            document.getElementById('minWordLength').value = settings.minWordLength;
            document.getElementById('debounceDelay').value = settings.debounceDelay;
            
            // Handle trigger characters - convert array to string
            const triggerCharsText = settings.triggerCharacters
                .map(char => {
                    // Convert special characters to readable format
                    switch (char) {
                        case ' ': return 'space';
                        case '\n': return 'newline';
                        case '\t': return 'tab';
                        default: return char;
                    }
                })
                .join('\n');
            
            document.getElementById('triggerCharacters').value = triggerCharsText;
            
            console.log('Settings loaded:', settings);
        } else {
            throw new Error('Failed to load settings');
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showStatus('Error loading settings. Using defaults.', 'error');
        loadDefaultSettings();
    }
}

/**
 * Load default settings into the form
 */
function loadDefaultSettings() {
    document.getElementById('enabled').checked = DEFAULT_SETTINGS.enabled;
    document.getElementById('fuzzyMatching').checked = DEFAULT_SETTINGS.fuzzyMatching;
    document.getElementById('caseInsensitive').checked = DEFAULT_SETTINGS.caseInsensitive;
    document.getElementById('maxSuggestions').value = DEFAULT_SETTINGS.maxSuggestions;
    document.getElementById('minWordLength').value = DEFAULT_SETTINGS.minWordLength;
    document.getElementById('debounceDelay').value = DEFAULT_SETTINGS.debounceDelay;
    
    const triggerCharsText = DEFAULT_SETTINGS.triggerCharacters
        .map(char => {
            switch (char) {
                case ' ': return 'space';
                case '\n': return 'newline';
                case '\t': return 'tab';
                default: return char;
            }
        })
        .join('\n');
    
    document.getElementById('triggerCharacters').value = triggerCharsText;
}

/**
 * Parse trigger characters from textarea
 * @param {string} text - Text from textarea
 * @returns {string[]} Array of trigger characters
 */
function parseTriggerCharacters(text) {
    if (!text) return DEFAULT_SETTINGS.triggerCharacters;
    
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
            // Convert readable format back to special characters
            switch (line.toLowerCase()) {
                case 'space': return ' ';
                case 'newline': return '\n';
                case 'tab': return '\t';
                default: return line.charAt(0); // Take only first character
            }
        })
        .filter((char, index, arr) => arr.indexOf(char) === index); // Remove duplicates
}

/**
 * Validate form inputs
 * @param {Object} settings - Settings object to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateSettings(settings) {
    const errors = [];
    
    if (settings.maxSuggestions < 1 || settings.maxSuggestions > 20) {
        errors.push('Maximum suggestions must be between 1 and 20');
    }
    
    if (settings.minWordLength < 1 || settings.minWordLength > 5) {
        errors.push('Minimum word length must be between 1 and 5');
    }
    
    if (settings.debounceDelay < 100 || settings.debounceDelay > 1000) {
        errors.push('Response delay must be between 100 and 1000 milliseconds');
    }
    
    if (!settings.triggerCharacters || settings.triggerCharacters.length === 0) {
        errors.push('At least one trigger character is required');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Save settings to Chrome storage
 * @param {Object} settings - Settings to save
 */
async function saveSettings(settings) {
    try {
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ 
                action: 'updateSettings', 
                settings: settings 
            }, resolve);
        });

        if (response && response.success) {
            showStatus('Settings saved successfully!', 'success');
            console.log('Settings saved:', settings);
            
            // Notify content scripts about settings update
            try {
                const tabs = await chrome.tabs.query({ 
                    url: 'https://github.com/*/pull/*' 
                });
                
                for (const tab of tabs) {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'settingsUpdated',
                        settings: settings
                    }).catch(() => {
                        // Content script might not be ready, that's okay
                    });
                }
            } catch (error) {
                console.log('Could not notify content scripts:', error);
            }
        } else {
            throw new Error('Failed to save settings');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showStatus('Error saving settings. Please try again.', 'error');
    }
}

/**
 * Reset settings to defaults
 */
async function resetSettings() {
    try {
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'resetSettings' }, resolve);
        });

        if (response && response.success) {
            loadDefaultSettings();
            showStatus('Settings reset to defaults!', 'success');
            console.log('Settings reset to defaults');
        } else {
            throw new Error('Failed to reset settings');
        }
    } catch (error) {
        console.error('Error resetting settings:', error);
        showStatus('Error resetting settings. Please try again.', 'error');
    }
}

/**
 * Show status message
 * @param {string} message - Message to show
 * @param {string} type - Type of message ('success' or 'error')
 */
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
    statusMessage.style.display = 'block';
    
    // Hide message after 3 seconds
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 3000);
}

/**
 * Handle form submission
 */
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Collect form data
    const formData = new FormData(form);
    const settings = {
        enabled: formData.has('enabled'),
        fuzzyMatching: formData.has('fuzzyMatching'),
        caseInsensitive: formData.has('caseInsensitive'),
        maxSuggestions: parseInt(formData.get('maxSuggestions')),
        minWordLength: parseInt(formData.get('minWordLength')),
        debounceDelay: parseInt(formData.get('debounceDelay')),
        triggerCharacters: parseTriggerCharacters(formData.get('triggerCharacters'))
    };
    
    // Validate settings
    const validation = validateSettings(settings);
    if (!validation.isValid) {
        showStatus('Validation errors: ' + validation.errors.join(', '), 'error');
        return;
    }
    
    // Save settings
    await saveSettings(settings);
});

/**
 * Handle reset button click
 */
resetBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all settings to their default values?')) {
        await resetSettings();
    }
});

/**
 * Add real-time validation feedback
 */
function setupValidation() {
    const numberInputs = form.querySelectorAll('input[type="number"]');
    
    numberInputs.forEach(input => {
        input.addEventListener('input', () => {
            const value = parseInt(input.value);
            const min = parseInt(input.min);
            const max = parseInt(input.max);
            
            if (value < min || value > max) {
                input.style.borderColor = '#dc2626';
            } else {
                input.style.borderColor = '#d1d9e0';
            }
        });
    });
    
    // Validate trigger characters
    const triggerCharsInput = document.getElementById('triggerCharacters');
    triggerCharsInput.addEventListener('input', () => {
        const chars = parseTriggerCharacters(triggerCharsInput.value);
        if (chars.length === 0) {
            triggerCharsInput.style.borderColor = '#dc2626';
        } else {
            triggerCharsInput.style.borderColor = '#d1d9e0';
        }
    });
}

/**
 * Initialize the options page
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('GitHub PR AutoComplete Options: Initializing...');
    
    // Load current settings
    loadSettings();
    
    // Setup validation
    setupValidation();
    
    console.log('GitHub PR AutoComplete Options: Initialized');
});
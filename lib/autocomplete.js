/**
 * GitHub PR AutoComplete Engine
 * Combines the Trie data structure with GitHub parsing for intelligent auto-complete
 */
class AutoCompleteEngine {
    constructor() {
        this.trie = new ACT();
        this.parser = new GitHubParser();
        this.isInitialized = false;
        this.currentSuggestions = [];
        this.maxSuggestions = 10;
        
        // Cache for performance
        this.wordCache = new Set();
        this.lastUpdateTime = 0;
        this.updateThreshold = 5000; // 5 seconds
        
        // Trigger characters for autocomplete activation
        this.triggerCharacters = [
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
        
        // Settings
        this.settings = {
            enabled: true,
            maxSuggestions: 10,
            minWordLength: 2,
            debounceDelay: 300,
            triggerCharacters: this.triggerCharacters,
            fuzzyMatching: true,
            caseInsensitive: true
        };
        
        // Load settings from storage
        this.loadSettings();
    }

    /**
     * Load settings from Chrome storage
     */
    async loadSettings() {
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                const response = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({ action: 'getSettings' }, resolve);
                });
                
                if (response && response.success) {
                    this.settings = { ...this.settings, ...response.settings };
                    this.maxSuggestions = this.settings.maxSuggestions;
                    this.triggerCharacters = this.settings.triggerCharacters || this.triggerCharacters;
                }
            }
        } catch (error) {
            console.log('GitHub PR AutoComplete: Could not load settings, using defaults');
        }
    }

    /**
     * Initialize the auto-complete engine
     * Extract words from PR and build the Trie
     */
    async initialize() {
        console.log('GitHub PR AutoComplete: Initializing...');
        
        try {
            // Load settings first
            await this.loadSettings();
            
            // Check if extension is enabled
            if (!this.settings.enabled) {
                console.log('GitHub PR AutoComplete: Extension is disabled');
                return;
            }
            
            // Verify we're on a GitHub PR page
            if (!window.location.href.includes('github.com') || !window.location.href.includes('/pull/')) {
                console.log('GitHub PR AutoComplete: Not on a GitHub PR page, skipping initialization');
                return;
            }

            console.log('GitHub PR AutoComplete: Current URL:', window.location.href);
            console.log('GitHub PR AutoComplete: Page title:', document.title);
            
            // Wait for GitHub page to be ready
            await this.waitForGitHubPage();
            
            // Extract words from the PR
            const words = await this.extractWords();
            
            // Build the Trie
            this.buildTrie(words);
            
            // Set up monitoring for changes
            this.setupChangeMonitoring();
            
            this.isInitialized = true;
            console.log(`GitHub PR AutoComplete: Initialized with ${words.size} words`);
            console.log('GitHub PR AutoComplete: Settings:', this.settings);
            
        } catch (error) {
            console.error('GitHub PR AutoComplete: Initialization failed', error);
        }
    }

    /**
     * Wait for GitHub page to be fully loaded
     */
    async waitForGitHubPage() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                // Additional wait for GitHub's dynamic content
                setTimeout(resolve, 1000);
                return;
            }
            
            window.addEventListener('load', () => {
                setTimeout(resolve, 1000);
            });
        });
    }

    /**
     * Extract words from the GitHub PR
     * @returns {Promise<Set<string>>} Set of extracted words
     */
    async extractWords() {
        return await this.parser.extractWordsFromPR();
    }

    /**
     * Build the Trie from extracted words
     * @param {Set<string>} words - Words to insert into the Trie
     */
    buildTrie(words) {
        console.log(`GitHub PR AutoComplete: Building Trie with ${words.size} words`);
        
        // Clear existing trie
        this.trie = new ACT();
        this.wordCache = new Set(words);
        
        // Insert all words into the trie
        for (const word of words) {
            if (word && word.length >= this.settings.minWordLength) {
                this.trie.insert(word);
            }
        }
        
        this.lastUpdateTime = Date.now();
        console.log('GitHub PR AutoComplete: Trie built successfully');
    }

    /**
     * Check if autocomplete should be triggered based on the current input
     * @param {string} input - Current input text
     * @param {number} cursorPos - Current cursor position
     * @returns {boolean} True if autocomplete should be triggered
     */
    shouldTrigger(input, cursorPos = input.length) {
        if (!input || cursorPos === 0) return false;
        
        // Check if the character before cursor is a trigger character
        const charBeforeCursor = input[cursorPos - 1];
        const charAtCursor = cursorPos > 0 ? input[cursorPos - 2] : '';
        
        // Trigger on trigger characters or if we're continuing to type a word
        return this.triggerCharacters.includes(charBeforeCursor) || 
               this.triggerCharacters.includes(charAtCursor) ||
               /[a-zA-Z0-9_]/.test(charBeforeCursor);
    }

    /**
     * Get auto-complete suggestions for a given input
     * @param {string} input - Current user input
     * @param {number} maxResults - Maximum number of suggestions to return
     * @param {number} cursorPos - Current cursor position
     * @returns {string[]} Array of suggestions
     */
    getSuggestions(input, maxResults = this.maxSuggestions, cursorPos = input.length) {
        if (!this.isInitialized || !input || !this.settings.enabled) {
            return [];
        }

        // Check if we should trigger autocomplete
        if (!this.shouldTrigger(input, cursorPos)) {
            return [];
        }

        // Get the current word being typed
        const currentWord = this.getCurrentWord(input, cursorPos);
        if (!currentWord || currentWord.length < this.settings.minWordLength) {
            return [];
        }

        // Get suggestions from trie using fuzzy matching if enabled
        let suggestions;
        if (this.settings.fuzzyMatching) {
            suggestions = this.trie.search(currentWord, maxResults);
        } else {
            suggestions = this.trie.autoComplete(currentWord);
        }
        
        // Filter and rank suggestions
        const rankedSuggestions = this.rankSuggestions(suggestions, currentWord);
        
        // Return top results
        this.currentSuggestions = rankedSuggestions.slice(0, maxResults);
        return this.currentSuggestions;
    }

    /**
     * Extract the current word being typed from input
     * @param {string} input - Full input text
     * @param {number} cursorPos - Current cursor position
     * @returns {string} Current word being typed
     */
    getCurrentWord(input, cursorPos = input.length) {
        // Find word boundaries around the cursor position
        let start = cursorPos;
        let end = cursorPos;
        
        // Move start backwards to find word start
        while (start > 0 && /[a-zA-Z0-9_\-.]/.test(input[start - 1])) {
            start--;
        }
        
        // Move end forwards to find word end
        while (end < input.length && /[a-zA-Z0-9_\-.]/.test(input[end])) {
            end++;
        }
        
        const currentWord = input.substring(start, end);
        
        // Clean up common punctuation that shouldn't be part of the word
        return currentWord.replace(/^[.,;:!?(){}[\]"'`~]+|[.,;:!?(){}[\]"'`~]+$/g, '');
    }

    /**
     * Rank suggestions based on relevance and frequency
     * @param {string[]} suggestions - Raw suggestions from trie
     * @param {string} currentWord - Current word being typed
     * @returns {string[]} Ranked suggestions
     */
    rankSuggestions(suggestions, currentWord) {
        const currentWordLower = this.settings.caseInsensitive ? currentWord.toLowerCase() : currentWord;
        
        return suggestions
            .filter(suggestion => {
                // Exclude exact matches that are already complete
                const suggestionToCompare = this.settings.caseInsensitive ? suggestion.toLowerCase() : suggestion;
                return suggestionToCompare !== currentWordLower;
            })
            .sort((a, b) => {
                const aLower = this.settings.caseInsensitive ? a.toLowerCase() : a;
                const bLower = this.settings.caseInsensitive ? b.toLowerCase() : b;
                
                // Prioritize exact prefix matches
                const aStartsWith = aLower.startsWith(currentWordLower);
                const bStartsWith = bLower.startsWith(currentWordLower);
                
                if (aStartsWith && !bStartsWith) return -1;
                if (!aStartsWith && bStartsWith) return 1;
                
                // Then prioritize shorter words (more likely to be what user wants)
                const lengthDiff = a.length - b.length;
                if (lengthDiff !== 0) return lengthDiff;
                
                // Alphabetical order as final sort
                return a.localeCompare(b);
            });
    }

    /**
     * Setup monitoring for changes in the PR content
     */
    setupChangeMonitoring() {
        this.parser.monitorForChanges((newWords) => {
            // Throttle updates to avoid excessive rebuilding
            const now = Date.now();
            if (now - this.lastUpdateTime > this.updateThreshold) {
                console.log('GitHub PR AutoComplete: Updating word list');
                this.buildTrie(newWords);
            }
        });
    }

    /**
     * Check if auto-complete should be triggered for a given element
     * @param {Element} element - Input element to check
     * @returns {boolean} True if auto-complete should be active
     */
    shouldActivateFor(element) {
        if (!element || !this.isInitialized || !this.settings.enabled) {
            return false;
        }

        // Check if it's a text input area on GitHub
        const validSelectors = [
            'textarea[name="comment[body]"]',           // PR comments
            'textarea[name="pull_request_review[body]"]', // Review comments
            'textarea[name="commit_comment[body]"]',    // Commit comments
            '.js-comment-field',                        // Generic comment fields
            '.js-suggester-field',                      // GitHub's suggestion fields
            'textarea.js-size-to-fit',                  // Auto-resizing textareas
            '[data-testid="comment-body-textarea"]',    // New GitHub UI
            'textarea[placeholder*="comment"]',          // Comment textareas
            'textarea[aria-label*="comment"]'           // Accessible comment fields
        ];

        return validSelectors.some(selector => {
            return element.matches(selector) || element.closest(selector);
        });
    }

    /**
     * Update settings
     * @param {Object} newSettings - New settings to apply
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.maxSuggestions = this.settings.maxSuggestions;
        this.triggerCharacters = this.settings.triggerCharacters || this.triggerCharacters;
        
        console.log('GitHub PR AutoComplete: Settings updated', this.settings);
    }

    /**
     * Get statistics about the current auto-complete state
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            enabled: this.settings.enabled,
            totalWords: this.wordCache.size,
            trieSize: this.trie.size(),
            lastUpdate: new Date(this.lastUpdateTime).toLocaleString(),
            currentSuggestions: this.currentSuggestions.length,
            settings: this.settings,
            triggerCharacters: this.triggerCharacters
        };
    }

    /**
     * Manually refresh the word list (useful for debugging)
     */
    async refresh() {
        console.log('GitHub PR AutoComplete: Manual refresh triggered');
        const words = await this.extractWords();
        this.buildTrie(words);
    }

    /**
     * Add custom words to the auto-complete (for extensibility)
     * @param {string[]} words - Array of words to add
     */
    addCustomWords(words) {
        if (!Array.isArray(words)) return;
        
        words.forEach(word => {
            if (word && typeof word === 'string' && word.length >= this.settings.minWordLength) {
                this.trie.insert(word);
                this.wordCache.add(word);
            }
        });
        
        console.log(`GitHub PR AutoComplete: Added ${words.length} custom words`);
    }

    /**
     * Clear all data and reset the engine
     */
    reset() {
        this.trie = new ACT();
        this.wordCache = new Set();
        this.currentSuggestions = [];
        this.isInitialized = false;
        this.lastUpdateTime = 0;
        console.log('GitHub PR AutoComplete: Engine reset');
    }
}

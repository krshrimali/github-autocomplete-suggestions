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
        
        // Debug mode
        this.debug = true; // Set to true for debugging
        
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
            
            if (this.debug) {
                console.log('GitHub PR AutoComplete: Extracted words:', words);
                console.log('GitHub PR AutoComplete: Words size:', words ? words.size : 0);
            }
            
            // If no words found, add some common programming words as fallback
            if (!words || words.size === 0) {
                console.log('GitHub PR AutoComplete: No words extracted, adding fallback words');
                const fallbackWords = new Set([
                    'function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while',
                    'class', 'extends', 'implements', 'interface', 'type', 'enum', 'namespace',
                    'import', 'export', 'default', 'async', 'await', 'promise', 'resolve', 'reject',
                    'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'static',
                    'public', 'private', 'protected', 'abstract', 'final', 'readonly',
                    'string', 'number', 'boolean', 'array', 'object', 'null', 'undefined',
                    'true', 'false', 'void', 'any', 'unknown', 'never', 'symbol',
                    'data', 'result', 'response', 'request', 'config', 'options', 'settings',
                    'value', 'item', 'element', 'node', 'parent', 'child', 'root', 'leaf',
                    'init', 'setup', 'configure', 'validate', 'parse', 'format', 'convert',
                    'add', 'remove', 'update', 'delete', 'create', 'destroy', 'load', 'save'
                ]);
                this.buildTrie(fallbackWords);
            } else {
                // Build the Trie
                this.buildTrie(words);
            }
            
            // Set up monitoring for changes
            this.setupChangeMonitoring();
            
            this.isInitialized = true;
            console.log(`GitHub PR AutoComplete: Initialized with ${this.wordCache.size} words in cache`);
            console.log('GitHub PR AutoComplete: Settings:', this.settings);
            
            if (this.debug) {
                console.log('GitHub PR AutoComplete: Final stats:', this.getStats());
            }
            
        } catch (error) {
            console.error('GitHub PR AutoComplete: Initialization failed', error);
            // Reset initialization state on error
            this.isInitialized = false;
            this.trie = new ACT(); // Reset trie
            this.wordCache = new Set(); // Reset cache
            
            // Try to initialize with fallback words only
            try {
                console.log('GitHub PR AutoComplete: Attempting initialization with fallback words only...');
                const fallbackWords = new Set([
                    'function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while',
                    'class', 'extends', 'implements', 'interface', 'type', 'enum', 'namespace',
                    'import', 'export', 'default', 'async', 'await', 'promise', 'resolve', 'reject',
                    'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'static',
                    'public', 'private', 'protected', 'abstract', 'final', 'readonly',
                    'string', 'number', 'boolean', 'array', 'object', 'null', 'undefined',
                    'true', 'false', 'void', 'any', 'unknown', 'never', 'symbol',
                    'data', 'result', 'response', 'request', 'config', 'options', 'settings',
                    'value', 'item', 'element', 'node', 'parent', 'child', 'root', 'leaf',
                    'init', 'setup', 'configure', 'validate', 'parse', 'format', 'convert',
                    'add', 'remove', 'update', 'delete', 'create', 'destroy', 'load', 'save'
                ]);
                this.buildTrie(fallbackWords);
                this.isInitialized = true;
                console.log('GitHub PR AutoComplete: Successfully initialized with fallback words only');
            } catch (fallbackError) {
                console.error('GitHub PR AutoComplete: Fallback initialization also failed', fallbackError);
            }
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
        
        if (!words || words.size === 0) {
            console.warn('GitHub PR AutoComplete: No words provided to build Trie');
            return;
        }
        
        // Clear existing trie
        this.trie = new ACT();
        this.wordCache = new Set(words);
        
        let insertedCount = 0;
        
        // Insert all words into the trie
        let filteredCount = 0;
        let errorCount = 0;
        for (const word of words) {
            if (word && word.length >= this.settings.minWordLength) {
                // Filter out problematic words that might cause issues
                if (this.isValidWordForTrie(word)) {
                    try {
                        this.trie.insert(word);
                        insertedCount++;
                    } catch (error) {
                        errorCount++;
                        if (this.debug && errorCount <= 5) {
                            console.warn('GitHub PR AutoComplete: Error inserting word:', word, error);
                        }
                    }
                } else {
                    filteredCount++;
                    if (this.debug && filteredCount <= 10) {
                        console.log('GitHub PR AutoComplete: Filtered out word:', word);
                    }
                }
            }
        }
        
        if (errorCount > 0) {
            console.warn(`GitHub PR AutoComplete: ${errorCount} words failed to insert due to errors`);
        }
        
        if (this.debug && filteredCount > 0) {
            console.log(`GitHub PR AutoComplete: Filtered out ${filteredCount} invalid words`);
        }
        
        this.lastUpdateTime = Date.now();
        console.log(`GitHub PR AutoComplete: Trie built successfully with ${insertedCount} words inserted`);
        console.log('GitHub PR AutoComplete: Trie size:', this.trie.size());
        
        // Log some sample words for debugging
        const sampleWords = Array.from(words).slice(0, 10);
        console.log('GitHub PR AutoComplete: Sample words in Trie:', sampleWords);
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
        
        // Trigger on trigger characters
        if (this.triggerCharacters.includes(charBeforeCursor) || 
            this.triggerCharacters.includes(charAtCursor)) {
            return true;
        }
        
        // Trigger if we're continuing to type a word or complex identifier
        if (/[a-zA-Z0-9_\-.]/.test(charBeforeCursor)) {
            return true;
        }
        
        // Special trigger for complex identifiers
        const currentWord = this.getCurrentWord(input, cursorPos);
        if (currentWord && currentWord.length >= this.settings.minWordLength) {
            // Trigger for complex identifiers even if they're longer
            if (this.isComplexIdentifier(currentWord) && currentWord.length >= 2) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get auto-complete suggestions for a given input
     * @param {string} input - Current user input
     * @param {number} maxResults - Maximum number of suggestions to return
     * @param {number} cursorPos - Current cursor position
     * @returns {string[]} Array of suggestions
     */
    getSuggestions(input, maxResults = this.maxSuggestions, cursorPos = input.length) {
        if (this.debug) {
            console.log('GitHub PR AutoComplete: getSuggestions called with:', { input, maxResults, cursorPos });
        }
        
        if (!this.isInitialized || !input || !this.settings.enabled) {
            if (this.debug) {
                console.log('GitHub PR AutoComplete: getSuggestions early return - not initialized or disabled');
            }
            return [];
        }

        // Check if we should trigger autocomplete
        if (!this.shouldTrigger(input, cursorPos)) {
            if (this.debug) {
                console.log('GitHub PR AutoComplete: getSuggestions early return - should not trigger');
            }
            return [];
        }

        // Get the current word being typed
        const currentWord = this.getCurrentWord(input, cursorPos);
        if (!currentWord || currentWord.length < this.settings.minWordLength) {
            if (this.debug) {
                console.log('GitHub PR AutoComplete: getSuggestions early return - invalid current word:', currentWord);
            }
            return [];
        }

        if (this.debug) {
            console.log('GitHub PR AutoComplete: Current word:', currentWord);
        }

        // Get suggestions from trie using fuzzy matching if enabled
        let suggestions;
        if (this.settings.fuzzyMatching) {
            suggestions = this.trie.search(currentWord, maxResults);
        } else {
            suggestions = this.trie.autoComplete(currentWord);
        }
        
        if (this.debug) {
            console.log('GitHub PR AutoComplete: Raw suggestions from trie:', suggestions);
        }
        
        // Filter and rank suggestions
        const rankedSuggestions = this.rankSuggestions(suggestions, currentWord);
        
        // Return top results
        this.currentSuggestions = rankedSuggestions.slice(0, maxResults);
        
        if (this.debug) {
            console.log('GitHub PR AutoComplete: Final suggestions:', this.currentSuggestions);
        }
        
        return this.currentSuggestions;
    }

    /**
     * Extract the current word being typed from input
     * @param {string} input - Full input text
     * @param {number} cursorPos - Current cursor position
     * @returns {string} Current word being typed
     */
    getCurrentWord(input, cursorPos = input.length) {
        // First, try to extract complex identifiers
        const complexWord = this.getComplexCurrentWord(input, cursorPos);
        if (complexWord) {
            return complexWord;
        }
        
        // Fallback to simple word extraction
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
     * Extract complex current word (method calls, property access, etc.)
     * @param {string} input - Full input text
     * @param {number} cursorPos - Current cursor position
     * @returns {string|null} Complex word or null if not found
     */
    getComplexCurrentWord(input, cursorPos = input.length) {
        if (!input || cursorPos === 0) return null;
        
        // Get the text before the cursor
        const beforeCursor = input.substring(0, cursorPos);
        
        // Pattern 1: Method calls like self.function(), obj.method()
        const methodCallMatch = beforeCursor.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\.[a-zA-Z_$][a-zA-Z0-9_$]*\s*\([^)]*$/);
        if (methodCallMatch) {
            return methodCallMatch[0];
        }
        
        // Pattern 2: Property access like obj.property, self.attribute
        const propertyAccessMatch = beforeCursor.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\.[a-zA-Z_$][a-zA-Z0-9_$]*$/);
        if (propertyAccessMatch) {
            return propertyAccessMatch[0];
        }
        
        // Pattern 3: Snake_case identifiers like indexing_path, user_name
        const snakeCaseMatch = beforeCursor.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*(?:_[a-zA-Z0-9_$]+)*$/);
        if (snakeCaseMatch) {
            return snakeCaseMatch[0];
        }
        
        // Pattern 4: Kebab-case identifiers like user-name, api-endpoint
        const kebabCaseMatch = beforeCursor.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*(?:-[a-zA-Z0-9_$]+)*$/);
        if (kebabCaseMatch) {
            return kebabCaseMatch[0];
        }
        
        // Pattern 5: Array access like array[index], obj[key]
        const arrayAccessMatch = beforeCursor.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\s*\[[^\]]*$/);
        if (arrayAccessMatch) {
            return arrayAccessMatch[0];
        }
        
        // Pattern 6: Function calls like function(), method()
        const functionCallMatch = beforeCursor.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\s*\([^)]*$/);
        if (functionCallMatch) {
            return functionCallMatch[0];
        }
        
        return null;
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
                
                // Get scores for both suggestions
                const aScore = this.getSuggestionScore(a, currentWordLower);
                const bScore = this.getSuggestionScore(b, currentWordLower);
                
                // Sort by score (higher is better)
                if (aScore !== bScore) {
                    return bScore - aScore;
                }
                
                // If scores are equal, prioritize shorter words
                const lengthDiff = a.length - b.length;
                if (lengthDiff !== 0) return lengthDiff;
                
                // Alphabetical order as final sort
                return a.localeCompare(b);
            });
    }

    /**
     * Calculate a score for a suggestion based on relevance to current word
     * @param {string} suggestion - The suggestion to score
     * @param {string} currentWord - The current word being typed (lowercase)
     * @returns {number} Score (higher is better)
     */
    getSuggestionScore(suggestion, currentWord) {
        const suggestionLower = this.settings.caseInsensitive ? suggestion.toLowerCase() : suggestion;
        let score = 0;
        
        // Exact prefix match gets highest score
        if (suggestionLower.startsWith(currentWord)) {
            score += 100;
            
            // Bonus for exact match
            if (suggestionLower === currentWord) {
                score += 50;
            }
        }
        
        // Bonus for complex identifier matches
        if (this.isComplexIdentifier(suggestion)) {
            score += 20;
            
            // Extra bonus for method calls and property access
            if (suggestion.includes('.')) {
                score += 10;
            }
            
            // Bonus for snake_case and kebab-case
            if (suggestion.includes('_') || suggestion.includes('-')) {
                score += 5;
            }
        }
        
        // Bonus for shorter suggestions (more likely to be what user wants)
        score += Math.max(0, 20 - suggestion.length);
        
        // Bonus for common programming patterns
        if (this.isCommonProgrammingPattern(suggestion)) {
            score += 15;
        }
        
        return score;
    }

    /**
     * Check if a suggestion is a complex identifier
     * @param {string} suggestion - The suggestion to check
     * @returns {boolean} True if it's a complex identifier
     */
    isComplexIdentifier(suggestion) {
        return suggestion.includes('.') || 
               suggestion.includes('_') || 
               suggestion.includes('-') || 
               suggestion.includes('(') || 
               suggestion.includes('[');
    }

    /**
     * Check if a suggestion matches common programming patterns
     * @param {string} suggestion - The suggestion to check
     * @returns {boolean} True if it matches common patterns
     */
    isCommonProgrammingPattern(suggestion) {
        const commonPatterns = [
            /^[a-z_][a-z0-9_]*$/, // snake_case
            /^[a-z][a-z0-9-]*$/, // kebab-case
            /^[a-z][a-z0-9]*\.[a-z][a-z0-9]*$/, // obj.property
            /^[a-z][a-z0-9]*\.[a-z][a-z0-9]*\(\)$/, // obj.method()
            /^[a-z][a-z0-9]*\[[^\]]+\]$/, // array[index]
        ];
        
        return commonPatterns.some(pattern => pattern.test(suggestion));
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
     * Check if a word is valid for insertion into the trie
     * @param {string} word - Word to validate
     * @returns {boolean} True if word is valid for trie
     */
    isValidWordForTrie(word) {
        if (!word || typeof word !== 'string') return false;
        
        // Check length - allow longer words for complex identifiers
        const maxLength = this.isComplexIdentifier(word) ? 200 : 100;
        if (word.length < this.settings.minWordLength || word.length > maxLength) {
            return false;
        }
        
        // Check for problematic characters that might cause issues
        const problematicChars = /[\u0000-\u001F\u007F-\u009F]/; // Control characters
        if (problematicChars.test(word)) {
            return false;
        }
        
        // Check for words that are just repeated characters (might cause issues)
        if (word.length > 2 && /^(.)\1+$/.test(word)) {
            return false;
        }
        
        // Must contain at least one letter
        if (!/[a-zA-Z]/.test(word)) {
            return false;
        }
        
        // For complex identifiers, allow more characters
        if (this.isComplexIdentifier(word)) {
            // Allow dots, underscores, hyphens, parentheses, brackets for complex identifiers
            const validComplexChars = /^[a-zA-Z0-9_\-\.\(\)\[\]\s]+$/;
            return validComplexChars.test(word);
        }
        
        return true;
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

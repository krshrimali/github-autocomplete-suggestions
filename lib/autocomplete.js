/**
 * GitHub PR AutoComplete Engine
 * Combines the Trie data structure with GitHub parsing for intelligent auto-complete
 */
class AutoCompleteEngine {
    constructor() {
        this.trie = new ACT();
        // TODO: Not sure if using levenshtein is the best approach here. Reconsider.
        // this.levenshtein = new LevenshteinCheck();
        // this.levenshtein_threshold = 3; // Default threshold for Levenshtein distance
        this.parser = new GitHubParser();
        this.isInitialized = false;
        this.currentSuggestions = [];
        this.maxSuggestions = 10;
        
        // Cache for performance
        this.wordCache = new Set();
        this.lastUpdateTime = 0;
        this.updateThreshold = 5000; // 5 seconds
    }

    /**
     * Initialize the auto-complete engine
     * Extract words from PR and build the Trie
     */
    async initialize() {
        console.log('GitHub PR AutoComplete: Initializing...');
        
        try {
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
        
        // Insert all words into the trie (preserve case)
        for (const word of words) {
            if (word && word.length > 0) {
                this.trie.insert(word); // Keep original case
                // Also insert lowercase version for case-insensitive matching
                const lowerWord = word.toLowerCase();
                if (lowerWord !== word) {
                    this.trie.insert(lowerWord);
                }
            }
        }
        
        this.lastUpdateTime = Date.now();
        console.log('GitHub PR AutoComplete: Trie built successfully');
    }

    /**
     * Get auto-complete suggestions for a given input
     * @param {string} input - Current user input
     * @param {number} maxResults - Maximum number of suggestions to return
     * @returns {string[]} Array of suggestions
     */
    getSuggestions(input, maxResults = this.maxSuggestions) {
        if (!this.isInitialized || !input || input.length < 1) {
            return [];
        }

        // Get the current word being typed
        const currentWord = this.getCurrentWord(input);
        if (!currentWord || currentWord.length < 1) {
            return [];
        }

        console.log('GitHub PR AutoComplete: Getting suggestions for:', currentWord);

        // Get suggestions from trie (try both original case and lowercase)
        let suggestions = this.trie.autoComplete(currentWord);
        
        // If no exact case match, try lowercase
        if (suggestions.length === 0) {
            suggestions = this.trie.autoComplete(currentWord.toLowerCase());
        }
        
        // Filter and rank suggestions
        const rankedSuggestions = this.rankSuggestions(suggestions, currentWord);
        
        // Return top results
        this.currentSuggestions = rankedSuggestions.slice(0, maxResults);
        console.log('GitHub PR AutoComplete: Found suggestions:', this.currentSuggestions);
        return this.currentSuggestions;
    }

    /**
     * Extract the current word being typed from input
     * @param {string} input - Full input text
     * @returns {string} Current word being typed
     */
    getCurrentWord(input) {
        if (!input) return '';
        
        // Get cursor position (assume cursor is at end for now)
        const cursorPos = input.length;
        
        // Find word boundaries around cursor position
        let wordStart = cursorPos;
        let wordEnd = cursorPos;
        
        // Move backward to find start of current word
        while (wordStart > 0 && /[a-zA-Z0-9_]/.test(input[wordStart - 1])) {
            wordStart--;
        }
        
        // Move forward to find end of current word
        while (wordEnd < input.length && /[a-zA-Z0-9_]/.test(input[wordEnd])) {
            wordEnd++;
        }
        
        const currentWord = input.substring(wordStart, wordEnd);
        console.log('GitHub PR AutoComplete: Current word extracted:', currentWord);
        return currentWord;
    }

    /**
     * Rank suggestions based on relevance and frequency
     * @param {string[]} suggestions - Raw suggestions from trie
     * @param {string} currentWord - Current word being typed
     * @returns {string[]} Ranked suggestions
     */
    rankSuggestions(suggestions, currentWord) {
        const currentWordLower = currentWord.toLowerCase();
        
        return suggestions
            .filter(suggestion => {
                // Exclude the exact match if it's already complete
                return suggestion.toLowerCase() !== currentWordLower;
            })
            .sort((a, b) => {
                // Prioritize exact case matches first
                const aExactCase = a.startsWith(currentWord);
                const bExactCase = b.startsWith(currentWord);
                
                if (aExactCase && !bExactCase) return -1;
                if (!aExactCase && bExactCase) return 1;
                
                // Then prioritize case-insensitive matches
                const aLowerMatch = a.toLowerCase().startsWith(currentWordLower);
                const bLowerMatch = b.toLowerCase().startsWith(currentWordLower);
                
                if (aLowerMatch && !bLowerMatch) return -1;
                if (!aLowerMatch && bLowerMatch) return 1;
                
                // Prioritize shorter words (more likely to be what user wants)
                const lengthDiff = a.length - b.length;
                if (lengthDiff !== 0) return lengthDiff;
                
                // Alphabetical order as secondary sort
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
        if (!element || !this.isInitialized) {
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
            '[data-testid="comment-body-textarea"]'     // New GitHub UI
        ];

        const isValidElement = validSelectors.some(selector => {
            return element.matches(selector) || element.closest(selector);
        });

        console.log('GitHub PR AutoComplete: Should activate for element:', isValidElement, element);
        return isValidElement;
    }

    /**
     * Get statistics about the current auto-complete state
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            totalWords: this.wordCache.size,
            trieSize: this.trie.size(),
            lastUpdate: new Date(this.lastUpdateTime).toLocaleString(),
            currentSuggestions: this.currentSuggestions.length
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
            if (word && typeof word === 'string' && word.length > 0) {
                this.trie.insert(word); // Preserve original case
                this.trie.insert(word.toLowerCase()); // Also add lowercase
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

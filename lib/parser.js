/**
 * GitHub PR Content Parser
 * Extracts meaningful words from the "Files changed" tab for auto-complete
 */
class GitHubParser {
    constructor() {
        this.codeKeywords = new Set([
            // Common programming keywords to include
            'function', 'class', 'const', 'let', 'var', 'return', 'import', 'export',
            'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue',
            'try', 'catch', 'finally', 'throw', 'async', 'await', 'promise',
            'public', 'private', 'protected', 'static', 'abstract', 'interface',
            'extends', 'implements', 'constructor', 'super', 'this', 'new',
            'true', 'false', 'null', 'undefined', 'typeof', 'instanceof'
        ]);
        
        this.minWordLength = 2;
        this.maxWordLength = 50;
    }

    /**
     * Extract all meaningful words from GitHub PR files changed tab
     * @returns {Promise<Set<string>>} Set of unique words found in the PR
     */
    async extractWordsFromPR() {
        const words = new Set();
        
        console.log('GitHub PR AutoComplete: Starting word extraction...');
        
        // Wait for the page to load and try multiple times if needed
        const filesChangedContent = await this.getFilesChangedContent();
        
        console.log('GitHub PR AutoComplete: Files changed content:', filesChangedContent);
        
        if (!filesChangedContent) {
            console.log('GitHub PR AutoComplete: Files changed content not found');
            return words;
        }

        if (typeof filesChangedContent.querySelectorAll !== 'function') {
            console.error('GitHub PR AutoComplete: filesChangedContent is not a DOM element:', typeof filesChangedContent, filesChangedContent);
            return words;
        }

        // Extract words from different parts of the PR
        console.log('GitHub PR AutoComplete: Extracting from code blocks...');
        this.extractFromCodeBlocks(filesChangedContent, words);
        
        console.log('GitHub PR AutoComplete: Extracting from file names...');
        this.extractFromFileNames(words);
        
        console.log('GitHub PR AutoComplete: Extracting from comments...');
        this.extractFromComments(words);
        
        // Also extract from PR title and description
        console.log('GitHub PR AutoComplete: Extracting from PR title and description...');
        this.extractFromPRMetadata(words);
        
        // Add some common programming words as fallback
        if (words.size === 0) {
            console.log('GitHub PR AutoComplete: No words found, adding common programming words as fallback');
            this.addCommonProgrammingWords(words);
        }
        
        console.log(`GitHub PR AutoComplete: Extracted ${words.size} unique words`);
        console.log('GitHub PR AutoComplete: Sample words:', Array.from(words).slice(0, 20));
        return words;
    }

    /**
     * Get the files changed content from GitHub PR page
     * @returns {Promise<Element|null>} The files changed container element
     */
    async getFilesChangedContent() {
        // Try multiple selectors as GitHub's DOM structure can vary
        const selectors = [
            '#files_bucket',
            '.js-diff-progressive-container',
            '[data-target="diff-layout.diffContainer"]',
            '.diff-view',
            '.js-diff-table',
            '.file-diff-split',
            '.js-file-content',
            '[data-testid="pr-diff-view"]',
            '.pr-toolbar + div', // Sometimes the diff is right after the toolbar
            'div[data-hpc]' // GitHub's progressive container
        ];

        console.log('GitHub PR AutoComplete: Searching for files changed content...');

        // First, try to find the element immediately
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`GitHub PR AutoComplete: Found files content with selector: ${selector}`, element);
                return element;
            }
        }

        console.log('GitHub PR AutoComplete: No immediate match found, waiting for DOM changes...');

        // If not found, wait and try again with MutationObserver
        return new Promise((resolve) => {
            const observer = new MutationObserver((mutations, obs) => {
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        obs.disconnect();
                        resolve(element);
                        return;
                    }
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // Timeout after 5 seconds
            setTimeout(() => {
                observer.disconnect();
                console.log('GitHub PR AutoComplete: Timeout waiting for files content, using document as fallback');
                // As a last resort, use the document body if we're on a PR page
                if (window.location.href.includes('/pull/')) {
                    resolve(document.body);
                } else {
                    resolve(null);
                }
            }, 5000);
        });
    }

    /**
     * Extract words from code blocks in the diff
     * @param {Element} container - The files changed container
     * @param {Set<string>} words - Set to add words to
     */
    extractFromCodeBlocks(container, words) {
        if (!container || typeof container.querySelectorAll !== 'function') {
            console.warn('GitHub PR AutoComplete: Invalid container for extractFromCodeBlocks', container);
            return;
        }

        // Find all code lines (added, removed, and context)
        const codeLines = container.querySelectorAll(
            '.blob-code-inner, .blob-code, .js-file-line, .diff-line-code, ' +
            '[data-code-marker], .blob-code-content, .js-blob-code-container td, ' +
            '.diff-table td, .js-file-line-container, .blob-code-marker, ' +
            '.blob-code-addition, .blob-code-deletion, .blob-code-context, ' +
            'td.blob-code, td.blob-code-inner, .js-file-line-container td'
        );

        console.log(`GitHub PR AutoComplete: Found ${codeLines.length} code lines`);

        // If no code lines found, try alternative selectors
        if (codeLines.length === 0) {
            console.log('GitHub PR AutoComplete: No code lines found with primary selectors, trying alternatives...');
            
            // Try to find any text content in the container
            const allTextElements = container.querySelectorAll('*');
            let textFound = false;
            
            allTextElements.forEach(element => {
                if (element.children.length === 0 && element.textContent && element.textContent.trim()) {
                    const text = element.textContent.trim();
                    if (text.length > 2 && text.length < 100) { // Reasonable word length
                        this.extractWordsFromText(text, words);
                        textFound = true;
                    }
                }
            });
            
            if (textFound) {
                console.log('GitHub PR AutoComplete: Found text content using alternative method');
            }
        } else {
            codeLines.forEach(line => {
                const text = line.textContent || '';
                this.extractWordsFromText(text, words);
            });
        }
    }

    /**
     * Extract words from file names in the PR
     * @param {Set<string>} words - Set to add words to
     */
    extractFromFileNames(words) {
        // Extract from file headers
        const fileHeaders = document.querySelectorAll(
            '.file-header [title], .file-info a, .js-navigation-open'
        );

        fileHeaders.forEach(header => {
            const fileName = header.textContent || header.getAttribute('title') || '';
            this.extractWordsFromFileName(fileName, words);
        });
    }

    /**
     * Extract words from existing comments in the PR
     * @param {Set<string>} words - Set to add words to
     */
    extractFromComments(words) {
        const comments = document.querySelectorAll(
            '.comment-body, .review-comment-contents, .js-comment-body'
        );

        comments.forEach(comment => {
            const text = comment.textContent || '';
            this.extractWordsFromText(text, words);
        });
    }

    /**
     * Extract meaningful words from a text string
     * @param {string} text - Input text
     * @param {Set<string>} words - Set to add words to
     */
    extractWordsFromText(text, words) {
        if (!text) return;

        // Remove common code symbols and split into potential words
        const cleanText = text
            .replace(/[{}()\[\];,.<>!@#$%^&*+=|\\`~"]/g, ' ')
            .replace(/[-_]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const potentialWords = cleanText.split(' ');

        potentialWords.forEach(word => {
            word = word.trim();
            
            // Filter words
            if (this.isValidWord(word)) {
                words.add(word);
                
                // Also add camelCase/PascalCase parts
                this.extractCamelCaseWords(word, words);
            }
        });
    }

    /**
     * Extract words from file names (handle extensions, paths, etc.)
     * @param {string} fileName - File name/path
     * @param {Set<string>} words - Set to add words to
     */
    extractWordsFromFileName(fileName, words) {
        if (!fileName) return;
        words.add(fileName);

        // Remove file extension and path separators
        const cleanName = fileName
            .replace(/\.[^.]*$/, '') // Remove extension
            .replace(/[\/\\]/g, ' ') // Replace path separators
            .replace(/[-_.]/g, ' '); // Replace common separators

        this.extractWordsFromText(cleanName, words);
    }

    /**
     * Extract individual words from camelCase or PascalCase strings
     * @param {string} word - Input word
     * @param {Set<string>} words - Set to add words to
     */
    extractCamelCaseWords(word, words) {
        // Split camelCase/PascalCase: myVariableName -> my, Variable, Name
        const camelCaseParts = word.split(/(?=[A-Z])/).filter(part => part.length > 0);
        
        camelCaseParts.forEach(part => {
            // const cleanPart = part.toLowerCase();
            if (this.isValidWord(part)) {
                words.add(part);
            }
        });
    }

    /**
     * Check if a word is valid for auto-complete
     * @param {string} word - Word to validate
     * @returns {boolean} True if word is valid
     */
    isValidWord(word) {
        if (!word || typeof word !== 'string') return false;
        
        // Length check
        if (word.length < this.minWordLength || word.length > this.maxWordLength) {
            return false;
        }

        // Must contain at least one letter
        if (!/[a-zA-Z]/.test(word)) {
            return false;
        }

        // Exclude common noise words but include programming keywords
        const noiseWords = new Set([
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
            'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be',
            'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
            'could', 'should', 'may', 'might', 'must', 'can', 'shall'
        ]);

        const lowerWord = word.toLowerCase();
        
        // Include if it's a programming keyword
        if (this.codeKeywords.has(lowerWord)) {
            return true;
        }

        // Exclude common noise words
        if (noiseWords.has(lowerWord)) {
            return false;
        }

        // Exclude words that are just numbers
        if (/^\d+$/.test(word)) {
            return false;
        }

        // Exclude very common single characters
        if (word.length === 1 && !/[a-zA-Z]/.test(word)) {
            return false;
        }

        return true;
    }

    /**
     * Extract words from PR title and description
     * @param {Set<string>} words - Set to add words to
     */
    extractFromPRMetadata(words) {
        // Extract from PR title
        const titleSelectors = [
            'h1.gh-header-title',
            '.js-issue-title',
            '[data-testid="issue-title"]',
            'h1[data-testid="pr-title"]'
        ];
        
        for (const selector of titleSelectors) {
            const titleElement = document.querySelector(selector);
            if (titleElement) {
                const titleText = titleElement.textContent || '';
                console.log('GitHub PR AutoComplete: Found PR title:', titleText);
                this.extractWordsFromText(titleText, words);
                break;
            }
        }
        
        // Extract from PR description
        const descriptionSelectors = [
            '.comment-body',
            '.js-comment-body',
            '[data-testid="comment-body"]',
            '.markdown-body'
        ];
        
        for (const selector of descriptionSelectors) {
            const descElements = document.querySelectorAll(selector);
            descElements.forEach(element => {
                const descText = element.textContent || '';
                this.extractWordsFromText(descText, words);
            });
        }
    }

    /**
     * Add common programming words as fallback
     * @param {Set<string>} words - Set to add words to
     */
    addCommonProgrammingWords(words) {
        const commonWords = [
            // JavaScript/TypeScript
            'function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while',
            'class', 'extends', 'implements', 'interface', 'type', 'enum', 'namespace',
            'import', 'export', 'default', 'async', 'await', 'promise', 'resolve', 'reject',
            'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'static',
            'public', 'private', 'protected', 'abstract', 'final', 'readonly',
            'get', 'set', 'constructor', 'method', 'property', 'parameter',
            
            // Common programming terms
            'string', 'number', 'boolean', 'array', 'object', 'null', 'undefined',
            'true', 'false', 'void', 'any', 'unknown', 'never', 'symbol',
            'map', 'set', 'weakmap', 'weakset', 'promise', 'generator', 'iterator',
            'callback', 'closure', 'scope', 'context', 'binding', 'hoisting',
            'prototype', 'inheritance', 'polymorphism', 'encapsulation', 'abstraction',
            
            // Common variable names
            'data', 'result', 'response', 'request', 'config', 'options', 'settings',
            'value', 'item', 'element', 'node', 'parent', 'child', 'root', 'leaf',
            'index', 'key', 'id', 'name', 'title', 'description', 'content',
            'error', 'exception', 'warning', 'info', 'debug', 'log', 'console',
            
            // Common function names
            'init', 'setup', 'configure', 'validate', 'parse', 'format', 'convert',
            'transform', 'filter', 'map', 'reduce', 'find', 'search', 'sort',
            'add', 'remove', 'update', 'delete', 'create', 'destroy', 'load',
            'save', 'export', 'import', 'upload', 'download', 'send', 'receive'
        ];
        
        commonWords.forEach(word => {
            if (this.isValidWord(word)) {
                words.add(word);
            }
        });
        
        console.log(`GitHub PR AutoComplete: Added ${commonWords.length} common programming words`);
    }

    /**
     * Monitor for changes in the Files changed tab and re-extract words
     * @param {Function} callback - Callback function to call when words are updated
     */
    monitorForChanges(callback) {
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            mutations.forEach(mutation => {
                // Check if files changed content was modified
                if (mutation.target.closest('#files_bucket') || 
                    mutation.target.closest('.js-diff-progressive-container')) {
                    shouldUpdate = true;
                }
            });

            if (shouldUpdate) {
                setTimeout(async () => {
                    const words = await this.extractWordsFromPR();
                    callback(words);
                }, 500); // Small delay to ensure DOM is updated
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        return observer;
    }
}

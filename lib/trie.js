/**
 * TrieNode class - equivalent to the C++ TrieNode
 */
class TrieNode {
    constructor() {
        this.data = '';
        this.isEndOfWord = false;
        this.children = new Map(); // Using Map instead of unordered_map
    }
}

/**
 * Auto Complete Tree (ACT) class - JavaScript port of the C++ implementation
 */
class ACT {
    constructor() {
        this.root = new TrieNode();
        this.root.data = '\0';
        this.root.isEndOfWord = false;
    }

    /**
     * Insert a word into the Trie
     * @param {string} word - The word to insert
     */
    insert(word) {
        if (!word || typeof word !== 'string') return;
        // Store both original and lowercase versions for case-insensitive matching
        this.insertAllLetters(this.root, word, 0);
        if (word !== word.toLowerCase()) {
            this.insertAllLetters(this.root, word.toLowerCase(), 0);
        }
    }

    /**
     * Recursive helper to insert all letters of a word
     * @param {TrieNode} node - Current node
     * @param {string} word - Word being inserted
     * @param {number} index - Current character index
     */
    insertAllLetters(node, word, index) {
        if (index === word.length) {
            // End of word
            node.isEndOfWord = true;
            return;
        }

        const letter = word[index];
        if (!node.children.has(letter)) {
            // Letter not found in children
            const newNode = new TrieNode();
            newNode.data = letter;
            newNode.isEndOfWord = false;
            node.children.set(letter, newNode);
            this.insertAllLetters(newNode, word, index + 1);
        } else {
            // Letter found in children
            this.insertAllLetters(node.children.get(letter), word, index + 1);
        }
    }

    /**
     * Find all words starting from a given node
     * @param {TrieNode} node - Starting node
     * @param {string} prefix - Current prefix
     * @param {string[]} suggestions - Array to store suggestions
     */
    findAllWordsFromNode(node, prefix, suggestions) {
        if (node.isEndOfWord) {
            suggestions.push(prefix);
        }
        
        for (const [char, childNode] of node.children) {
            this.findAllWordsFromNode(childNode, prefix + char, suggestions);
        }
    }

    /**
     * Get auto-complete suggestions for a prefix (exact match)
     * @param {string} prefix - The prefix to search for
     * @returns {string[]} Array of suggestions
     */
    autoComplete(prefix) {
        const suggestions = [];
        let node = this.root;

        // Convert to lowercase for case-insensitive matching
        const lowerPrefix = prefix.toLowerCase();

        // Navigate to the end of the prefix
        for (const letter of lowerPrefix) {
            if (!node.children.has(letter)) {
                // Letter not found in children
                return suggestions;
            } else {
                // Letter found in children
                node = node.children.get(letter);
            }
        }

        // Node is now at the end of the prefix
        this.findAllWordsFromNode(node, lowerPrefix, suggestions);
        return suggestions;
    }

    /**
     * Fuzzy search with edit distance tolerance
     * @param {string} query - The search query
     * @param {number} maxDistance - Maximum edit distance allowed (default: 2)
     * @param {number} maxResults - Maximum number of results to return (default: 20)
     * @returns {Array} Array of {word, distance} objects sorted by relevance
     */
    fuzzySearch(query, maxDistance = 2, maxResults = 20) {
        const results = [];
        const lowerQuery = query.toLowerCase();
        
        // Start fuzzy search from root
        this.fuzzySearchHelper(this.root, '', lowerQuery, 0, maxDistance, results);
        
        // Sort by distance (lower is better) and then by length (shorter is better)
        results.sort((a, b) => {
            if (a.distance !== b.distance) {
                return a.distance - b.distance;
            }
            return a.word.length - b.word.length;
        });
        
        // Remove duplicates and return top results
        const seen = new Set();
        const uniqueResults = [];
        
        for (const result of results) {
            if (!seen.has(result.word) && uniqueResults.length < maxResults) {
                seen.add(result.word);
                uniqueResults.push(result.word);
            }
        }
        
        return uniqueResults;
    }

    /**
     * Helper method for fuzzy search using dynamic programming
     * @param {TrieNode} node - Current trie node
     * @param {string} currentWord - Current word being built
     * @param {string} query - Search query
     * @param {number} depth - Current depth in trie
     * @param {number} maxDistance - Maximum allowed edit distance
     * @param {Array} results - Array to store results
     */
    fuzzySearchHelper(node, currentWord, query, depth, maxDistance, results) {
        // If we've found a complete word, check if it's within distance
        if (node.isEndOfWord && currentWord.length > 0) {
            const distance = this.levenshteinDistance(currentWord, query);
            if (distance <= maxDistance) {
                results.push({ word: currentWord, distance });
            }
        }
        
        // Pruning: if minimum possible distance exceeds maxDistance, stop
        const minPossibleDistance = Math.abs(currentWord.length - query.length);
        if (minPossibleDistance > maxDistance) {
            return;
        }
        
        // Continue exploring children
        for (const [char, childNode] of node.children) {
            const newWord = currentWord + char;
            
            // Early pruning: if current word is much longer than query, skip
            if (newWord.length <= query.length + maxDistance) {
                this.fuzzySearchHelper(childNode, newWord, query, depth + 1, maxDistance, results);
            }
        }
    }

    /**
     * Calculate Levenshtein distance between two strings
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Edit distance
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        // Initialize matrix
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        // Fill matrix
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * Combined search that tries exact match first, then fuzzy if needed
     * @param {string} query - Search query
     * @param {number} maxResults - Maximum results to return
     * @returns {string[]} Array of suggestions
     */
    search(query, maxResults = 10) {
        if (!query || query.length === 0) {
            return [];
        }
        
        // First try exact prefix matching
        const exactMatches = this.autoComplete(query);
        
        if (exactMatches.length >= maxResults) {
            return exactMatches.slice(0, maxResults);
        }
        
        // If not enough exact matches, supplement with fuzzy matches
        const fuzzyMatches = this.fuzzySearch(query, 2, maxResults * 2);
        
        // Combine results, prioritizing exact matches
        const combined = [...exactMatches];
        const exactSet = new Set(exactMatches);
        
        for (const fuzzyMatch of fuzzyMatches) {
            if (!exactSet.has(fuzzyMatch) && combined.length < maxResults) {
                combined.push(fuzzyMatch);
            }
        }
        
        return combined.slice(0, maxResults);
    }

    /**
     * Get the size of the trie (number of words)
     * @returns {number} Number of words in the trie
     */
    size() {
        return this.countWords(this.root);
    }

    /**
     * Count total words in the trie
     * @param {TrieNode} node - Current node
     * @returns {number} Number of words
     */
    countWords(node) {
        let count = node.isEndOfWord ? 1 : 0;
        for (const [char, childNode] of node.children) {
            count += this.countWords(childNode);
        }
        return count;
    }

    /**
     * Check if a word exists in the trie
     * @param {string} word - Word to search for
     * @returns {boolean} True if word exists
     */
    contains(word) {
        let node = this.root;
        const lowerWord = word.toLowerCase();
        for (const letter of lowerWord) {
            if (!node.children.has(letter)) {
                return false;
            }
            node = node.children.get(letter);
        }
        return node.isEndOfWord;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TrieNode, ACT };
}
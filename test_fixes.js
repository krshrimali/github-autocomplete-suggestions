// Test script to verify the fixes for stack overflow and initialization issues
console.log('Testing GitHub PR AutoComplete fixes...');

// Test 1: Trie insertion with problematic words
function testTrieInsertion() {
    console.log('\n=== Test 1: Trie Insertion ===');
    
    if (typeof ACT === 'undefined') {
        console.log('❌ ACT class not found');
        return false;
    }
    
    const trie = new ACT();
    
    // Test normal words
    const normalWords = ['function', 'const', 'let', 'variable', 'test'];
    let successCount = 0;
    
    normalWords.forEach(word => {
        try {
            trie.insert(word);
            successCount++;
            console.log(`✅ Inserted: ${word}`);
        } catch (error) {
            console.log(`❌ Failed to insert: ${word}`, error);
        }
    });
    
    // Test problematic words that should be filtered out
    const problematicWords = [
        '', // empty string
        'a', // too short
        'x'.repeat(200), // too long
        'aaa', // repeated characters
        'test\u0000', // control character
        null,
        undefined
    ];
    
    let filteredCount = 0;
    problematicWords.forEach(word => {
        try {
            trie.insert(word);
            console.log(`❌ Should have been filtered: ${word}`);
        } catch (error) {
            filteredCount++;
            console.log(`✅ Properly filtered: ${word}`);
        }
    });
    
    console.log(`Trie insertion test: ${successCount}/${normalWords.length} normal words inserted, ${filteredCount}/${problematicWords.length} problematic words filtered`);
    
    return successCount === normalWords.length;
}

// Test 2: AutoComplete Engine initialization
async function testEngineInitialization() {
    console.log('\n=== Test 2: Engine Initialization ===');
    
    if (typeof AutoCompleteEngine === 'undefined') {
        console.log('❌ AutoCompleteEngine class not found');
        return false;
    }
    
    const engine = new AutoCompleteEngine();
    
    // Mock the parser to return test words
    engine.parser.extractWordsFromPR = async () => {
        return new Set(['function', 'const', 'let', 'variable', 'test', 'example']);
    };
    
    // Mock shouldActivateFor to work in test environment
    engine.shouldActivateFor = function(element) {
        return element && element.tagName === 'TEXTAREA';
    };
    
    try {
        await engine.initialize();
        
        if (engine.isInitialized) {
            console.log('✅ Engine initialized successfully');
            console.log('Engine stats:', engine.getStats());
            
            // Test suggestions
            const suggestions = engine.getSuggestions('func');
            console.log('Suggestions for "func":', suggestions);
            
            return suggestions.length > 0;
        } else {
            console.log('❌ Engine initialization failed');
            return false;
        }
    } catch (error) {
        console.log('❌ Engine initialization error:', error);
        return false;
    }
}

// Test 3: Word validation
function testWordValidation() {
    console.log('\n=== Test 3: Word Validation ===');
    
    if (typeof AutoCompleteEngine === 'undefined') {
        console.log('❌ AutoCompleteEngine class not found');
        return false;
    }
    
    const engine = new AutoCompleteEngine();
    
    const validWords = ['function', 'test', 'variable', 'example'];
    const invalidWords = ['', 'a', 'x'.repeat(200), 'aaa', 'test\u0000'];
    
    let validCount = 0;
    validWords.forEach(word => {
        if (engine.isValidWordForTrie(word)) {
            validCount++;
            console.log(`✅ Valid word: ${word}`);
        } else {
            console.log(`❌ Invalid word (should be valid): ${word}`);
        }
    });
    
    let invalidCount = 0;
    invalidWords.forEach(word => {
        if (!engine.isValidWordForTrie(word)) {
            invalidCount++;
            console.log(`✅ Invalid word (correctly rejected): ${word}`);
        } else {
            console.log(`❌ Valid word (should be invalid): ${word}`);
        }
    });
    
    console.log(`Word validation test: ${validCount}/${validWords.length} valid words, ${invalidCount}/${invalidWords.length} invalid words`);
    
    return validCount === validWords.length && invalidCount === invalidWords.length;
}

// Run all tests
async function runAllTests() {
    console.log('=== GitHub PR AutoComplete Fixes Test ===');
    
    const results = {
        trieInsertion: testTrieInsertion(),
        engineInitialization: await testEngineInitialization(),
        wordValidation: testWordValidation()
    };
    
    console.log('\n=== Test Results ===');
    Object.entries(results).forEach(([test, passed]) => {
        console.log(`${test}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    });
    
    const allPassed = Object.values(results).every(result => result);
    console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    return allPassed;
}

// Run tests when script is loaded
if (typeof window !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runAllTests);
    } else {
        runAllTests();
    }
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testTrieInsertion,
        testEngineInitialization,
        testWordValidation,
        runAllTests
    };
} 
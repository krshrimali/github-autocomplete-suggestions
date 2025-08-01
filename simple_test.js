// Simple test script for GitHub PR AutoComplete Extension
console.log('GitHub PR AutoComplete: Running simple test...');

// Test if the extension is loaded
function testExtensionLoaded() {
    console.log('Testing if extension is loaded...');
    
    if (typeof AutoCompleteEngine !== 'undefined') {
        console.log('✅ AutoCompleteEngine class found');
        return true;
    } else {
        console.log('❌ AutoCompleteEngine class not found');
        return false;
    }
}

// Test if Trie is working
function testTrie() {
    console.log('Testing Trie functionality...');
    
    if (typeof ACT !== 'undefined') {
        const trie = new ACT();
        
        // Insert some test words
        trie.insert('function');
        trie.insert('const');
        trie.insert('let');
        trie.insert('variable');
        trie.insert('test');
        
        // Test search
        const suggestions = trie.search('func');
        console.log('Trie search for "func":', suggestions);
        
        if (suggestions.length > 0) {
            console.log('✅ Trie is working correctly');
            return true;
        } else {
            console.log('❌ Trie search returned no results');
            return false;
        }
    } else {
        console.log('❌ ACT class not found');
        return false;
    }
}

// Test if Parser is working
function testParser() {
    console.log('Testing Parser functionality...');
    
    if (typeof GitHubParser !== 'undefined') {
        const parser = new GitHubParser();
        console.log('✅ GitHubParser class found');
        
        // Test word validation
        const validWords = ['function', 'test', 'variable'];
        const invalidWords = ['a', 'the', '123', ''];
        
        let validCount = 0;
        validWords.forEach(word => {
            if (parser.isValidWord(word)) validCount++;
        });
        
        let invalidCount = 0;
        invalidWords.forEach(word => {
            if (!parser.isValidWord(word)) invalidCount++;
        });
        
        console.log(`Word validation: ${validCount}/${validWords.length} valid words, ${invalidCount}/${invalidWords.length} invalid words correctly identified`);
        
        return validCount === validWords.length && invalidCount === invalidWords.length;
    } else {
        console.log('❌ GitHubParser class not found');
        return false;
    }
}

// Test if AutoComplete Engine is working
async function testAutoCompleteEngine() {
    console.log('Testing AutoComplete Engine...');
    
    if (typeof AutoCompleteEngine !== 'undefined') {
        const engine = new AutoCompleteEngine();
        
        // Add some test words
        engine.addCustomWords(['function', 'const', 'let', 'variable', 'test', 'example']);
        
        // Test suggestions
        const suggestions = engine.getSuggestions('func');
        console.log('Engine suggestions for "func":', suggestions);
        
        if (suggestions.length > 0) {
            console.log('✅ AutoComplete Engine is working');
            return true;
        } else {
            console.log('❌ AutoComplete Engine returned no suggestions');
            return false;
        }
    } else {
        console.log('❌ AutoCompleteEngine class not found');
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('=== GitHub PR AutoComplete Extension Tests ===');
    
    const results = {
        extensionLoaded: testExtensionLoaded(),
        trie: testTrie(),
        parser: testParser(),
        engine: await testAutoCompleteEngine()
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
        testExtensionLoaded,
        testTrie,
        testParser,
        testAutoCompleteEngine,
        runAllTests
    };
} 
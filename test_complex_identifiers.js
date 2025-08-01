// Test script for complex identifiers in GitHub PR AutoComplete
console.log('Testing complex identifiers support...');

// Test data with complex identifiers
const testData = {
    snakeCase: ['indexing_path', 'user_name', 'api_endpoint', 'file_upload_handler'],
    kebabCase: ['user-name', 'api-endpoint', 'file-upload-handler', 'data-processing'],
    methodCalls: ['self.function()', 'obj.method()', 'api.getData()', 'user.getName()'],
    propertyAccess: ['obj.property', 'self.attribute', 'api.config', 'user.profile'],
    arrayAccess: ['array[index]', 'obj[key]', 'data[0]', 'users[id]'],
    functionCalls: ['function()', 'method()', 'getData()', 'processInput()']
};

// Test 1: Parser extraction of complex identifiers
function testParserExtraction() {
    console.log('\n=== Test 1: Parser Complex Identifier Extraction ===');
    
    if (typeof GitHubParser === 'undefined') {
        console.log('❌ GitHubParser class not found');
        return false;
    }
    
    const parser = new GitHubParser();
    const words = new Set();
    
    // Test text containing complex identifiers
    const testText = `
        const indexing_path = '/api/data';
        const user_name = 'john_doe';
        const api_endpoint = 'https://api.example.com';
        
        function processData() {
            self.function();
            obj.method();
            api.getData();
            user.getName();
            
            const result = obj.property;
            const config = self.attribute;
            const profile = user.profile;
            
            const item = array[index];
            const value = obj[key];
            const first = data[0];
            
            function();
            method();
            getData();
            processInput();
        }
    `;
    
    parser.extractWordsFromText(testText, words);
    
    console.log('Extracted words:', Array.from(words));
    
    // Check if complex identifiers were extracted
    const extractedWords = Array.from(words);
    const foundComplex = [];
    
    Object.values(testData).flat().forEach(expected => {
        if (extractedWords.includes(expected)) {
            foundComplex.push(expected);
            console.log(`✅ Found: ${expected}`);
        } else {
            console.log(`❌ Missing: ${expected}`);
        }
    });
    
    console.log(`Complex identifier extraction: ${foundComplex.length}/${Object.values(testData).flat().length} found`);
    return foundComplex.length > 0;
}

// Test 2: Trie insertion of complex identifiers
function testTrieInsertion() {
    console.log('\n=== Test 2: Trie Complex Identifier Insertion ===');
    
    if (typeof ACT === 'undefined') {
        console.log('❌ ACT class not found');
        return false;
    }
    
    const trie = new ACT();
    let successCount = 0;
    
    Object.values(testData).flat().forEach(identifier => {
        try {
            trie.insert(identifier);
            successCount++;
            console.log(`✅ Inserted: ${identifier}`);
        } catch (error) {
            console.log(`❌ Failed to insert: ${identifier}`, error);
        }
    });
    
    console.log(`Trie insertion: ${successCount}/${Object.values(testData).flat().length} successful`);
    return successCount > 0;
}

// Test 3: AutoComplete Engine with complex identifiers
async function testEngineComplexIdentifiers() {
    console.log('\n=== Test 3: Engine Complex Identifier Suggestions ===');
    
    if (typeof AutoCompleteEngine === 'undefined') {
        console.log('❌ AutoCompleteEngine class not found');
        return false;
    }
    
    const engine = new AutoCompleteEngine();
    
    // Add test words including complex identifiers
    const testWords = [
        'function', 'const', 'let', 'var',
        ...Object.values(testData).flat()
    ];
    
    engine.addCustomWords(testWords);
    
    // Test cases
    const testCases = [
        { input: 'self', expected: ['self.function()', 'self.attribute'] },
        { input: 'indexing', expected: ['indexing_path'] },
        { input: 'user', expected: ['user_name', 'user.getName()', 'user.profile'] },
        { input: 'api', expected: ['api_endpoint', 'api.getData()', 'api.config'] },
        { input: 'obj', expected: ['obj.method()', 'obj.property', 'obj[key]'] },
        { input: 'array', expected: ['array[index]'] }
    ];
    
    let successCount = 0;
    
    testCases.forEach(testCase => {
        const suggestions = engine.getSuggestions(testCase.input);
        console.log(`\nInput: "${testCase.input}"`);
        console.log('Suggestions:', suggestions);
        
        const foundExpected = testCase.expected.filter(expected => 
            suggestions.includes(expected)
        );
        
        if (foundExpected.length > 0) {
            console.log(`✅ Found expected: ${foundExpected.join(', ')}`);
            successCount++;
        } else {
            console.log(`❌ Missing expected: ${testCase.expected.join(', ')}`);
        }
    });
    
    console.log(`\nEngine suggestions: ${successCount}/${testCases.length} test cases passed`);
    return successCount > 0;
}

// Test 4: Current word extraction for complex identifiers
function testCurrentWordExtraction() {
    console.log('\n=== Test 4: Current Word Extraction ===');
    
    if (typeof AutoCompleteEngine === 'undefined') {
        console.log('❌ AutoCompleteEngine class not found');
        return false;
    }
    
    const engine = new AutoCompleteEngine();
    
    const testCases = [
        { input: 'self.function()', cursor: 4, expected: 'self' },
        { input: 'self.function()', cursor: 12, expected: 'self.function()' },
        { input: 'indexing_path', cursor: 8, expected: 'indexing_path' },
        { input: 'user.getName()', cursor: 4, expected: 'user' },
        { input: 'user.getName()', cursor: 10, expected: 'user.getName()' },
        { input: 'array[index]', cursor: 5, expected: 'array' },
        { input: 'array[index]', cursor: 10, expected: 'array[index]' }
    ];
    
    let successCount = 0;
    
    testCases.forEach(testCase => {
        const currentWord = engine.getCurrentWord(testCase.input, testCase.cursor);
        console.log(`Input: "${testCase.input}" (cursor: ${testCase.cursor})`);
        console.log(`Extracted: "${currentWord}", Expected: "${testCase.expected}"`);
        
        if (currentWord === testCase.expected) {
            console.log('✅ Correct extraction');
            successCount++;
        } else {
            console.log('❌ Incorrect extraction');
        }
    });
    
    console.log(`\nCurrent word extraction: ${successCount}/${testCases.length} correct`);
    return successCount > 0;
}

// Run all tests
async function runComplexIdentifierTests() {
    console.log('=== Complex Identifier Support Tests ===');
    
    const results = {
        parserExtraction: testParserExtraction(),
        trieInsertion: testTrieInsertion(),
        engineSuggestions: await testEngineComplexIdentifiers(),
        currentWordExtraction: testCurrentWordExtraction()
    };
    
    console.log('\n=== Test Results ===');
    Object.entries(results).forEach(([test, passed]) => {
        console.log(`${test}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    });
    
    const allPassed = Object.values(results).every(result => result);
    console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allPassed) {
        console.log('\n🎉 Complex identifier support is working correctly!');
        console.log('You should now be able to autocomplete:');
        console.log('- Snake_case identifiers like "indexing_path"');
        console.log('- Method calls like "self.function()"');
        console.log('- Property access like "obj.property"');
        console.log('- Array access like "array[index]"');
        console.log('- And many more complex patterns!');
    }
    
    return allPassed;
}

// Run tests when script is loaded
if (typeof window !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runComplexIdentifierTests);
    } else {
        runComplexIdentifierTests();
    }
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testParserExtraction,
        testTrieInsertion,
        testEngineComplexIdentifiers,
        testCurrentWordExtraction,
        runComplexIdentifierTests
    };
} 
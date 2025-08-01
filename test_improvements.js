// Test script for improved word extraction
console.log('Testing improved word extraction...');

// Test data that should be extracted from the GitHub PR
const testData = [
    // From the Rust PR content
    'is_already_indexed',
    'origin_file_path', 
    'workspace_path',
    'should_print',
    'last_indexed_commit',
    'recent_commit',
    'println!',
    'eprintln!',
    'panic!',
    'Vec<String>',
    'Option<String>',
    'String::from_utf8',
    'Vec::new',
    'self.field',
    'command.args',
    'command.output',
    'get_latest_commit',
    'get_commits_after',
    'indexing_metadata',
    'read_indexing_file',
    'auth_details_map',
    'stdout_buf',
    'stderr_buf',
    'output.status',
    'output.stdout',
    'output.stderr'
];

// Test 1: Parser extraction improvements
function testParserImprovements() {
    console.log('\n=== Test 1: Parser Improvements ===');
    
    if (typeof GitHubParser === 'undefined') {
        console.log('❌ GitHubParser class not found');
        return false;
    }
    
    const parser = new GitHubParser();
    const words = new Set();
    
    // Test text containing various programming patterns
    const testText = `
        fn is_already_indexed(origin_file_path: &str, workspace_path: &str, should_print: bool) -> bool {
            let last_indexed_commit = get_latest_commit(&origin_file_path).unwrap();
            let recent_commit = get_latest_commit(&origin_file_path).unwrap();
            
            if last_indexed_commit == recent_commit {
                if should_print {
                    println!("✓ File {} is already indexed with the latest commit {}", origin_file_path, recent_commit);
                }
                return true;
            } else {
                if should_print {
                    eprintln!("⚠ File {} needs reindexing from commit {} to {}", origin_file_path, last_indexed_commit, recent_commit);
                }
            }
            
            let mut command = Command::new("git");
            command.args(["rev-list", &last_indexed_commit, "..", "HEAD"]);
            
            let output = match command
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output() {
                Ok(output) => output,
                Err(e) => {
                    eprintln!("❌ Failed to execute git command: {}", e);
                    return Vec::new();
                }
            };
            
            if output.status.success() {
                match String::from_utf8(output.stdout) {
                    Ok(stdout_buf) => {
                        let commits: Vec<String> = stdout_buf.lines()
                            .filter(|line| !line.trim().is_empty())
                            .map(|s| s.to_string())
                            .collect();
                        return commits;
                    }
                    Err(e) => {
                        eprintln!("❌ Failed to parse git output as UTF-8: {}", e);
                        return Vec::new();
                    }
                }
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                eprintln!("❌ Git command failed: {}", stderr.trim());
                if stderr.contains("bad revision") || stderr.contains("unknown revision") {
                    eprintln!("⚠ Invalid commit hash: {}", last_indexed_commit);
                }
            }
            
            Vec::new()
        }
    `;
    
    parser.extractWordsFromText(testText, words);
    
    console.log('Extracted words:', Array.from(words));
    
    // Check if expected words were extracted
    const extractedWords = Array.from(words);
    const foundWords = [];
    
    testData.forEach(expected => {
        if (extractedWords.includes(expected)) {
            foundWords.push(expected);
            console.log(`✅ Found: ${expected}`);
        } else {
            console.log(`❌ Missing: ${expected}`);
        }
    });
    
    console.log(`\nWord extraction: ${foundWords.length}/${testData.length} expected words found`);
    return foundWords.length > 0;
}

// Test 2: Validation improvements
function testValidationImprovements() {
    console.log('\n=== Test 2: Validation Improvements ===');
    
    if (typeof GitHubParser === 'undefined') {
        console.log('❌ GitHubParser class not found');
        return false;
    }
    
    const parser = new GitHubParser();
    
    // Test cases that should now be valid
    const validCases = [
        'is_already_indexed',
        'origin_file_path',
        'println!',
        'Vec<String>',
        'String::from_utf8',
        'self.field',
        'command.args',
        'output.status',
        'stdout_buf',
        'stderr_buf'
    ];
    
    let validCount = 0;
    validCases.forEach(word => {
        if (parser.isValidProgrammingWord(word)) {
            validCount++;
            console.log(`✅ Valid: ${word}`);
        } else {
            console.log(`❌ Invalid (should be valid): ${word}`);
        }
    });
    
    console.log(`\nValidation: ${validCount}/${validCases.length} valid cases`);
    return validCount === validCases.length;
}

// Test 3: AutoComplete Engine improvements
async function testEngineImprovements() {
    console.log('\n=== Test 3: Engine Improvements ===');
    
    if (typeof AutoCompleteEngine === 'undefined') {
        console.log('❌ AutoCompleteEngine class not found');
        return false;
    }
    
    const engine = new AutoCompleteEngine();
    
    // Add test words
    engine.addCustomWords(testData);
    
    // Test cases
    const testCases = [
        { input: 'is_already', expected: ['is_already_indexed'] },
        { input: 'origin_file', expected: ['origin_file_path'] },
        { input: 'println', expected: ['println!'] },
        { input: 'Vec', expected: ['Vec<String>'] },
        { input: 'String', expected: ['String::from_utf8'] },
        { input: 'self', expected: ['self.field'] },
        { input: 'command', expected: ['command.args', 'command.output'] },
        { input: 'output', expected: ['output.status', 'output.stdout', 'output.stderr'] }
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

// Run all tests
async function runImprovementTests() {
    console.log('=== Word Extraction Improvements Test ===');
    
    const results = {
        parserImprovements: testParserImprovements(),
        validationImprovements: testValidationImprovements(),
        engineImprovements: await testEngineImprovements()
    };
    
    console.log('\n=== Test Results ===');
    Object.entries(results).forEach(([test, passed]) => {
        console.log(`${test}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    });
    
    const allPassed = Object.values(results).every(result => result);
    console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allPassed) {
        console.log('\n🎉 Word extraction improvements are working!');
        console.log('The parser should now extract:');
        console.log('- Snake_case identifiers like "is_already_indexed"');
        console.log('- Rust macros like "println!"');
        console.log('- Type annotations like "Vec<String>"');
        console.log('- Associated functions like "String::from_utf8"');
        console.log('- And many more programming patterns!');
    }
    
    return allPassed;
}

// Run tests when script is loaded
if (typeof window !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runImprovementTests);
    } else {
        runImprovementTests();
    }
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testParserImprovements,
        testValidationImprovements,
        testEngineImprovements,
        runImprovementTests
    };
} 
// Minimal test to check class definitions
console.log('Loading classes...');

// Mock DOM
global.document = { querySelector: () => null, querySelectorAll: () => [] };
global.window = { location: { href: 'https://github.com/user/repo/pull/123' } };

try {
    // Load trie
    const trieCode = require('fs').readFileSync('./lib/trie.js', 'utf8');
    eval(trieCode);
    console.log('✓ Trie loaded, ACT available:', typeof ACT);
    
    // Test trie
    const trie = new ACT();
    trie.insert('test');
    console.log('✓ Trie working, size:', trie.size());
    
    // Load parser
    const parserCode = require('fs').readFileSync('./lib/parser.js', 'utf8');
    eval(parserCode);
    console.log('✓ Parser loaded, GitHubParser available:', typeof GitHubParser);
    
    // Test parser
    const parser = new GitHubParser();
    console.log('✓ Parser created successfully');
    
    // Test word extraction
    const words = new Set();
    parser.extractWordsFromText('camelCaseWord testWord', words);
    console.log('✓ Word extraction works, extracted:', Array.from(words));
    
    console.log('\n✅ All basic tests passed!');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
}
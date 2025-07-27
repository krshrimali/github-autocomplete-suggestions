// Simple test to verify camelCase and word extraction fixes
const fs = require('fs');

// Mock minimal DOM
global.document = { querySelector: () => null, querySelectorAll: () => [] };
global.window = { location: { href: 'https://github.com/user/repo/pull/123' } };

// Read and execute the files
const trieCode = fs.readFileSync('./lib/trie.js', 'utf8');
const parserCode = fs.readFileSync('./lib/parser.js', 'utf8');

eval(trieCode);
eval(parserCode);

console.log('Testing camelCase preservation and word extraction...\n');

// Test 1: Basic word extraction with camelCase
const parser = new GitHubParser();
const words = new Set();

// Test camelCase words
const testInput = 'userProfile getUserData setUserProfile validateEmail formatPhoneNumber';
parser.extractWordsFromText(testInput, words);

console.log('Input:', testInput);
console.log('Extracted words:', Array.from(words).sort());

// Check if camelCase is preserved
const hasCamelCase = Array.from(words).some(word => /[a-z][A-Z]/.test(word));
console.log('✓ CamelCase preserved:', hasCamelCase ? 'PASS' : 'FAIL');

// Test 2: Complex code extraction
const codeWords = new Set();
const codeText = `
const [formData, setFormData] = useState({
  firstName: '',
  lastName: '',
  emailAddress: '',
  phoneNumber: ''
});
`;

parser.extractWordsFromText(codeText, codeWords);
console.log('\nCode text extracted:', Array.from(codeWords).sort());

// Check for expected words
const expectedWords = ['formData', 'setFormData', 'useState', 'firstName', 'lastName', 'emailAddress', 'phoneNumber'];
const foundWords = expectedWords.filter(word => codeWords.has(word));
console.log('Expected words found:', foundWords);
console.log('✓ Code extraction:', foundWords.length >= 5 ? 'PASS' : 'FAIL');

// Test 3: Trie functionality
const trie = new ACT();
codeWords.forEach(word => trie.insert(word));

console.log('\nTrie size:', trie.size());

// Test autocomplete
const suggestions = trie.autoComplete('form');
console.log('Suggestions for "form":', suggestions);
console.log('✓ Autocomplete:', suggestions.length > 0 ? 'PASS' : 'FAIL');

console.log('\n✅ Basic functionality test completed!');
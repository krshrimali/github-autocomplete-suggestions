# GitHub PR AutoComplete Extension

A Chrome extension that provides intelligent autocomplete suggestions for GitHub Pull Request comments based on the code changes in the PR.

## Features

- **Smart Word Extraction**: Automatically extracts meaningful words from PR code changes
- **Fuzzy Matching**: Suggests words even with typos using edit distance
- **Case Insensitive**: Works regardless of case
- **Configurable Triggers**: Customizable trigger characters
- **Real-time Updates**: Monitors PR changes and updates suggestions
- **Fallback Words**: Includes common programming terms when no PR content is found

## Installation

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory
5. The extension will automatically activate on GitHub PR pages

## Testing

### Method 1: Test Page
1. Open `test_extension.html` in your browser
2. Type in the textarea to test autocomplete functionality
3. Check the console for debug information

### Method 2: GitHub PR Page
1. Go to any GitHub Pull Request page
2. Open the browser console (F12)
3. Look for "GitHub PR AutoComplete" log messages
4. Try typing in comment textareas

### Method 3: Simple Test Script
1. Open `simple_test.js` in a browser console
2. Run the test functions to verify components are working

## Debugging

The extension includes comprehensive debug logging. To see debug information:

1. Open browser console (F12)
2. Look for messages starting with "GitHub PR AutoComplete:"
3. Check for any error messages

### Common Issues

**No words extracted (0 in console):**
- The parser might not be finding the right DOM elements
- Try refreshing the page or waiting for content to load
- Check if you're on a valid GitHub PR page

**No suggestions appearing:**
- Check if the extension is enabled in settings
- Verify trigger characters are configured correctly
- Look for console errors in the debug output

**Extension not loading:**
- Verify the manifest.json is valid
- Check that all required files are present
- Ensure the extension is properly installed

## Configuration

The extension can be configured through the options page:

- **Enabled**: Toggle the extension on/off
- **Max Suggestions**: Maximum number of suggestions to show
- **Min Word Length**: Minimum word length to consider
- **Debounce Delay**: Delay before showing suggestions
- **Trigger Characters**: Characters that activate autocomplete
- **Fuzzy Matching**: Enable/disable fuzzy matching
- **Case Insensitive**: Enable/disable case insensitive matching

## File Structure

```
├── manifest.json              # Extension manifest
├── background/                # Background scripts
│   └── background.js         # Settings management
├── content/                  # Content scripts
│   └── content.js           # UI and event handling
├── lib/                     # Core library files
│   ├── trie.js             # Trie data structure
│   ├── parser.js           # GitHub content parser
│   └── autocomplete.js     # Main autocomplete engine
├── styles/                  # CSS styles
│   └── autocomplete.css    # Suggestion box styles
├── test_extension.html      # Test page
├── simple_test.js          # Simple test script
└── README_EXTENSION.md     # This file
```

## Development

To modify the extension:

1. Make changes to the source files
2. Reload the extension in `chrome://extensions/`
3. Refresh the GitHub page to test changes

### Key Components

- **AutoCompleteEngine**: Main engine that coordinates everything
- **GitHubParser**: Extracts words from GitHub PR content
- **ACT (Trie)**: Data structure for efficient word storage and search
- **AutoCompleteUI**: Handles user interface and interactions

## Troubleshooting

If you're still having issues:

1. Check the browser console for error messages
2. Verify all files are properly loaded
3. Test with the provided test files
4. Ensure you're on a GitHub PR page
5. Try disabling other extensions that might interfere

## Contributing

Feel free to submit issues and pull requests to improve the extension!

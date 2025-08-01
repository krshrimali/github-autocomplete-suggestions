// Test script for UI fixes
console.log('Testing UI fixes for autocomplete suggestions...');

// Test 1: Suggestion box cleanup
function testSuggestionBoxCleanup() {
    console.log('\n=== Test 1: Suggestion Box Cleanup ===');
    
    if (typeof AutoCompleteUI === 'undefined') {
        console.log('❌ AutoCompleteUI class not found');
        return false;
    }
    
    const ui = new AutoCompleteUI();
    
    // Create suggestion box
    ui.createSuggestionBox();
    
    // Check if suggestion box was created
    const suggestionBoxes = document.querySelectorAll('.github-pr-autocomplete-suggestions');
    console.log(`Initial suggestion boxes: ${suggestionBoxes.length}`);
    
    if (suggestionBoxes.length !== 1) {
        console.log('❌ Expected exactly 1 suggestion box');
        return false;
    }
    
    // Test cleanup
    ui.cleanup();
    
    const remainingBoxes = document.querySelectorAll('.github-pr-autocomplete-suggestions');
    console.log(`Suggestion boxes after cleanup: ${remainingBoxes.length}`);
    
    if (remainingBoxes.length === 0) {
        console.log('✅ Cleanup successful - all suggestion boxes removed');
        return true;
    } else {
        console.log('❌ Cleanup failed - suggestion boxes still exist');
        return false;
    }
}

// Test 2: Multiple suggestion box prevention
function testMultipleSuggestionBoxPrevention() {
    console.log('\n=== Test 2: Multiple Suggestion Box Prevention ===');
    
    if (typeof AutoCompleteUI === 'undefined') {
        console.log('❌ AutoCompleteUI class not found');
        return false;
    }
    
    const ui = new AutoCompleteUI();
    
    // Create multiple suggestion boxes (simulating the bug)
    ui.createSuggestionBox();
    ui.createSuggestionBox();
    ui.createSuggestionBox();
    
    const suggestionBoxes = document.querySelectorAll('.github-pr-autocomplete-suggestions');
    console.log(`Suggestion boxes created: ${suggestionBoxes.length}`);
    
    if (suggestionBoxes.length === 1) {
        console.log('✅ Multiple suggestion box prevention working');
        return true;
    } else {
        console.log('❌ Multiple suggestion boxes created');
        return false;
    }
}

// Test 3: Show/hide suggestions
function testShowHideSuggestions() {
    console.log('\n=== Test 3: Show/Hide Suggestions ===');
    
    if (typeof AutoCompleteUI === 'undefined') {
        console.log('❌ AutoCompleteUI class not found');
        return false;
    }
    
    const ui = new AutoCompleteUI();
    ui.createSuggestionBox();
    
    // Test showing suggestions
    const testSuggestions = ['test1', 'test2', 'test3'];
    const mockInput = document.createElement('textarea');
    
    ui.showSuggestions(testSuggestions, mockInput);
    
    if (ui.isVisible && ui.suggestionBox.style.display === 'block') {
        console.log('✅ Suggestions shown correctly');
    } else {
        console.log('❌ Suggestions not shown correctly');
        return false;
    }
    
    // Test hiding suggestions
    ui.hideSuggestions();
    
    if (!ui.isVisible && ui.suggestionBox.style.display === 'none') {
        console.log('✅ Suggestions hidden correctly');
        return true;
    } else {
        console.log('❌ Suggestions not hidden correctly');
        return false;
    }
}

// Test 4: Empty input handling
function testEmptyInputHandling() {
    console.log('\n=== Test 4: Empty Input Handling ===');
    
    if (typeof AutoCompleteUI === 'undefined') {
        console.log('❌ AutoCompleteUI class not found');
        return false;
    }
    
    const ui = new AutoCompleteUI();
    ui.createSuggestionBox();
    
    // Show some suggestions first
    const testSuggestions = ['test1', 'test2', 'test3'];
    const mockInput = document.createElement('textarea');
    mockInput.value = 'test';
    
    ui.showSuggestions(testSuggestions, mockInput);
    
    if (!ui.isVisible) {
        console.log('❌ Suggestions not shown initially');
        return false;
    }
    
    // Test with empty input
    mockInput.value = '';
    ui.updateSuggestions(mockInput);
    
    if (!ui.isVisible) {
        console.log('✅ Empty input correctly hides suggestions');
        return true;
    } else {
        console.log('❌ Empty input did not hide suggestions');
        return false;
    }
}

// Test 5: Input event handling
function testInputEventHandling() {
    console.log('\n=== Test 5: Input Event Handling ===');
    
    if (typeof AutoCompleteUI === 'undefined') {
        console.log('❌ AutoCompleteUI class not found');
        return false;
    }
    
    const ui = new AutoCompleteUI();
    ui.createSuggestionBox();
    
    // Create a mock input event
    const mockInput = document.createElement('textarea');
    mockInput.value = 'test';
    
    const mockEvent = {
        target: mockInput
    };
    
    // Test with non-empty input
    ui.handleInput(mockEvent);
    
    // Test with empty input
    mockInput.value = '';
    ui.handleInput(mockEvent);
    
    if (!ui.isVisible) {
        console.log('✅ Input event handling works correctly');
        return true;
    } else {
        console.log('❌ Input event handling failed');
        return false;
    }
}

// Run all tests
function runUITests() {
    console.log('=== UI Fixes Test ===');
    
    const results = {
        suggestionBoxCleanup: testSuggestionBoxCleanup(),
        multipleSuggestionBoxPrevention: testMultipleSuggestionBoxPrevention(),
        showHideSuggestions: testShowHideSuggestions(),
        emptyInputHandling: testEmptyInputHandling(),
        inputEventHandling: testInputEventHandling()
    };
    
    console.log('\n=== Test Results ===');
    Object.entries(results).forEach(([test, passed]) => {
        console.log(`${test}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    });
    
    const allPassed = Object.values(results).every(result => result);
    console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allPassed) {
        console.log('\n🎉 UI fixes are working correctly!');
        console.log('The autocomplete UI should now:');
        console.log('- Hide suggestions when input is cleared');
        console.log('- Not create multiple suggestion boxes');
        console.log('- Properly clean up when navigating pages');
        console.log('- Handle empty input correctly');
    }
    
    return allPassed;
}

// Run tests when script is loaded
if (typeof window !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runUITests);
    } else {
        runUITests();
    }
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testSuggestionBoxCleanup,
        testMultipleSuggestionBoxPrevention,
        testShowHideSuggestions,
        testEmptyInputHandling,
        testInputEventHandling,
        runUITests
    };
} 
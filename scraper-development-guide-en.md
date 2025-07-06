  # Universal Bank Scraper Development Guide

## Core Development Methodology

### 1. Real-time DOM Analysis with Playwright MCP Tools

#### Why This Approach is Revolutionary
- **Real-time interaction**: See page structure directly without guessing selectors
- **Precise targeting**: Get accurate element references (ref) and attributes
- **Instant validation**: Test selectors immediately
- **Avoid blind development**: Reduce trial-and-error time

#### Standard Workflow:
```javascript
// Step 1: Navigate to target page
await mcp__playwright__browser_navigate({ url: 'target-bank-login-url' });

// Step 2: Analyze page snapshot, identify key elements
// Page snapshot will show structure like:
// - textbox "Username field description" [ref=eXX]
// - textbox "Password field description" [ref=eYY]  
// - button "Login button text" [ref=eZZ]

// Step 3: Test interactions using found references
await mcp__playwright__browser_type({
  element: "descriptive name",
  ref: "actual ref value",
  text: "test text"
});

// Step 4: Observe page changes, adjust strategy
```

### 2. Selector Strategy Priority

#### Recommended Order (Most to Least Stable):

1. **getByRole Selectors** (Most Recommended)
```javascript
await page.getByRole('textbox', { name: 'Field Label' });
await page.getByRole('button', { name: 'Button Text' });
```

2. **aria-label Attributes**
```javascript
await page.locator('[aria-label="Specific Label"]');
```

3. **Stable ID or name Attributes**
```javascript
await page.locator('#stableId');
await page.locator('[name="fieldName"]');
```

4. **Text Content** (For Buttons)
```javascript
await page.locator('button:has-text("Login")');
```

5. **CSS Classes** (Least Recommended - Changes Frequently)

### 3. Universal Page Analysis Process

#### 3.1 Initial Exploration
```javascript
// Save page HTML for offline analysis
const pageContent = await page.content();
await fs.writeFile('/tmp/bank-page-debug.html', pageContent);

// Get all input field information
const inputs = await page.$$eval('input', elements => 
  elements.map(el => ({
    id: el.id,
    name: el.name,
    type: el.type,
    placeholder: el.placeholder,
    ariaLabel: el.getAttribute('aria-label'),
    visible: el.offsetParent !== null
  }))
);

// Get all button information
const buttons = await page.$$eval('button, input[type="submit"]', elements =>
  elements.map(el => ({
    text: el.textContent || el.value,
    type: el.type,
    id: el.id,
    className: el.className
  }))
);
```

#### 3.2 Element Location Strategy
```javascript
// Universal element finding function
async function findAndFillField(page, fieldPurpose, value, possibleSelectors) {
  // Try getByRole first
  try {
    await page.getByRole('textbox', { name: new RegExp(fieldPurpose, 'i') }).fill(value);
    return true;
  } catch (e) {
    // Silent fail, try other methods
  }
  
  // Then try provided selector list
  for (const selector of possibleSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 2000 });
      await page.fill(selector, value);
      return true;
    } catch (e) {
      continue;
    }
  }
  
  throw new Error(`Cannot find ${fieldPurpose} input field`);
}
```

### 4. Account Data Extraction Patterns

#### 4.1 Exploratory Parsing
```javascript
// Don't assume specific class names or structure
// Find based on content characteristics

// Step 1: Find potential account containers
const potentialContainers = await page.$$('div, tr, section, article, li');

// Step 2: Identify account elements by content features
for (const container of potentialContainers) {
  const text = await container.textContent();
  
  // Common account element features:
  // - Contains currency symbols ($, ¥, €, etc.)
  // - Contains account number formats
  // - Contains account type keywords
  if (text && this.looksLikeAccount(text)) {
    // Parse further
  }
}
```

#### 4.2 Intelligent Data Extraction
```javascript
// Universal account info extractor
function extractAccountInfo(text) {
  const info = {
    name: '',
    number: '',
    balance: 0,
    currency: 'USD'
  };
  
  // Extract various account number formats with regex
  const accountNumberPatterns = [
    /\d{3}-\d{3}\s+\d{4,}/,  // Format: 123-456 78901
    /\d{4}\s+\d{4}\s+\d{4}\s+\d{4}/, // Credit card format
    /\d{6,16}/  // Continuous digits
  ];
  
  // Extract amounts (supports multiple currencies)
  const amountPattern = /([¥$€£₹]\s?[\d,]+\.?\d*)|(\d+\.?\d*\s?[¥$€£₹])/;
  
  // Smart extraction logic...
  
  return info;
}
```

### 5. Error Handling and Retry Strategy

```javascript
class RobustScraper {
  async safeOperation(operation, operationName, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        logger.warn(`${operationName} failed, attempt ${i + 1}/${maxRetries}`);
        
        // Smart error analysis
        if (this.isRecoverableError(error)) {
          await this.delay(2000 * (i + 1)); // Exponential backoff
          continue;
        }
        
        throw error; // Throw unrecoverable errors immediately
      }
    }
  }
  
  isRecoverableError(error) {
    const recoverablePatterns = [
      'timeout',
      'network',
      'navigation',
      'element not found'
    ];
    
    return recoverablePatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern)
    );
  }
}
```

### 6. Standard Process for New Bank Development

#### Phase 1: Exploration and Understanding
1. Use MCP tools to visit bank website
2. Screenshot all key pages
3. Analyze page structure, identify patterns
4. Document all possible selectors

#### Phase 2: Prototype Development
1. Create minimal viable login flow
2. Use headless: false to observe behavior
3. Gradually add error handling
4. Validate data extraction logic

#### Phase 3: Robustness Improvements
1. Add retry mechanisms
2. Handle edge cases
3. Optimize performance (reduce wait times)
4. Add detailed logging

#### Phase 4: Production Ready
1. Remove debug code
2. Add security measures
3. Implement monitoring and alerts
4. Write documentation

### 7. Universal Best Practices

#### Security
- Never hardcode credentials in code
- Use environment variables or secure storage
- Implement rate limiting to avoid bans
- Add user agent rotation

#### Maintainability
- Centralize selector management
- Use config files for bank-specific info
- Implement comprehensive logging
- Write unit tests

#### Performance Optimization
- Only wait for necessary elements
- Use waitForLoadState('domcontentloaded') instead of 'networkidle'
- Process multiple accounts in parallel
- Implement smart caching

### 8. Debugging Tips

```javascript
// Development helper function
async function debugPage(page) {
  // Save screenshot
  await page.screenshot({ path: 'debug-screenshot.png' });
  
  // Save HTML
  const html = await page.content();
  await fs.writeFile('debug-page.html', html);
  
  // Print interactable elements
  const interactables = await page.$$eval(
    'input, button, select, textarea, a', 
    els => els.map(el => ({
      tag: el.tagName,
      text: el.textContent || el.value,
      visible: el.offsetParent !== null
    }))
  );
  console.log('Interactable elements:', interactables);
}
```

## Summary

Key success factors for bank scraper development:
1. **Use MCP tools** for real-time exploration instead of blind coding
2. **Prioritize semantic selectors** (getByRole) over fragile CSS selectors
3. **Extract data based on content** rather than structure
4. **Implement smart retries** and error recovery
5. **Keep code generic** for easy extension to new banks

This methodology has been validated across multiple bank implementations and can reduce new bank integration time from days to hours.

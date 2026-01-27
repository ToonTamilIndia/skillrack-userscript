# Anti-Cheat Bypass Userscript

A Tampermonkey/Greasemonkey userscript that bypasses common anti-cheat mechanisms on SkillRack.

## ⚠️ Important Warnings

> **⚠️ Please disable the script if you are attending a test as it might lead to unintended effects.**

> **⚠️ Attempting to navigate the page while the captcha solver is running may lead to unintended effects. If it gets stuck in a loop, closing and opening the tabs will fix it.**

---

## Version 4.0 Features

### 🎛️ Settings Panel
Click the ⚙️ button (bottom-right corner) to toggle features on/off:
- All bypasses can be individually enabled/disabled
- Settings are saved to localStorage
- Changes take effect after page reload

### 🤖 NEW: AI Solution Generator
- Automatically generates code solutions using AI
- Supports **Google Gemini** and **OpenAI (ChatGPT)**
- Works on both tutorial pages (generates middle code portion) and code track pages (generates complete solution)
- Purple "🤖 AI Solution" button appears next to Save/Run buttons
- Configure your API key in the settings panel

### 🔢 Auto Captcha Solver (Credit: [adithyagenie](https://github.com/adithyagenie/skillrack-captcha-solver))
- Automatically solves math captcha using Tesseract.js OCR
- **Dynamically finds captcha images** - works across different pages (tutorprogram, codeprogram, etc.)
- Inverts image colors for better OCR accuracy
- Handles retry on failure
- **Optional username parsing**: If your username contains '+' and numbers (e.g., `abcd123+21@xyz`), set it in the settings panel to remove it from the captcha text before solving

### 1. Tab Switch Detection Bypass
- Spoofs `document.visibilityState` to always return `'visible'`
- Spoofs `document.hidden` to always return `false`
- Blocks `visibilitychange` event listeners

### 2. Copy/Paste/Cut Functionality Restoration
- Intercepts clipboard events at capture phase (runs before jQuery handlers)
- Pre-emptive ACE editor interception - blocks restrictions before they're applied
- Keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z) work in the code editor
- Overrides jQuery's `$.fn.bind()` and `$.fn.on()` to filter out clipboard event bindings
- Restores native Clipboard API functionality

### 3. Drag & Drop Restrictions Removal
- Removes `ondragstart`, `ondrop`, `onselectstart` attributes from `<body>` and all elements
- Runs on page load and periodically to catch dynamic content

### 4. Text Selection Enablement
- Injects CSS to force `user-select: text !important` on all elements
- Blocks `selectstart` event prevention
- Restores right-click context menu

### 5. ACE Editor Bypass
Handles ACE Editor-specific restrictions:

| Blocking Method | Bypass Solution |
|----------------|-----------------|
| `commands.addCommand({name: 'bte', bindKey: 'ctrl-c\|ctrl-v\|...'})` | Intercepts and blocks command registration |
| `commands.on("exec", ...)` paste blocking | Filters out exec handlers that block clipboard |
| `container.addEventListener("drop", ...)` | Adds working drop handler in capture phase |
| Anti-bulk-paste (30+ char detection) | Intercepts change handlers and `setValue()` to block reset attempts |
| `cs()` function diff check | Overrides to always sync code |

### 6. Fullscreen Enforcement Bypass
- Intercepts `requestFullscreen()` and `exitFullscreen()` calls
- Blocks fullscreen change event listeners
- Spoofs `document.fullscreenElement` to always return a value

### 7. Multi-Monitor Detection Prevention
- Spoofs `window.screen` properties (`left: 0`, `top: 0`, `isExtended: false`)
- Normalizes mouse movement tracking

### 8. Heartbeat/Telemetry Blocking
- Intercepts XMLHttpRequest and Fetch API
- Blocks requests to specific proctoring/telemetry endpoints
- Returns fake successful responses

---

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/)
2. Create a new userscript
3. Copy the contents of `userscript.js` into the editor
4. Save and enable the script

---

## Settings Panel

Click the **⚙️ gear button** in the bottom-right corner to open settings:

### Anti-Cheat Bypasses
| Setting | Description | Default |
|---------|-------------|---------|
| Tab Detection Bypass | Prevent tab switch detection | ✅ On |
| Copy/Paste Bypass | Enable clipboard in code editor | ✅ On |
| Fullscreen Bypass | Skip fullscreen enforcement | ✅ On |
| Multi-Monitor Bypass | Block monitor detection | ✅ On |
| Block Telemetry | Block heartbeat requests | ✅ On |

### Editor Features
| Setting | Description | Default |
|---------|-------------|---------|
| Drag & Drop | Enable drag & drop text | ✅ On |
| Text Selection | Enable text selection | ✅ On |
| Context Menu | Enable right-click menu | ✅ On |

### Captcha Solver
| Setting | Description | Default |
|---------|-------------|---------|
| Auto-Solve Captcha | Automatically solve math captcha | ✅ On |
| Username (optional) | Your username for captcha parsing | (empty) |

### AI Solution Generator
| Setting | Description | Default |
|---------|-------------|---------|
| Enable AI Solver | Show AI solution button | ✅ On |
| AI Provider | Choose Gemini or OpenAI | Gemini |
| Gemini API Key | Your Google Gemini API key | (empty) |
| OpenAI API Key | Your OpenAI API key | (empty) |

---

## AI Solution Generator Setup

### Using Google Gemini (Free)
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API key
3. Paste it in the settings panel under "Gemini API Key"

### Using OpenAI (Paid)
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an API key
3. Paste it in the settings panel under "OpenAI API Key"
4. Change "AI Provider" to "OpenAI (ChatGPT)"

---

## How It Works

### Event Interception Strategy
```
User Action (Ctrl+V)
        ↓
Capture Phase (our listeners run FIRST)
  → stopImmediatePropagation()
  → Native clipboard action proceeds
        ↓
Bubbling Phase (site's jQuery handlers)
  → Event never reaches here (blocked)
```

### ACE Editor Command Override
```
Site tries: txtCode.commands.addCommand({name: 'bte', bindKey: 'ctrl-c|ctrl-v'...})
                                ↓
Script intercepts ace.edit() before site code runs
                                ↓
Blocks 'bte' command registration
                                ↓
Clipboard shortcuts work normally
```

### Anti-Reset Protection
```
User pastes 100 characters
        ↓
Site detects: (newLength - oldLength) > 30
        ↓
Site calls: txtCode.getSession().setValue(oldValue)
        ↓
Script intercepts setValue()
        ↓
Detects reset attempt (new value shorter)
        ↓
Blocks the reset → Paste preserved!
```

### Dynamic Captcha Detection
```
Page loads with captcha
        ↓
Script searches for captcha image dynamically:
  1. Find image near captcha input field
  2. Look in code editor panel
  3. Search for base64 PNG images with captcha dimensions
  4. Fallback to known element IDs
        ↓
Tesseract.js OCR processes inverted image
        ↓
Math equation extracted and solved
        ↓
Answer auto-filled and submitted
```

---

## Troubleshooting

### Clipboard still not working?
- Check browser console for "Blocked" messages
- Ensure the script runs at `document-start`
- Try refreshing the page after enabling the script

### ACE Editor bypass not working?
- The editor variable might have a different name
- Check if the editor loads dynamically (increase timeout values)
- Open browser console to see bypass status messages

### Captcha solver not working?
- Wait for Tesseract.js to load (may take a few seconds on first run)
- Check console for "Captcha elements not found" message
- If stuck in a loop, close and reopen the tab
- The captcha image IDs change dynamically - the script now handles this automatically

### AI Solution not appearing?
- Make sure you've entered your API key in settings
- Check if the problem description is visible on the page
- Look for error messages in the browser console
- For tutor pages, the AI generates only the middle code portion

### Site detecting the bypass?
- Reduce console.log statements if needed
- The script restores some event listeners after 1 second for normal site functionality

---

## Disclaimer

This script is for educational purposes only. Use responsibly and in accordance with applicable terms of service and regulations.

**⚠️ Remember to disable this script during actual tests and examinations.**

---

## License

MIT License

## Credits

- **ToonTamilIndia** - Main development
- **[adithyagenie](https://github.com/adithyagenie/skillrack-captcha-solver)** - Captcha solver implementation

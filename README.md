# Anti-Cheat Bypass Userscript

A Tampermonkey/Greasemonkey userscript that bypasses common anti-cheat mechanisms on SkillRack.

## ⚠️ Important Warnings

> **⚠️ Please disable the script if you are attending a test as it might lead to unintended effects.**

> **⚠️ Attempting to navigate the page while the captcha solver is running may lead to unintended effects. If it gets stuck in a loop, closing and opening the tabs will fix it.**

---

## Version 4.6 Features

### 🆕 New in v4.6

#### 🔄 Mandatory Update Check
- Automatically checks for updates from GitHub
- Compares your local version with the latest available version
- Shows an update dialog if a newer version is available
- **You must update to continue using the script** if outdated
- "Update Now" button opens the script URL for easy updating

#### ⚖️ First-Time Disclaimer
- Shows a comprehensive disclaimer on first use
- Covers legal and academic responsibility warnings
- Must accept to use the script (saved in localStorage)
- Includes warnings about:
  - Academic penalties and disciplinary actions
  - Account suspension or termination
  - Legal consequences
  - Damage to academic records

#### 🚫 Remote Kill Switch
- Script can be remotely disabled by the author if necessary
- Checks `kill.txt` on GitHub (contains `true` or `false`)
- If disabled, shows a "Script Disabled" message
- Useful for emergency situations or maintenance

### 🎛️ Settings Panel
Click the ⚙️ button (bottom-right corner) to toggle features on/off:
- All bypasses can be individually enabled/disabled
- Settings are saved to localStorage
- Changes take effect after page reload

### 🤖 AI Solution Generator
- Automatically generates code solutions using AI
- Supports **4 AI Providers**:
  - **Google Gemini** - Free tier available
  - **OpenAI (ChatGPT)** - Paid
  - **OpenRouter (Multi-Model)** - Free & Paid models
  - **G4F (g4f.space)** - Alternative provider
- Works on both tutorial pages (generates middle code portion) and code track pages (generates complete solution)
- Purple "🤖 AI Solution" button appears next to Save/Run buttons
- Configure your API key in the settings panel

#### 🆕 Dynamic OpenRouter Model Selection (v4.5+)
- **Fetches models dynamically** from OpenRouter API
- **Smart caching** (6-hour cache) to avoid excessive API calls
- **Search & filter** models by name, author, or group
- **"Show free only"** checkbox to filter free models
- **Grouped by provider** (Google, Anthropic, OpenAI, Meta, etc.)
- **Refresh button** to get the latest models
- Hundreds of models available including:
  - ⭐ Free models (Gemini, DeepSeek, Llama, Qwen, etc.)
  - Premium models (Claude, GPT-4o, Gemini Pro, etc.)

#### 🆕 G4F Provider Support (v4.4+)
- Integration with g4f.space API
- Dynamic model fetching with caching
- Search and filter functionality
- Auto model selection option

### ⚡ Auto Solver (Experimental)
- **Fully automated problem solving**
- Clicks AI Solution button → Waits for generation → Runs code → Handles results
- Automatic retry on failure (configurable max retries)
- Proceeds to next problem on success
- **Stop button** to halt at any time
- Status indicator shows current operation
- ⚠️ Experimental feature - use at your own risk

### 🔢 Auto Captcha Solver (Credit: [adithyagenie](https://github.com/adithyagenie/skillrack-captcha-solver))
- Automatically solves math captcha using Tesseract.js OCR
- **Dynamically finds captcha images** - works across different pages
- Inverts image colors for better OCR accuracy
- Handles retry on failure
- **Optional username parsing**: If your username contains '+' and numbers (e.g., `abcd123+21@xyz`), set it in the settings panel

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
5. **Accept the disclaimer** on first run
6. Configure your settings and API keys

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
| Enable AI Solver | Show AI solution button | ❌ Off |
| ⚡ Auto Solver | Auto-solve & submit (experimental) | ❌ Off |
| AI Provider | Choose Gemini, OpenAI, OpenRouter, or G4F | Gemini |
| Gemini API Key | Your Google Gemini API key | (empty) |
| OpenAI API Key | Your OpenAI API key | (empty) |
| OpenRouter API Key | Your OpenRouter API key | (empty) |
| OpenRouter Model | Dynamic model selection with search | Gemini 2.0 Flash |
| G4F API Key | Your G4F API key | (empty) |
| G4F Model | Dynamic model selection | Auto |

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

### Using OpenRouter (Free & Paid Models) ⭐ Recommended
1. Go to [OpenRouter](https://openrouter.ai/keys)
2. Create an API key (free tier available)
3. Paste it in the settings panel under "OpenRouter API Key"
4. Change "AI Provider" to "OpenRouter (Multi-Model)"
5. **Search or browse** models using the dynamic selector
6. Check "Show free only" to filter free models

#### Popular Free Models on OpenRouter:
| Model | Provider | Specialty |
|-------|----------|-----------|
| Gemini 2.0 Flash | Google | Fast, general purpose |
| DeepSeek R1 | DeepSeek | Reasoning |
| Qwen3 Coder 480B | Qwen | Coding |
| Llama 3.3 70B | Meta | General purpose |
| Claude 3 Haiku | Anthropic | Fast responses |

### Using G4F (g4f.space)
1. Go to [G4F](https://g4f.space)
2. Create an account and get an API key
3. Paste it in the settings panel under "G4F API Key"
4. Change "AI Provider" to "G4F (g4f.space)"
5. Select a model or use "Auto" for automatic selection

---

## Auto Solver Usage

⚠️ **Experimental Feature - Use at Your Own Risk**

1. Enable both "Enable AI Solver" and "⚡ Auto Solver" in settings
2. Configure your AI provider and API key
3. Navigate to a problem page
4. The auto solver will:
   - Wait for captcha to be solved (if present)
   - Click the AI Solution button
   - Wait for code generation
   - Click Run to execute
   - Handle success/failure
   - Proceed to next problem on success
5. **Click the STOP button** to halt at any time

---

## How It Works

### Initialization Flow (v4.6)
```
Script Loads
     ↓
Check Kill Switch (GitHub kill.txt)
     ↓ (if enabled)
Check for Updates (compare versions)
     ↓ (if up to date)
Show Disclaimer (first time only)
     ↓ (if accepted)
Initialize All Features
```

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

### Dynamic Model Loading (OpenRouter)
```
User opens settings panel
        ↓
Fetch models from OpenRouter API
        ↓
Cache for 6 hours
        ↓
Group by provider (Free first)
        ↓
Enable search & filtering
```

---

## Troubleshooting

### Script not loading?
- Check if you accepted the disclaimer
- Check browser console for kill switch status
- Make sure you have the latest version

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

### AI Solution not appearing?
- Make sure you've entered your API key in settings
- Check if the problem description is visible on the page
- Look for error messages in the browser console

### OpenRouter models not loading?
- Click the 🔄 refresh button
- Check your internet connection
- Models are cached for 6 hours

### Auto Solver stuck?
- Click the **STOP** button
- Check console for error messages
- Increase delay settings if needed

---

## Remote Control

### Kill Switch
The author can remotely disable the script by setting `kill.txt` to `false`:
- `true` - Script works normally
- `false` - Script is disabled with a message

This is used for:
- Emergency situations
- Maintenance periods
- Security concerns

---

## Disclaimer

⚠️ **IMPORTANT - READ CAREFULLY:**

- This script is provided **"AS IS"** without any warranty of any kind.
- The author(s) are **NOT RESPONSIBLE** for any consequences arising from the use of this script, including but not limited to:
  - Academic penalties or disciplinary actions
  - Account suspension or termination
  - Legal consequences
  - Any damage to your academic record
- By using this script, you acknowledge that bypassing anti-cheat measures may violate your institution's academic integrity policies.
- You are **solely responsible** for your actions and any consequences that may result.
- This script is for **educational purposes only**.

**⚠️ Remember to disable this script during actual tests and examinations.**

---

## Changelog

### v4.6
- ✨ Mandatory update check with dialog
- ✨ First-time disclaimer acceptance
- ✨ Remote kill switch functionality
- 🔧 Improved script initialization flow

### v4.5
- ✨ Dynamic OpenRouter model selection via API
- ✨ Model search and filtering
- ✨ "Show free only" filter
- ✨ Model caching (6 hours)
- 🔧 Fixed stop button functionality in Auto Solver

### v4.4
- ✨ G4F (g4f.space) provider support
- ✨ Dynamic G4F model loading
- ✨ Auto Solver feature (experimental)
- 🔧 Various bug fixes

### v4.3
- ✨ OpenRouter integration with 30+ models
- ✨ Custom model ID support
- 🔧 Improved AI prompt engineering

### v4.2
- ✨ Improved captcha solver
- 🔧 Dynamic captcha image detection

### v4.1
- ✨ Settings panel UI
- ✨ AI Solution Generator
- ✨ Multiple AI provider support

---

## License

MIT License

## Credits

- **ToonTamilIndia** - Main development
- **[adithyagenie](https://github.com/adithyagenie/skillrack-captcha-solver)** - Captcha solver implementation

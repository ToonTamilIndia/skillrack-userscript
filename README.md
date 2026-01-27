# Anti-Cheat Bypass Userscript

A Tampermonkey/Greasemonkey userscript that bypasses common anti-cheat mechanisms on SkillRack.

## Version 3.0 Features

### 🎛️ Settings Panel
Click the ⚙️ button (bottom-right corner) to toggle features on/off:
- All bypasses can be individually enabled/disabled
- Settings are saved to localStorage
- Changes take effect after page reload

### 1. Tab Switch Detection Bypass
- Spoofs `document.visibilityState` to always return `'visible'`
- Spoofs `document.hidden` to always return `false`
- Blocks `visibilitychange` event listeners

### 2. Copy/Paste/Cut Functionality Restoration
- Intercepts clipboard events at capture phase (runs before jQuery handlers)
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
| `commands.addCommand({name: 'bte', bindKey: 'ctrl-c\|ctrl-v\|...'})` | Removes blocking commands, adds working clipboard commands |
| `commands.on("exec", ...)` paste blocking | Filters out exec handlers that block clipboard |
| `container.addEventListener("drop", ...)` | Clones container to remove listeners, adds working drop handler |
| Anti-bulk-paste (30+ char detection) | Intercepts `setValue()` to block reset attempts |
| jQuery `val()` reset | Overrides jQuery's `val()` to prevent content resets |

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

### 9. 🆕 Auto Captcha Solver (Credit: [adithyagenie](https://github.com/adithyagenie/skillrack-captcha-solver))
- Automatically solves math captcha using Tesseract.js OCR
- Inverts image colors for better OCR accuracy
- Handles retry on failure
- **Optional username parsing**: If your username contains '+' and numbers (e.g., `abcd123+21@xyz`), set it in the settings panel to remove it from the captcha text before solving

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/)
2. Create a new userscript
3. Copy the contents of `userscript.js` into the editor
4. Save and enable the script

## Settings Panel

Click the **⚙️ gear button** in the bottom-right corner to open settings:

| Setting | Description | Default |
|---------|-------------|---------|
| Tab Detection Bypass | Prevent tab switch detection | ✅ On |
| Copy/Paste Bypass | Enable clipboard in code editor | ✅ On |
| Fullscreen Bypass | Skip fullscreen enforcement | ✅ On |
| Multi-Monitor Bypass | Block monitor detection | ✅ On |
| Block Telemetry | Block heartbeat requests | ✅ On |
| Drag & Drop | Enable drag & drop text | ✅ On |
| Text Selection | Enable text selection | ✅ On |
| Context Menu | Enable right-click menu | ✅ On |
| Auto-Solve Captcha | Automatically solve math captcha | ✅ On |
| Username (optional) | Your username for captcha parsing | (empty) |

### Username Setting for Captcha
If your username contains '+' and numbers together (e.g., `abcd123+21@xyz`), the captcha solver might misread it as part of the math equation. Enter your username in the settings to filter it out.

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
Site adds: txtCode.commands.addCommand({name: 'bte', bindKey: 'ctrl-c|ctrl-v'...})
                                ↓
Script removes 'bte' command
                                ↓
Script adds working copy/paste/cut/undo commands
                                ↓
Clipboard now works in ACE editor
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

## Troubleshooting

### Clipboard still not working?
- Check browser console for "Blocked" messages
- Ensure the script runs at `document-start`
- Try refreshing the page after enabling the script

### ACE Editor bypass not working?
- The editor variable might have a different name
- Add the variable name to `editorNames` array in the script
- Check if the editor loads dynamically (increase timeout values)

### Site detecting the bypass?
- Reduce console.log statements
- The script restores some event listeners after 1 second for normal site functionality

## Disclaimer

This script is for educational purposes only. Use responsibly and in accordance with applicable terms of service and regulations.

## License

MIT License

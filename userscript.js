// ==UserScript==
// @name         Anti-Cheat Bypass
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Bypass tab switching, copy/paste restrictions, full-screen enforcement, and auto-solve captcha
// @author       ToonTamilIndia (Captcha solver by adithyagenie)
// @match        https://*.skillrack.com/*
// @match        https://skillrack.com/*
// @require      https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // SETTINGS - Toggle features on/off
    // ============================================
    const DEFAULT_SETTINGS = {
        // Anti-cheat bypasses
        bypassTabDetection: true,      // Bypass tab switch detection
        bypassCopyPaste: true,         // Enable copy/paste in ACE editor
        bypassFullscreen: true,        // Bypass fullscreen enforcement
        bypassMultiMonitor: true,      // Block multi-monitor detection
        blockTelemetry: true,          // Block heartbeat/telemetry requests
        enableDragDrop: true,          // Enable drag & drop
        enableTextSelection: true,     // Enable text selection
        enableContextMenu: true,       // Enable right-click menu
        
        // Captcha solver (credit: adithyagenie)
        enableCaptchaSolver: true,     // Auto-solve math captcha
        captchaUsername: "",           // Username to remove from captcha (optional)
    };

    // Load settings from localStorage or use defaults
    const loadSettings = () => {
        try {
            const saved = localStorage.getItem('skillrack_bypass_settings');
            if (saved) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.log('Failed to load settings:', e);
        }
        return { ...DEFAULT_SETTINGS };
    };

    const saveSettings = (settings) => {
        try {
            localStorage.setItem('skillrack_bypass_settings', JSON.stringify(settings));
        } catch (e) {
            console.log('Failed to save settings:', e);
        }
    };

    let SETTINGS = loadSettings();

    // ============================================
    // SETTINGS UI
    // ============================================
    const createSettingsUI = () => {
        // Create settings button
        const settingsBtn = document.createElement('button');
        settingsBtn.innerHTML = '⚙️';
        settingsBtn.title = 'Bypass Settings';
        settingsBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 99999;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: none;
            background: #4CAF50;
            color: white;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            transition: transform 0.2s, background 0.2s;
        `;
        settingsBtn.onmouseover = () => settingsBtn.style.transform = 'scale(1.1)';
        settingsBtn.onmouseout = () => settingsBtn.style.transform = 'scale(1)';

        // Create settings panel
        const panel = document.createElement('div');
        panel.id = 'bypass-settings-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            z-index: 99998;
            width: 320px;
            max-height: 500px;
            overflow-y: auto;
            background: #1e1e1e;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            display: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        const panelHeader = document.createElement('div');
        panelHeader.style.cssText = `
            padding: 16px;
            border-bottom: 1px solid #333;
            background: #2d2d2d;
            border-radius: 12px 12px 0 0;
        `;
        panelHeader.innerHTML = `
            <h3 style="margin: 0; color: #4CAF50; font-size: 16px;">🛡️ Bypass Settings</h3>
            <small style="color: #888;">Toggle features on/off</small>
        `;

        const panelContent = document.createElement('div');
        panelContent.style.cssText = 'padding: 12px;';

        const createToggle = (id, label, checked, description = '') => {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 0;
                border-bottom: 1px solid #333;
            `;
            wrapper.innerHTML = `
                <div style="flex: 1;">
                    <div style="color: #fff; font-size: 13px;">${label}</div>
                    ${description ? `<div style="color: #666; font-size: 11px; margin-top: 2px;">${description}</div>` : ''}
                </div>
                <label style="position: relative; display: inline-block; width: 44px; height: 24px;">
                    <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                    <span style="
                        position: absolute;
                        cursor: pointer;
                        top: 0; left: 0; right: 0; bottom: 0;
                        background-color: ${checked ? '#4CAF50' : '#555'};
                        transition: .3s;
                        border-radius: 24px;
                    "></span>
                    <span style="
                        position: absolute;
                        content: '';
                        height: 18px;
                        width: 18px;
                        left: ${checked ? '23px' : '3px'};
                        bottom: 3px;
                        background-color: white;
                        transition: .3s;
                        border-radius: 50%;
                    "></span>
                </label>
            `;

            const checkbox = wrapper.querySelector('input');
            const slider = wrapper.querySelector('span:first-of-type');
            const circle = wrapper.querySelector('span:last-of-type');

            checkbox.addEventListener('change', () => {
                SETTINGS[id] = checkbox.checked;
                slider.style.backgroundColor = checkbox.checked ? '#4CAF50' : '#555';
                circle.style.left = checkbox.checked ? '23px' : '3px';
                saveSettings(SETTINGS);
            });

            return wrapper;
        };

        const createTextInput = (id, label, value, placeholder = '') => {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'padding: 10px 0; border-bottom: 1px solid #333;';
            wrapper.innerHTML = `
                <div style="color: #fff; font-size: 13px; margin-bottom: 6px;">${label}</div>
                <input type="text" id="${id}" value="${value}" placeholder="${placeholder}" style="
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #444;
                    border-radius: 6px;
                    background: #2d2d2d;
                    color: #fff;
                    font-size: 12px;
                    box-sizing: border-box;
                ">
            `;
            
            const input = wrapper.querySelector('input');
            input.addEventListener('change', () => {
                SETTINGS[id] = input.value;
                saveSettings(SETTINGS);
            });

            return wrapper;
        };

        const createSectionHeader = (title) => {
            const header = document.createElement('div');
            header.style.cssText = `
                color: #4CAF50;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
                padding: 12px 0 6px 0;
                letter-spacing: 1px;
            `;
            header.textContent = title;
            return header;
        };

        // Add toggles
        panelContent.appendChild(createSectionHeader('Anti-Cheat Bypasses'));
        panelContent.appendChild(createToggle('bypassTabDetection', 'Tab Detection Bypass', SETTINGS.bypassTabDetection, 'Prevent tab switch detection'));
        panelContent.appendChild(createToggle('bypassCopyPaste', 'Copy/Paste Bypass', SETTINGS.bypassCopyPaste, 'Enable clipboard in code editor'));
        panelContent.appendChild(createToggle('bypassFullscreen', 'Fullscreen Bypass', SETTINGS.bypassFullscreen, 'Skip fullscreen enforcement'));
        panelContent.appendChild(createToggle('bypassMultiMonitor', 'Multi-Monitor Bypass', SETTINGS.bypassMultiMonitor, 'Block monitor detection'));
        panelContent.appendChild(createToggle('blockTelemetry', 'Block Telemetry', SETTINGS.blockTelemetry, 'Block heartbeat requests'));
        
        panelContent.appendChild(createSectionHeader('Editor Features'));
        panelContent.appendChild(createToggle('enableDragDrop', 'Drag & Drop', SETTINGS.enableDragDrop, 'Enable drag & drop text'));
        panelContent.appendChild(createToggle('enableTextSelection', 'Text Selection', SETTINGS.enableTextSelection, 'Enable text selection'));
        panelContent.appendChild(createToggle('enableContextMenu', 'Context Menu', SETTINGS.enableContextMenu, 'Enable right-click menu'));

        panelContent.appendChild(createSectionHeader('Captcha Solver (by adithyagenie)'));
        panelContent.appendChild(createToggle('enableCaptchaSolver', 'Auto-Solve Captcha', SETTINGS.enableCaptchaSolver, 'Automatically solve math captcha'));
        panelContent.appendChild(createTextInput('captchaUsername', 'Username (optional)', SETTINGS.captchaUsername, 'e.g., abcd123+21@xyz'));

        const note = document.createElement('div');
        note.style.cssText = 'color: #666; font-size: 10px; padding: 12px 0; text-align: center;';
        note.innerHTML = '⚠️ Reload page after changing settings<br>Some features require page refresh';
        panelContent.appendChild(note);

        panel.appendChild(panelHeader);
        panel.appendChild(panelContent);

        settingsBtn.addEventListener('click', () => {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && e.target !== settingsBtn) {
                panel.style.display = 'none';
            }
        });

        // Add to page when DOM is ready
        const addToPage = () => {
            document.body.appendChild(settingsBtn);
            document.body.appendChild(panel);
        };

        if (document.body) {
            addToPage();
        } else {
            document.addEventListener('DOMContentLoaded', addToPage);
        }
    };

    // Create settings UI after a delay to ensure page is loaded
    setTimeout(createSettingsUI, 1000);

    // Store original functions
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRequestFullscreen = Element.prototype.requestFullscreen;
    const originalExitFullscreen = document.exitFullscreen;
    const originalClipboardWrite = navigator.clipboard?.writeText;
    const originalClipboardRead = navigator.clipboard?.readText;

    // ============================================
    // PRE-EMPTIVE ACE EDITOR INTERCEPTION
    // This runs BEFORE ACE loads to intercept blocking attempts
    // ============================================
    
    if (SETTINGS.bypassCopyPaste) {
    
    // Store reference to intercept ace.edit when it's created
    let aceIntercepted = false;
    const interceptAce = () => {
        if (aceIntercepted || !window.ace) return;
        
        const originalEdit = window.ace.edit;
        window.ace.edit = function(...args) {
            const editor = originalEdit.apply(this, args);
            
            if (editor && editor.commands) {
                // Intercept addCommand to block 'bte' and similar
                const originalAddCommand = editor.commands.addCommand.bind(editor.commands);
                editor.commands.addCommand = function(command) {
                    // Block commands that disable clipboard shortcuts
                    if (command && command.name === 'bte') {
                        console.log('Blocked ACE bte command registration');
                        return;
                    }
                    if (command && command.bindKey) {
                        const bindKey = typeof command.bindKey === 'string' 
                            ? command.bindKey 
                            : (command.bindKey.win || command.bindKey.mac || '');
                        if (bindKey.includes('ctrl-c') || bindKey.includes('ctrl-v') || 
                            bindKey.includes('ctrl-x') || bindKey.includes('cmd-c') ||
                            bindKey.includes('cmd-v') || bindKey.includes('cmd-x')) {
                            if (command.exec && command.exec.toString().includes('function() {}')) {
                                console.log('Blocked empty clipboard command:', command.name);
                                return;
                            }
                        }
                    }
                    return originalAddCommand(command);
                };

                // Intercept commands.on to block paste-blocking exec handlers
                const originalCommandsOn = editor.commands.on.bind(editor.commands);
                editor.commands.on = function(event, callback) {
                    if (event === 'exec' && callback) {
                        const cbStr = callback.toString();
                        if (cbStr.includes('paste') && cbStr.includes('preventDefault')) {
                            console.log('Blocked ACE exec paste-blocking handler');
                            return;
                        }
                    }
                    return originalCommandsOn(event, callback);
                };

                // Intercept session.on('change') for anti-bulk-paste bypass
                if (editor.session) {
                    const originalSessionOn = editor.session.on.bind(editor.session);
                    editor.session.on = function(event, callback) {
                        if (event === 'change' && callback) {
                            const cbStr = callback.toString();
                            // Block the 30-char diff detection handler
                            if (cbStr.includes('diff > 30') || cbStr.includes('diff>30')) {
                                console.log('Blocked ACE 30-char anti-paste change handler');
                                // Replace with a simple sync handler that always syncs
                                return originalSessionOn(event, function(e) {
                                    const $ = window.jQuery || window.$;
                                    if ($ && $("#txtCode").length) {
                                        $("#txtCode").val(editor.getSession().getValue());
                                    }
                                });
                            }
                        }
                        return originalSessionOn(event, callback);
                    };
                    
                    // Also add our own change handler to ensure sync always happens
                    editor.session.on('change', function(e) {
                        const $ = window.jQuery || window.$;
                        if ($ && $("#txtCode").length) {
                            $("#txtCode").val(editor.getSession().getValue());
                        }
                    });
                }
            }
            
            return editor;
        };
        
        aceIntercepted = true;
        console.log('ACE editor intercepted');
    };

    // Watch for ace to be defined
    Object.defineProperty(window, 'ace', {
        configurable: true,
        set: function(value) {
            delete window.ace;
            window.ace = value;
            interceptAce();
        },
        get: function() {
            return undefined;
        }
    });

    // Also check periodically in case ace is already loaded
    const aceCheck = setInterval(() => {
        if (window.ace && !aceIntercepted) {
            interceptAce();
            clearInterval(aceCheck);
        }
    }, 50);
    setTimeout(() => clearInterval(aceCheck), 10000);

    // ============================================
    // KEYBOARD EVENT INTERCEPTION (for Ctrl+V in ACE)
    // ============================================
    
    // Intercept keydown at the highest priority to ensure Ctrl+V works
    window.addEventListener('keydown', function(e) {
        // Handle Ctrl+V / Cmd+V
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            const activeEl = document.activeElement;
            const aceContainer = activeEl?.closest('.ace_editor');
            
            if (aceContainer && aceContainer.env?.editor) {
                e.stopImmediatePropagation();
                // Don't preventDefault - allow the native paste event to fire
                
                const editor = aceContainer.env.editor;
                
                // Try Clipboard API first (works if permissions granted)
                // Fall back to native paste event handling
                if (navigator.clipboard && navigator.clipboard.readText) {
                    navigator.clipboard.readText().then(text => {
                        if (text) {
                            const session = editor.getSession();
                            const $ = window.jQuery || window.$;
                            
                            // Insert text directly
                            session.insert(editor.getCursorPosition(), text);
                            
                            // Sync with hidden textarea immediately
                            if ($ && $("#txtCode").length) {
                                $("#txtCode").val(session.getValue());
                            }
                        }
                    }).catch(err => {
                        // Clipboard API failed - this is expected without permissions
                        // The native paste event should still work through ACE's built-in handling
                        console.log('Clipboard API not available, using native paste');
                    });
                }
            }
        }
        
        // Handle Ctrl+C / Cmd+C
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            const activeEl = document.activeElement;
            const aceContainer = activeEl?.closest('.ace_editor');
            
            if (aceContainer && aceContainer.env?.editor) {
                e.stopImmediatePropagation();
                
                const editor = aceContainer.env.editor;
                const text = editor.getCopyText();
                
                if (text && navigator.clipboard) {
                    navigator.clipboard.writeText(text);
                }
            }
        }
        
        // Handle Ctrl+X / Cmd+X
        if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
            const activeEl = document.activeElement;
            const aceContainer = activeEl?.closest('.ace_editor');
            
            if (aceContainer && aceContainer.env?.editor) {
                e.stopImmediatePropagation();
                
                const editor = aceContainer.env.editor;
                const text = editor.getCopyText();
                
                if (text && navigator.clipboard) {
                    navigator.clipboard.writeText(text);
                    editor.session.remove(editor.getSelectionRange());
                }
            }
        }
        
        // Handle Ctrl+Z / Cmd+Z (Undo)
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            const activeEl = document.activeElement;
            const aceContainer = activeEl?.closest('.ace_editor');
            
            if (aceContainer && aceContainer.env?.editor) {
                e.stopImmediatePropagation();
                aceContainer.env.editor.undo();
            }
        }
    }, true); // Capture phase - runs first
    } // End of SETTINGS.bypassCopyPaste block for keyboard interception

    // 1. BLOCK TAB SWITCH DETECTION (Page Visibility API)
    if (SETTINGS.bypassTabDetection) {
        Object.defineProperty(document, 'visibilityState', {
            get: function() {
                return 'visible'; // Always report as visible
            },
            configurable: true
        });

        Object.defineProperty(document, 'hidden', {
            get: function() {
                return false; // Always report as not hidden
            },
            configurable: true
        });

        // Override addEventListener to block visibilitychange events
        // But allow other events to pass through normally
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (type === 'visibilitychange' || type === 'webkitvisibilitychange') {
                console.log('Blocked visibilitychange event listener');
                return; // Don't add the listener
            }
            return originalAddEventListener.call(this, type, listener, options);
        };
    }

    // 2. ENABLE COPY/PASTE FUNCTIONALITY
    if (SETTINGS.bypassCopyPaste) {
        // Block ALL clipboard event prevention by stopping propagation
        // This prevents jQuery's document-level handlers from blocking copy/paste
        const blockClipboardPrevention = (e) => {
            e.stopImmediatePropagation();
            e.stopPropagation();
            // Do NOT call preventDefault - let the native action happen
        };

    // Capture phase listeners run BEFORE bubbling phase (where jQuery binds)
    // Use original addEventListener to avoid our own blocking
    // Apply to ALL elements, not just ACE editor, to enable copying question text
    originalAddEventListener.call(document, 'copy', blockClipboardPrevention, true);
    originalAddEventListener.call(document, 'cut', blockClipboardPrevention, true);
    originalAddEventListener.call(document, 'paste', blockClipboardPrevention, true);
    
    // Handle native paste event for ACE editor (fallback when Clipboard API is blocked)
    originalAddEventListener.call(document, 'paste', function(e) {
        const activeEl = document.activeElement;
        const aceContainer = activeEl?.closest('.ace_editor');
        
        if (aceContainer && aceContainer.env?.editor && e.clipboardData) {
            const text = e.clipboardData.getData('text/plain');
            if (text) {
                e.preventDefault();
                const editor = aceContainer.env.editor;
                const session = editor.getSession();
                const $ = window.jQuery || window.$;
                
                // Insert text directly
                session.insert(editor.getCursorPosition(), text);
                
                // Sync with hidden textarea
                if ($ && $("#txtCode").length) {
                    $("#txtCode").val(session.getValue());
                }
            }
        }
    }, false);

    // Also intercept at window level
    originalAddEventListener.call(window, 'copy', blockClipboardPrevention, true);
    originalAddEventListener.call(window, 'cut', blockClipboardPrevention, true);
    originalAddEventListener.call(window, 'paste', blockClipboardPrevention, true);

    // Override jQuery's bind/on methods to ignore clipboard events
    // BUT preserve PrimeFaces functionality
    const waitForJQuery = setInterval(() => {
        if (window.jQuery || window.$) {
            const jq = window.jQuery || window.$;
            const originalBind = jq.fn.bind;
            const originalOn = jq.fn.on;
            
            const filterClipboardEvents = function(events) {
                if (typeof events === 'string') {
                    // Only filter direct clipboard events, not namespaced ones from PrimeFaces
                    const eventList = events.split(/\s+/);
                    const filtered = eventList.filter(e => {
                        const baseEvent = e.split('.')[0];
                        // Only block if it's a simple cut/copy/paste without namespace
                        // This preserves PrimeFaces events like 'change.primefaces'
                        return !['cut', 'copy', 'paste'].includes(baseEvent) || e.includes('.');
                    });
                    return filtered.join(' ');
                }
                return events;
            };

            jq.fn.bind = function(events, ...args) {
                if (typeof events === 'string' && ['cut', 'copy', 'paste'].some(e => events === e)) {
                    return this; // Only block exact matches
                }
                return originalBind.call(this, events, ...args);
            };

            jq.fn.on = function(events, ...args) {
                if (typeof events === 'string' && ['cut', 'copy', 'paste'].some(e => events === e)) {
                    return this; // Only block exact matches
                }
                return originalOn.call(this, events, ...args);
            };

            console.log('jQuery clipboard event binding intercepted');
            clearInterval(waitForJQuery);
        }
    }, 10);

    // Stop checking after 5 seconds
    setTimeout(() => clearInterval(waitForJQuery), 5000);

    // Restore clipboard API if available
    if (navigator.clipboard) {
        if (originalClipboardWrite) {
            navigator.clipboard.writeText = originalClipboardWrite;
        }
        if (originalClipboardRead) {
            navigator.clipboard.readText = originalClipboardRead;
        }
    }
    } // End of SETTINGS.bypassCopyPaste block

    // 2.1 REMOVE DRAG & DROP RESTRICTIONS
    if (SETTINGS.enableDragDrop) {
        // Remove inline event handlers from body when DOM is ready
        const removeDragRestrictions = () => {
            document.body?.removeAttribute('ondragstart');
            document.body?.removeAttribute('ondrop');
            document.body?.removeAttribute('onselectstart');
            document.body?.removeAttribute('oncontextmenu');
            
            // Also remove from all elements that might have these
            document.querySelectorAll('[ondragstart], [ondrop], [onselectstart]').forEach(el => {
                el.removeAttribute('ondragstart');
                el.removeAttribute('ondrop');
                el.removeAttribute('onselectstart');
            });
        };

        // Run when DOM is ready and also after a delay for dynamic content
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', removeDragRestrictions);
        } else {
            removeDragRestrictions();
        }
        setTimeout(removeDragRestrictions, 1000);
        setTimeout(removeDragRestrictions, 3000);
    }

    // 2.2 ENABLE TEXT SELECTION (often disabled via CSS or JS)
    if (SETTINGS.enableTextSelection) {
        const enableSelection = () => {
            const style = document.createElement('style');
            style.textContent = `
                *, *::before, *::after {
                    -webkit-user-select: text !important;
                    -moz-user-select: text !important;
                    -ms-user-select: text !important;
                    user-select: text !important;
                }
                body {
                    -webkit-touch-callout: default !important;
                }
            `;
            (document.head || document.documentElement).appendChild(style);
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', enableSelection);
        } else {
            enableSelection();
        }

        // 2.3 BLOCK SELECTSTART EVENT PREVENTION
        document.addEventListener('selectstart', (e) => {
            e.stopImmediatePropagation();
        }, true);
    } // End of SETTINGS.enableTextSelection

    // 2.4 RESTORE CONTEXT MENU (right-click)
    if (SETTINGS.enableContextMenu) {
        document.addEventListener('contextmenu', (e) => {
            e.stopImmediatePropagation();
        }, true);
    }

    // 2.5 ACE EDITOR BYPASS - Handle all ACE-specific restrictions (post-load cleanup)
    const bypassAceEditor = () => {
        if (!SETTINGS.bypassCopyPaste) return;
        
        // Find ACE editor instances (txtCode or any ace editor)
        const aceEditors = [];
        
        // Check for txtCode specifically (SkillRack uses this)
        if (window.txtCode && window.txtCode.commands) {
            aceEditors.push(window.txtCode);
        }
        
        // Check other common variable names for ACE editors
        const editorNames = ['editor', 'aceEditor', 'codeEditor'];
        editorNames.forEach(name => {
            if (window[name] && window[name].commands && !aceEditors.includes(window[name])) {
                aceEditors.push(window[name]);
            }
        });

        // Also find via ace.edit instances
        if (window.ace) {
            document.querySelectorAll('.ace_editor').forEach(el => {
                if (el.env && el.env.editor && !aceEditors.includes(el.env.editor)) {
                    aceEditors.push(el.env.editor);
                }
            });
        }

        aceEditors.forEach(editor => {
            // Skip if already bypassed
            if (editor._bypassApplied) return;
            editor._bypassApplied = true;
            
            console.log('Found ACE editor, applying post-load bypass...');

            // 2.5.1 Remove the 'bte' command that blocks ctrl-c/v/x/z
            if (editor.commands) {
                // Remove specific blocking commands
                const blockedCommands = ['bte', 'null', 'blockPaste', 'blockCopy', 'blockCut'];
                blockedCommands.forEach(cmd => {
                    try {
                        editor.commands.removeCommand(cmd, true);
                    } catch(e) {}
                });

                // Also remove any command with empty exec that binds to clipboard keys
                if (editor.commands.commands) {
                    Object.keys(editor.commands.commands).forEach(cmdName => {
                        const cmd = editor.commands.commands[cmdName];
                        if (cmd && cmd.exec) {
                            const execStr = cmd.exec.toString();
                            if (execStr === 'function() {}' || execStr === 'function () {}') {
                                const bindKey = typeof cmd.bindKey === 'string' 
                                    ? cmd.bindKey 
                                    : (cmd.bindKey?.win || cmd.bindKey?.mac || '');
                                if (bindKey.includes('ctrl-c') || bindKey.includes('ctrl-v') || 
                                    bindKey.includes('ctrl-x') || bindKey.includes('ctrl-z')) {
                                    console.log('Removing empty command:', cmdName);
                                    try {
                                        editor.commands.removeCommand(cmdName, true);
                                    } catch(e) {}
                                }
                            }
                        }
                    });
                }

                // 2.5.2 Remove exec event listeners that block paste
                if (editor.commands._eventRegistry && editor.commands._eventRegistry.exec) {
                    const originalExecHandlers = editor.commands._eventRegistry.exec;
                    editor.commands._eventRegistry.exec = originalExecHandlers.filter(handler => {
                        const handlerStr = handler.toString();
                        if (handlerStr.includes('paste') && handlerStr.includes('preventDefault')) {
                            console.log('Removed paste-blocking exec handler');
                            return false;
                        }
                        return true;
                    });
                }
            }

            // 2.5.3 Remove change event listeners that do 30-char detection
            if (editor.session && editor.session._eventRegistry && editor.session._eventRegistry.change) {
                const originalChangeHandlers = editor.session._eventRegistry.change;
                editor.session._eventRegistry.change = originalChangeHandlers.filter(handler => {
                    const handlerStr = handler.toString();
                    if (handlerStr.includes('diff > 30') || handlerStr.includes('diff>30')) {
                        console.log('Removed 30-char anti-paste change handler');
                        return false;
                    }
                    return true;
                });
            }

            // 2.5.4 Override setValue to prevent reset attempts
            if (editor.session && !editor.session._setValueOverridden) {
                editor.session._setValueOverridden = true;
                const originalSetValue = editor.session.setValue.bind(editor.session);
                const originalGetValue = editor.session.getValue.bind(editor.session);
                
                editor.session.setValue = function(text, cursorPos) {
                    const currentValue = originalGetValue();
                    
                    // If current value is substantial and new value is much shorter, block it
                    // This catches the anti-paste reset
                    if (currentValue.length > 10 && text.length < currentValue.length - 10) {
                        console.log('Blocked setValue reset attempt');
                        return;
                    }
                    
                    return originalSetValue(text, cursorPos);
                };
            }

            // 2.5.5 Enable drop events on ACE container
            if (editor.container) {
                // Use capture phase to intercept before the blocking handler
                editor.container.addEventListener('drop', (e) => {
                    e.stopImmediatePropagation();
                    const text = e.dataTransfer?.getData('text/plain');
                    if (text && editor.session) {
                        editor.session.insert(editor.getCursorPosition(), text);
                        // Sync with hidden textarea
                        const $ = window.jQuery || window.$;
                        if ($ && $("#txtCode").length) {
                            $("#txtCode").val(editor.session.getValue());
                        }
                    }
                }, true);

                editor.container.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                }, true);
            }

            console.log('ACE editor bypass applied successfully');
        });
        
        // Also override the global cs() function if it exists (SkillRack specific)
        if (typeof window.cs === 'function' && !window._csOverridden) {
            window._csOverridden = true;
            const originalCs = window.cs;
            window.cs = function() {
                // Just sync the value, don't do the diff check
                if (window.txtCode && window.jQuery) {
                    const $ = window.jQuery;
                    if ($("#txtCode").length && window.txtCode.getSession) {
                        const val = window.txtCode.getSession().getValue();
                        // Always sync, even if empty (user might have cleared the editor)
                        $("#txtCode").val(val);
                    }
                }
            };
            console.log('Overrode cs() function');
        }
        
        // Also override oncompile if it exists
        if (typeof window.oncompile === 'function' && !window._oncompileOverridden) {
            window._oncompileOverridden = true;
            const originalOncompile = window.oncompile;
            window.oncompile = function() {
                // Sync the code before compile
                if (window.txtCode && window.jQuery) {
                    const $ = window.jQuery;
                    if ($("#txtCode").length && window.txtCode.getSession) {
                        const val = window.txtCode.getSession().getValue();
                        $("#txtCode").val(val);
                    }
                }
                // Call original if it does something else
                if (originalOncompile) {
                    return originalOncompile.apply(this, arguments);
                }
            };
            console.log('Overrode oncompile() function');
        }
    };

    // Run ACE bypass after page loads and periodically check for new editors
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(bypassAceEditor, 500);
            setTimeout(bypassAceEditor, 1500);
            setTimeout(bypassAceEditor, 3000);
        });
    } else {
        setTimeout(bypassAceEditor, 500);
        setTimeout(bypassAceEditor, 1500);
        setTimeout(bypassAceEditor, 3000);
    }

    // Also watch for dynamically created editors
    const aceObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1 && (node.classList?.contains('ace_editor') || 
                    node.querySelector?.('.ace_editor'))) {
                    setTimeout(bypassAceEditor, 100);
                }
            });
        });
    });
    
    if (document.body) {
        aceObserver.observe(document.body, { childList: true, subtree: true });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            aceObserver.observe(document.body, { childList: true, subtree: true });
        });
    }

    // 3. BYPASS FULL-SCREEN ENFORCEMENT
    // Store original for document specifically
    const originalDocumentAddEventListener = document.addEventListener.bind(document);
    
    if (SETTINGS.bypassFullscreen) {
        Element.prototype.requestFullscreen = function() {
            console.log('Full-screen request intercepted');
            // Return a fake promise that resolves immediately
            return Promise.resolve();
        };

        document.exitFullscreen = function() {
            console.log('Exit full-screen intercepted');
            return Promise.resolve();
        };

        // Override fullscreenchange event listeners
        document.addEventListener = function(type, listener, options) {
            if (type === 'fullscreenchange' || type === 'webkitfullscreenchange' ||
                type === 'mozfullscreenchange' || type === 'MSFullscreenChange' ||
                type === 'visibilitychange' || type === 'webkitvisibilitychange') {
                console.log('Blocked ' + type + ' event listener on document');
                return;
            }
            return originalDocumentAddEventListener(type, listener, options);
        };

        // Fake fullscreenElement
        Object.defineProperty(document, 'fullscreenElement', {
            get: function() {
                return document.documentElement; // Always return something
            },
            configurable: true
        });
    }

    // 4. BLOCK MULTI-MONITOR DETECTION HEURISTICS
    if (SETTINGS.bypassMultiMonitor) {
        // Override screen properties
        const originalScreen = window.screen;
        Object.defineProperty(window, 'screen', {
            get: function() {
                const fakeScreen = {
                    width: originalScreen.width,
                    height: originalScreen.height,
                    availWidth: originalScreen.availWidth,
                    availHeight: originalScreen.availHeight,
                    colorDepth: originalScreen.colorDepth,
                    pixelDepth: originalScreen.pixelDepth,
                    // Prevent detection of multi-monitor setups
                    left: 0,
                    top: 0,
                    isExtended: false
                };
                return fakeScreen;
            },
            configurable: true
        });

        // Block mouse movement tracking
        let lastMouseX = 0;
        let lastMouseY = 0;
        document.addEventListener('mousemove', (e) => {
            // Normalize mouse movement to prevent detection of rapid movements
            const now = Date.now();
            if (now % 10 === 0) { // Only record every 10ms
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
            }
        }, true);
    }

    // 5. BLOCK HEARTBEAT/ANOMALY DETECTION
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    const originalFetch = window.fetch;

    if (SETTINGS.blockTelemetry) {
        // Override XMLHttpRequest and fetch to monitor requests
        XMLHttpRequest.prototype.open = function(method, url) {
            this._url = url;
            return originalXHROpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function(body) {
            // Check if this is a heartbeat/telemetry request
            // Be more specific to avoid blocking legitimate requests
            if (this._url && (
                this._url.includes('/heartbeat') ||
                this._url.includes('/telemetry') ||
                this._url.includes('/proctoring') ||
                this._url.includes('/activity-monitor') ||
                this._url.includes('/tab-switch')
            )) {
                console.log('Blocked telemetry request to:', this._url);
                // Simulate successful response
                this.readyState = 4;
                this.status = 200;
                this.statusText = 'OK';
                if (this.onreadystatechange) {
                    this.onreadystatechange();
                }
                return;
            }
            return originalXHRSend.apply(this, arguments);
        };

        window.fetch = function(resource, init) {
            const url = resource.url || resource;
            // Check if this is a heartbeat/telemetry request
            // Be more specific to avoid blocking legitimate requests
            if (url && (
                url.includes('/heartbeat') ||
                url.includes('/telemetry') ||
                url.includes('/proctoring') ||
                url.includes('/activity-monitor') ||
                url.includes('/tab-switch')
            )) {
                console.log('Blocked telemetry fetch to:', url);
                // Return a fake successful response
                return Promise.resolve(new Response(JSON.stringify({success: true}), {
                    status: 200,
                    statusText: 'OK',
                    headers: {'Content-Type': 'application/json'}
                }));
            }
            return originalFetch.apply(this, arguments);
        };
    } // End of SETTINGS.blockTelemetry

    // 6. RESTORE NORMAL FUNCTIONALITY FOR USER INTERACTION
    // Allow normal event handling after a short delay
    setTimeout(() => {
        // Restore addEventListener for non-monitoring events
        EventTarget.prototype.addEventListener = originalAddEventListener;
        document.addEventListener = originalDocumentAddEventListener;

        // But keep blocking specific anti-cheat events only if enabled
        if (SETTINGS.bypassTabDetection) {
            const blockEvents = ['visibilitychange', 'webkitvisibilitychange'];

            const newAddEventListener = EventTarget.prototype.addEventListener;
            EventTarget.prototype.addEventListener = function(type, listener, options) {
                if (blockEvents.includes(type)) {
                    console.log(`Blocked ${type} event listener`);
                    return;
                }
                return newAddEventListener.call(this, type, listener, options);
            };
        }
    }, 1000);

    // 7. PRESERVE PRIMEFACES AJAX FUNCTIONALITY
    // Ensure PrimeFaces AJAX works correctly after DOM updates
    const preservePrimeFaces = () => {
        // Re-apply ACE bypass after PrimeFaces AJAX updates
        if (window.PrimeFaces && window.PrimeFaces.ajax) {
            const originalAjaxResponse = window.PrimeFaces.ajax.Response && 
                                          window.PrimeFaces.ajax.Response.handle;
            if (originalAjaxResponse && !window._pfAjaxPatched) {
                window._pfAjaxPatched = true;
                window.PrimeFaces.ajax.Response.handle = function(...args) {
                    const result = originalAjaxResponse.apply(this, args);
                    // Re-apply bypass after AJAX update
                    setTimeout(bypassAceEditor, 100);
                    return result;
                };
            }
            
            // Also patch the request to sync code before AJAX
            const originalAjaxRequest = window.PrimeFaces.ajax.Request && 
                                         window.PrimeFaces.ajax.Request.handle;
            if (originalAjaxRequest && !window._pfAjaxRequestPatched) {
                window._pfAjaxRequestPatched = true;
                window.PrimeFaces.ajax.Request.handle = function(cfg, ...rest) {
                    // Sync ACE editor content before AJAX request
                    if (window.txtCode && window.jQuery) {
                        const $ = window.jQuery;
                        if ($("#txtCode").length && window.txtCode.getSession) {
                            const val = window.txtCode.getSession().getValue();
                            $("#txtCode").val(val);
                        }
                    }
                    return originalAjaxRequest.call(this, cfg, ...rest);
                };
            }
        }
    };
    
    // Check for PrimeFaces
    const pfCheck = setInterval(() => {
        if (window.PrimeFaces) {
            preservePrimeFaces();
            clearInterval(pfCheck);
        }
    }, 100);
    setTimeout(() => clearInterval(pfCheck), 10000);

    // 8. ENSURE CODE SYNC ON FORM SUBMIT
    // Intercept form submissions to sync ACE editor content
    const syncCodeBeforeSubmit = () => {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            if (form._syncPatched) return;
            form._syncPatched = true;
            
            form.addEventListener('submit', function(e) {
                // Sync ACE editor content before form submission
                if (window.txtCode && window.jQuery) {
                    const $ = window.jQuery;
                    if ($("#txtCode").length && window.txtCode.getSession) {
                        const val = window.txtCode.getSession().getValue();
                        $("#txtCode").val(val);
                        console.log('Synced code before form submit');
                    }
                }
            }, true); // Capture phase to run first
        });
    };
    
    // Run sync setup when DOM is ready and after delays for dynamic forms
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(syncCodeBeforeSubmit, 500);
            setTimeout(syncCodeBeforeSubmit, 2000);
        });
    } else {
        setTimeout(syncCodeBeforeSubmit, 500);
        setTimeout(syncCodeBeforeSubmit, 2000);
    }

    // ============================================
    // 9. CAPTCHA SOLVER (Credit: adithyagenie)
    // https://github.com/adithyagenie/skillrack-captcha-solver
    // ============================================
    
    const TUTOR_REGEX = /https:\/\/(www.)?skillrack\.com\/faces\/candidate\/tutorprogram\.xhtml/gi;
    const ERROR_CLASS = "ui-growl-item";
    const TUTOR_IMG_ID = "j_id_5s";
    const NON_TUTOR_IMG_ID = "j_id_76";
    const BACK_BTN_ID = "j_id_63";
    const CAPTCHA_INPUT_ID = "capval";
    const PROCEED_BTN_ID = "proceedbtn";

    // Invert colours for better OCR
    function invertColors(image) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        ctx.globalCompositeOperation = "difference";
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return canvas.toDataURL();
    }

    // Remove username from captcha and solve math
    function solveCaptcha(text) {
        const username = SETTINGS.captchaUsername || "";
        let cleanedText = text;
        
        if (username) {
            cleanedText = text.replace(new RegExp(username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi"), "").trim();
        }
        
        const match = cleanedText.match(/(\d+)\s*\+\s*(\d+)/);
        if (match) {
            return parseInt(match[1], 10) + parseInt(match[2], 10);
        }
        return null;
    }

    // Helper function to safely click buttons that may have PrimeFaces handlers
    function safeButtonClick(button) {
        if (!button) return;
        
        setTimeout(() => {
            try {
                const evt = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                button.dispatchEvent(evt);
            } catch (err) {
                console.log('Button click fallback:', err);
                button.click();
            }
        }, 50);
    }

    function handleCaptcha() {
        if (!SETTINGS.enableCaptchaSolver) return;
        
        // Check if Tesseract is available
        if (typeof Tesseract === 'undefined') {
            console.log('Tesseract not loaded, skipping captcha solver');
            return;
        }

        // Get the captcha image
        const isTutor = window.location.href.includes("tutorprogram");
        const captchaImageId = isTutor ? TUTOR_IMG_ID : NON_TUTOR_IMG_ID;
        const image = document.getElementById(captchaImageId);
        const textbox = document.getElementById(CAPTCHA_INPUT_ID);
        const button = document.getElementById(PROCEED_BTN_ID);
        
        if (!image || !textbox || !button) {
            console.log("Captcha elements not found, skipping.");
            return;
        }

        console.log("Captcha detected, attempting to solve...");
        const invertedImg = invertColors(image);
        
        // Process with Tesseract.js
        Tesseract.recognize(invertedImg, "eng", {
            whitelist: "1234567890+=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@ ",
            psm: 6,
        })
        .then(({ data: { text } }) => {
            console.log(`OCR Result: ${text}`);
            const result = solveCaptcha(text);
            
            if (result === null) {
                console.log("Could not solve captcha automatically");
                handleIncorrectCaptcha();
                return;
            }
            
            console.log(`Captcha solution: ${result}`);
            textbox.value = result;
            safeButtonClick(button);
        })
        .catch((error) => {
            console.error("Error processing captcha:", error);
        });
    }

    function handleIncorrectCaptcha() {
        if (!SETTINGS.enableCaptchaSolver) return;
        
        // If in tutorial pages, can't go back
        if (window.location.href.match(TUTOR_REGEX)) {
            const captext = prompt("Unable to solve captcha automatically. Please enter the math result:");
            if (captext === null) return;
            
            const textbox = document.getElementById(CAPTCHA_INPUT_ID);
            const button = document.getElementById(PROCEED_BTN_ID);
            if (textbox && button) {
                textbox.value = captext;
                safeButtonClick(button);
            }
            return;
        }
        
        // Go back and retry
        sessionStorage.setItem("captchaFail", "true");
        const backBtn = document.getElementById(BACK_BTN_ID);
        safeButtonClick(backBtn);
    }

    // Store solve button ID for retry
    document.addEventListener("click", (event) => {
        if (SETTINGS.enableCaptchaSolver &&
            event.target.tagName === "SPAN" && 
            event.target.parentNode.tagName === "BUTTON" && 
            event.target.textContent === "Solve") {
            sessionStorage.setItem("Solvebtnid", event.target.parentNode.id);
        }
    }, false);

    // Initialize captcha solver on page load
    window.addEventListener("load", function() {
        if (!SETTINGS.enableCaptchaSolver) return;
        
        // Detect if last captcha attempt was a fail to re-nav back
        if (sessionStorage.getItem("captchaFail")) {
            sessionStorage.removeItem("captchaFail");
            const oldBtnId = sessionStorage.getItem("Solvebtnid");
            if (oldBtnId) {
                const oldBtn = document.getElementById(oldBtnId);
                if (oldBtn) oldBtn.click();
            }
            return;
        }

        // Check for incorrect captcha error
        const errors = document.getElementsByClassName(ERROR_CLASS);
        if (errors.length > 0 && errors[0].textContent.includes("Incorrect Captcha")) {
            handleIncorrectCaptcha();
            return;
        }
        
        // Try to solve captcha
        handleCaptcha();
    });

    console.log('Anti-cheat bypass script v3.0 loaded successfully');
    console.log('Settings:', SETTINGS);
})();
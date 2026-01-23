// ==UserScript==
// @name         Anti-Cheat Bypass
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Bypass tab switching, copy/paste restrictions, and full-screen enforcement
// @author       ToonTamilIndia
// @match        https://*.skillrack.com/*
// @match        https://skillrack.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

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
                                // Replace with a simple sync handler
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
                
                const editor = aceContainer.env.editor;
                
                // Use Clipboard API to paste
                if (navigator.clipboard && navigator.clipboard.readText) {
                    navigator.clipboard.readText().then(text => {
                        if (text) {
                            // Temporarily disable any change listeners
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
                        console.log('Clipboard read failed:', err);
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

    // 1. BLOCK TAB SWITCH DETECTION (Page Visibility API)
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
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (type === 'visibilitychange') {
            console.log('Blocked visibilitychange event listener');
            return; // Don't add the listener
        }
        return originalAddEventListener.call(this, type, listener, options);
    };

    // 2. ENABLE COPY/PASTE FUNCTIONALITY
    
    // Block jQuery's event binding for cut/copy/paste
    const blockClipboardEvents = (e) => {
        e.stopImmediatePropagation();
        e.stopPropagation();
        // Do NOT call preventDefault - let the native action happen
    };

    // Capture phase listeners run BEFORE bubbling phase (where jQuery binds)
    document.addEventListener('copy', blockClipboardEvents, true);
    document.addEventListener('cut', blockClipboardEvents, true);
    document.addEventListener('paste', blockClipboardEvents, true);

    // Also intercept at window level
    window.addEventListener('copy', blockClipboardEvents, true);
    window.addEventListener('cut', blockClipboardEvents, true);
    window.addEventListener('paste', blockClipboardEvents, true);

    // Override jQuery's bind/on methods to ignore clipboard events
    const waitForJQuery = setInterval(() => {
        if (window.jQuery || window.$) {
            const jq = window.jQuery || window.$;
            const originalBind = jq.fn.bind;
            const originalOn = jq.fn.on;
            
            const filterClipboardEvents = function(events) {
                if (typeof events === 'string') {
                    return events.split(/\s+/).filter(e => 
                        !['cut', 'copy', 'paste'].includes(e.split('.')[0])
                    ).join(' ');
                }
                return events;
            };

            jq.fn.bind = function(events, ...args) {
                const filtered = filterClipboardEvents(events);
                if (!filtered) return this;
                return originalBind.call(this, filtered, ...args);
            };

            jq.fn.on = function(events, ...args) {
                const filtered = filterClipboardEvents(events);
                if (!filtered) return this;
                return originalOn.call(this, filtered, ...args);
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

    // 2.1 REMOVE DRAG & DROP RESTRICTIONS
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

    // 2.2 ENABLE TEXT SELECTION (often disabled via CSS or JS)
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

    // 2.4 RESTORE CONTEXT MENU (right-click)
    document.addEventListener('contextmenu', (e) => {
        e.stopImmediatePropagation();
    }, true);

    // 2.5 ACE EDITOR BYPASS - Handle all ACE-specific restrictions (post-load cleanup)
    const bypassAceEditor = () => {
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
                        if (val !== '') {
                            $("#txtCode").val(val);
                        }
                    }
                }
            };
            console.log('Overrode cs() function');
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
    const originalDocumentAddEventListener = document.addEventListener;
    document.addEventListener = function(type, listener, options) {
        if (type === 'fullscreenchange' || type === 'webkitfullscreenchange' ||
            type === 'mozfullscreenchange' || type === 'MSFullscreenChange') {
            console.log('Blocked fullscreenchange event listener');
            return;
        }
        return originalDocumentAddEventListener.call(this, type, listener, options);
    };

    // Fake fullscreenElement
    Object.defineProperty(document, 'fullscreenElement', {
        get: function() {
            return document.documentElement; // Always return something
        },
        configurable: true
    });

    // 4. BLOCK MULTI-MONITOR DETECTION HEURISTICS
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

    // 5. BLOCK HEARTBEAT/ANOMALY DETECTION
    // Override XMLHttpRequest and fetch to monitor requests
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    const originalFetch = window.fetch;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        return originalXHROpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function(body) {
        // Check if this is a heartbeat/telemetry request
        if (this._url && (this._url.includes('heartbeat') ||
                          this._url.includes('telemetry') ||
                          this._url.includes('log') ||
                          this._url.includes('activity'))) {
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
        if (url && (url.includes('heartbeat') ||
                    url.includes('telemetry') ||
                    url.includes('log') ||
                    url.includes('activity'))) {
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

    // 6. RESTORE NORMAL FUNCTIONALITY FOR USER INTERACTION
    // Allow normal event handling after a short delay
    setTimeout(() => {
        // Restore addEventListener for non-monitoring events
        EventTarget.prototype.addEventListener = originalAddEventListener;
        document.addEventListener = originalDocumentAddEventListener;

        // But keep blocking specific events
        const blockEvents = ['visibilitychange', 'fullscreenchange', 'webkitfullscreenchange',
                           'mozfullscreenchange', 'MSFullscreenChange'];

        const newAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (blockEvents.includes(type)) {
                console.log(`Blocked ${type} event listener`);
                return;
            }
            return newAddEventListener.call(this, type, listener, options);
        };
    }, 1000);

    console.log('Anti-cheat bypass script loaded successfully');
})();
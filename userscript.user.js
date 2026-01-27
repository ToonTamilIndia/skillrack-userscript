// ==UserScript==
// @name         Anti-Cheat Bypass
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  Bypass tab switching, copy/paste restrictions, full-screen enforcement, auto-solve captcha, and AI-powered solution generator
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
        
        // AI Solution Generator
        enableAISolver: true,          // Enable AI solution button
        aiProvider: "gemini",          // "gemini", "openai", or "openrouter"
        geminiApiKey: "",              // Google Gemini API key
        openaiApiKey: "",              // OpenAI API key
        openrouterApiKey: "",          // OpenRouter API key
        openrouterModel: "google/gemini-2.5-flash-001", // OpenRouter model ID
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

        panelContent.appendChild(createSectionHeader('AI Solution Generator'));
        panelContent.appendChild(createToggle('enableAISolver', 'Enable AI Solver', SETTINGS.enableAISolver, 'Show AI solution button'));
        
        // AI Provider selector
        const providerWrapper = document.createElement('div');
        providerWrapper.style.cssText = 'padding: 10px 0; border-bottom: 1px solid #333;';
        providerWrapper.innerHTML = `
            <div style="color: #fff; font-size: 13px; margin-bottom: 6px;">AI Provider</div>
            <select id="aiProvider" style="
                width: 100%;
                padding: 8px;
                border: 1px solid #444;
                border-radius: 6px;
                background: #2d2d2d;
                color: #fff;
                font-size: 12px;
                box-sizing: border-box;
            ">
                <option value="gemini" ${SETTINGS.aiProvider === 'gemini' ? 'selected' : ''}>Google Gemini</option>
                <option value="openai" ${SETTINGS.aiProvider === 'openai' ? 'selected' : ''}>OpenAI (ChatGPT)</option>
                <option value="openrouter" ${SETTINGS.aiProvider === 'openrouter' ? 'selected' : ''}>OpenRouter (Multi-Model)</option>
            </select>
        `;
        const providerSelect = providerWrapper.querySelector('select');
        providerSelect.addEventListener('change', () => {
            SETTINGS.aiProvider = providerSelect.value;
            saveSettings(SETTINGS);
            // Show/hide OpenRouter model selector
            const orModelWrapper = document.getElementById('openrouter-model-wrapper');
            if (orModelWrapper) {
                orModelWrapper.style.display = providerSelect.value === 'openrouter' ? 'block' : 'none';
            }
        });
        panelContent.appendChild(providerWrapper);
        
        panelContent.appendChild(createTextInput('geminiApiKey', 'Gemini API Key', SETTINGS.geminiApiKey, 'Enter your Gemini API key'));
        panelContent.appendChild(createTextInput('openaiApiKey', 'OpenAI API Key', SETTINGS.openaiApiKey, 'Enter your OpenAI API key'));
        panelContent.appendChild(createTextInput('openrouterApiKey', 'OpenRouter API Key', SETTINGS.openrouterApiKey, 'Enter your OpenRouter API key'));
        
        // OpenRouter Model selector
        const orModelWrapper = document.createElement('div');
        orModelWrapper.id = 'openrouter-model-wrapper';
        orModelWrapper.style.cssText = `padding: 10px 0; border-bottom: 1px solid #333; display: ${SETTINGS.aiProvider === 'openrouter' ? 'block' : 'none'};`;
        orModelWrapper.innerHTML = `
            <div style="color: #fff; font-size: 13px; margin-bottom: 6px;">OpenRouter Model</div>
            <select id="openrouterModel" style="
                width: 100%;
                padding: 8px;
                border: 1px solid #444;
                border-radius: 6px;
                background: #2d2d2d;
                color: #fff;
                font-size: 11px;
                box-sizing: border-box;
            ">
                <optgroup label="⭐ Free Models">
                    <option value="google/gemini-2.0-flash-exp:free" ${SETTINGS.openrouterModel === 'google/gemini-2.0-flash-exp:free' ? 'selected' : ''}>Gemini 2.0 Flash Exp (Free)</option>
                    <option value="deepseek/deepseek-r1-0528:free" ${SETTINGS.openrouterModel === 'deepseek/deepseek-r1-0528:free' ? 'selected' : ''}>DeepSeek R1 0528 (Free)</option>
                    <option value="qwen/qwen3-coder-480b-a35b:free" ${SETTINGS.openrouterModel === 'qwen/qwen3-coder-480b-a35b:free' ? 'selected' : ''}>Qwen3 Coder 480B (Free)</option>
                    <option value="qwen/qwen3-next-80b-a3b-instruct:free" ${SETTINGS.openrouterModel === 'qwen/qwen3-next-80b-a3b-instruct:free' ? 'selected' : ''}>Qwen3 Next 80B (Free)</option>
                    <option value="openai/gpt-oss-120b:free" ${SETTINGS.openrouterModel === 'openai/gpt-oss-120b:free' ? 'selected' : ''}>GPT-OSS 120B (Free)</option>
                    <option value="openai/gpt-oss-20b:free" ${SETTINGS.openrouterModel === 'openai/gpt-oss-20b:free' ? 'selected' : ''}>GPT-OSS 20B (Free)</option>
                    <option value="meta-llama/llama-3.3-70b-instruct:free" ${SETTINGS.openrouterModel === 'meta-llama/llama-3.3-70b-instruct:free' ? 'selected' : ''}>Llama 3.3 70B (Free)</option>
                    <option value="google/gemma-3-27b:free" ${SETTINGS.openrouterModel === 'google/gemma-3-27b:free' ? 'selected' : ''}>Gemma 3 27B (Free)</option>
                    <option value="nvidia/nemotron-3-nano-30b-a3b:free" ${SETTINGS.openrouterModel === 'nvidia/nemotron-3-nano-30b-a3b:free' ? 'selected' : ''}>Nemotron 3 Nano 30B (Free)</option>
                    <option value="nvidia/nemotron-nano-12b-2-vl:free" ${SETTINGS.openrouterModel === 'nvidia/nemotron-nano-12b-2-vl:free' ? 'selected' : ''}>Nemotron Nano 12B VL (Free)</option>
                    <option value="z-ai/glm-4.5-air:free" ${SETTINGS.openrouterModel === 'z-ai/glm-4.5-air:free' ? 'selected' : ''}>GLM 4.5 Air (Free)</option>
                    <option value="arcee-ai/trinity-mini:free" ${SETTINGS.openrouterModel === 'arcee-ai/trinity-mini:free' ? 'selected' : ''}>Trinity Mini (Free)</option>
                    <option value="tngtech/deepseek-r1t2-chimera:free" ${SETTINGS.openrouterModel === 'tngtech/deepseek-r1t2-chimera:free' ? 'selected' : ''}>DeepSeek R1T2 Chimera (Free)</option>
                    <option value="tngtech/deepseek-r1t-chimera:free" ${SETTINGS.openrouterModel === 'tngtech/deepseek-r1t-chimera:free' ? 'selected' : ''}>DeepSeek R1T Chimera (Free)</option>
                    <option value="tngtech/r1t-chimera:free" ${SETTINGS.openrouterModel === 'tngtech/r1t-chimera:free' ? 'selected' : ''}>R1T Chimera (Free)</option>
                </optgroup>
                <optgroup label="Google">
                    <option value="google/gemini-2.0-flash-001" ${SETTINGS.openrouterModel === 'google/gemini-2.0-flash-001' ? 'selected' : ''}>Gemini 2.0 Flash</option>
                    <option value="google/gemini-2.5-pro-preview" ${SETTINGS.openrouterModel === 'google/gemini-2.5-pro-preview' ? 'selected' : ''}>Gemini 2.5 Pro</option>
                    <option value="google/gemini-2.5-flash-preview" ${SETTINGS.openrouterModel === 'google/gemini-2.5-flash-preview' ? 'selected' : ''}>Gemini 2.5 Flash</option>
                </optgroup>
                <optgroup label="Anthropic">
                    <option value="anthropic/claude-sonnet-4" ${SETTINGS.openrouterModel === 'anthropic/claude-sonnet-4' ? 'selected' : ''}>Claude Sonnet 4</option>
                    <option value="anthropic/claude-3.5-haiku" ${SETTINGS.openrouterModel === 'anthropic/claude-3.5-haiku' ? 'selected' : ''}>Claude 3.5 Haiku</option>
                </optgroup>
                <optgroup label="OpenAI">
                    <option value="openai/gpt-4o" ${SETTINGS.openrouterModel === 'openai/gpt-4o' ? 'selected' : ''}>GPT-4o</option>
                    <option value="openai/gpt-4o-mini" ${SETTINGS.openrouterModel === 'openai/gpt-4o-mini' ? 'selected' : ''}>GPT-4o Mini</option>
                    <option value="openai/o3-mini" ${SETTINGS.openrouterModel === 'openai/o3-mini' ? 'selected' : ''}>o3-mini</option>
                </optgroup>
                <optgroup label="Meta">
                    <option value="meta-llama/llama-3.3-70b-instruct" ${SETTINGS.openrouterModel === 'meta-llama/llama-3.3-70b-instruct' ? 'selected' : ''}>Llama 3.3 70B</option>
                    <option value="meta-llama/llama-4-scout" ${SETTINGS.openrouterModel === 'meta-llama/llama-4-scout' ? 'selected' : ''}>Llama 4 Scout</option>
                </optgroup>
                <optgroup label="DeepSeek">
                    <option value="deepseek/deepseek-chat" ${SETTINGS.openrouterModel === 'deepseek/deepseek-chat' ? 'selected' : ''}>DeepSeek V3</option>
                    <option value="deepseek/deepseek-r1" ${SETTINGS.openrouterModel === 'deepseek/deepseek-r1' ? 'selected' : ''}>DeepSeek R1</option>
                </optgroup>
                <optgroup label="Qwen">
                    <option value="qwen/qwen-2.5-coder-32b-instruct" ${SETTINGS.openrouterModel === 'qwen/qwen-2.5-coder-32b-instruct' ? 'selected' : ''}>Qwen 2.5 Coder 32B</option>
                    <option value="qwen/qwen3-235b-a22b" ${SETTINGS.openrouterModel === 'qwen/qwen3-235b-a22b' ? 'selected' : ''}>Qwen3 235B</option>
                </optgroup>
                <optgroup label="Mistral">
                    <option value="mistralai/mistral-large" ${SETTINGS.openrouterModel === 'mistralai/mistral-large' ? 'selected' : ''}>Mistral Large</option>
                    <option value="mistralai/codestral-latest" ${SETTINGS.openrouterModel === 'mistralai/codestral-latest' ? 'selected' : ''}>Codestral</option>
                </optgroup>
                <optgroup label="Other">
                    <option value="nvidia/llama-3.1-nemotron-70b-instruct" ${SETTINGS.openrouterModel === 'nvidia/llama-3.1-nemotron-70b-instruct' ? 'selected' : ''}>Nemotron 70B</option>
                </optgroup>
            </select>
            <input type="text" id="openrouterCustomModel" placeholder="Or enter custom model ID" value="" style="
                width: 100%;
                padding: 8px;
                margin-top: 6px;
                border: 1px solid #444;
                border-radius: 6px;
                background: #2d2d2d;
                color: #fff;
                font-size: 11px;
                box-sizing: border-box;
            ">
        `;
        const orModelSelect = orModelWrapper.querySelector('select');
        const orCustomInput = orModelWrapper.querySelector('input');
        orModelSelect.addEventListener('change', () => {
            SETTINGS.openrouterModel = orModelSelect.value;
            saveSettings(SETTINGS);
        });
        orCustomInput.addEventListener('change', () => {
            if (orCustomInput.value.trim()) {
                SETTINGS.openrouterModel = orCustomInput.value.trim();
                orModelSelect.value = ''; // Deselect dropdown
                saveSettings(SETTINGS);
            }
        });
        panelContent.appendChild(orModelWrapper);

        const note = document.createElement('div');
        note.style.cssText = 'color: #666; font-size: 10px; padding: 12px 0; text-align: center;';
        note.innerHTML = '⚠️ Reload page after changing settings<br>🔑 <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:#4CAF50;">Gemini</a> | <a href="https://openrouter.ai/keys" target="_blank" style="color:#4CAF50;">OpenRouter</a>';
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
    const CAPTCHA_INPUT_ID = "capval";
    const PROCEED_BTN_ID = "proceedbtn";

    // Find captcha image dynamically (IDs change between pages/sessions)
    function findCaptchaImage() {
        // Method 1: Find image near the captcha input
        const captchaInput = document.getElementById(CAPTCHA_INPUT_ID);
        if (captchaInput) {
            // Look for img in the same parent/grandparent container
            let container = captchaInput.parentElement;
            for (let i = 0; i < 3 && container; i++) {
                const img = container.querySelector('img[src^="data:image"]');
                if (img) return img;
                container = container.parentElement;
            }
        }
        
        // Method 2: Find any base64 captcha image in the code editor panel
        const codeEditorPanel = document.getElementById('codeeditorpanel');
        if (codeEditorPanel) {
            const img = codeEditorPanel.querySelector('img[src^="data:image"]');
            if (img) return img;
        }
        
        // Method 3: Look for img elements with base64 src that look like captcha
        const allImages = document.querySelectorAll('img[src^="data:image/png;base64"]');
        for (const img of allImages) {
            // Captcha images are typically small and near input fields
            if (img.width > 50 && img.width < 400 && img.height > 20 && img.height < 100) {
                return img;
            }
        }
        
        // Method 4: Fallback to known IDs (these can change)
        const knownIds = ['j_id_5s', 'j_id_76', 'j_id_75', 'j_id_74'];
        for (const id of knownIds) {
            const img = document.getElementById(id);
            if (img && img.tagName === 'IMG') return img;
        }
        
        return null;
    }

    // Find back button dynamically
    function findBackButton() {
        // Look for button with "Back" text
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
            if (btn.textContent.includes('Back')) {
                return btn;
            }
        }
        // Fallback to known IDs
        const knownIds = ['j_id_63', 'j_id_62'];
        for (const id of knownIds) {
            const btn = document.getElementById(id);
            if (btn) return btn;
        }
        return null;
    }

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

        // Get the captcha image dynamically
        const image = findCaptchaImage();
        const textbox = document.getElementById(CAPTCHA_INPUT_ID);
        const button = document.getElementById(PROCEED_BTN_ID);
        
        if (!image || !textbox || !button) {
            console.log("Captcha elements not found, skipping. Image:", !!image, "Input:", !!textbox, "Button:", !!button);
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
        const backBtn = findBackButton();
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

    console.log('Anti-cheat bypass script v4.0 loaded successfully');
    console.log('Settings:', SETTINGS);

    // ============================================
    // 10. AI SOLUTION GENERATOR
    // Uses Gemini or OpenAI to generate code solutions
    // ============================================
    
    const getSelectedLanguage = () => {
        const langSelect = document.getElementById('langs_input');
        if (!langSelect) return 'C';
        
        const selectedOption = langSelect.options[langSelect.selectedIndex];
        if (!selectedOption) return 'C';
        
        const text = selectedOption.text || selectedOption.textContent;
        if (text.includes('Java')) return 'Java';
        if (text.includes('Python')) return 'Python';
        if (text.includes('CPP23')) return 'C++23';
        if (text.includes('CPP')) return 'C++';
        return 'C';
    };

    const getProblemDescription = () => {
        const isTutorPage = window.location.href.includes('tutorprogram');
        
        // Find the problem description card
        const cards = document.querySelectorAll('.ui-card-content');
        for (const card of cards) {
            const ribbon = card.querySelector('.ribbon');
            if (ribbon) {
                // This is the problem card
                let problemTitle = '';
                let description = '';
                let tutorialHint = '';
                let preCode = '';
                let postCode = '';
                
                // Get the problem title (first .ui.label that's not ribbon/circular/image)
                const labels = card.querySelectorAll('.ui.label');
                for (const label of labels) {
                    if (!label.classList.contains('ribbon') && 
                        !label.classList.contains('circular') && 
                        !label.classList.contains('image') &&
                        !label.textContent.includes('Max Execution') &&
                        !label.textContent.includes('ProgramID')) {
                        problemTitle = label.textContent.trim();
                        break;
                    }
                }
                
                // For tutor pages, get the tutorial highlight (explanation)
                if (isTutorPage) {
                    const tutorHighlight = card.querySelector('.tutorhighlight');
                    if (tutorHighlight) {
                        tutorialHint = tutorHighlight.textContent.trim();
                    }
                    
                    // Get pre-code and post-code from the code editor panel
                    const preCodes = document.querySelectorAll('#codeeditorpanel pre, .ui-outputpanel pre');
                    preCodes.forEach((pre, index) => {
                        const text = pre.textContent.trim();
                        // Skip empty or very short snippets
                        if (text.length > 5) {
                            if (index === 0 || pre.closest('#j_id_7a, [id*="_7a"]')) {
                                preCode = text;
                            } else if (pre.closest('#j_id_7g, [id*="_7g"]')) {
                                postCode = text;
                            }
                        }
                    });
                    
                    // Alternative: find pre/post code by position in card
                    if (!preCode || !postCode) {
                        const allPres = card.querySelectorAll('pre');
                        if (allPres.length >= 1 && !preCode) preCode = allPres[0].textContent.trim();
                        if (allPres.length >= 2 && !postCode) postCode = allPres[1].textContent.trim();
                    }
                }
                
                // Get the problem description text
                const allText = card.textContent;
                const labelMatch = allText.indexOf(problemTitle);
                if (labelMatch !== -1) {
                    const afterTitle = allText.substring(labelMatch + problemTitle.length);
                    const maxExecIdx = afterTitle.indexOf('Max Execution');
                    description = maxExecIdx !== -1 ? afterTitle.substring(0, maxExecIdx) : afterTitle;
                }
                
                // Also get paragraphs for cleaner description
                const paragraphs = card.querySelectorAll('p');
                let pText = '';
                paragraphs.forEach(p => {
                    const txt = p.textContent.trim();
                    if (txt && !txt.includes('Max Execution')) {
                        pText += txt + '\n';
                    }
                });
                if (pText) {
                    description = pText.trim();
                }
                
                // Build full context for AI
                let fullDescription = description;
                if (isTutorPage) {
                    fullDescription = '';
                    if (tutorialHint) {
                        fullDescription += `Tutorial Hint: ${tutorialHint}\n\n`;
                    }
                    fullDescription += `Task: ${description}\n`;
                    if (preCode) {
                        fullDescription += `\nPre-written code (DO NOT include this, it's already provided):\n\`\`\`\n${preCode}\n\`\`\`\n`;
                    }
                    if (postCode) {
                        fullDescription += `\nPost-code that will run after your solution (DO NOT include this):\n\`\`\`\n${postCode}\n\`\`\`\n`;
                    }
                    fullDescription += `\nIMPORTANT: Write ONLY the middle part of the code. The pre-code and post-code are already provided by the system.`;
                }
                
                return {
                    title: problemTitle,
                    description: fullDescription.trim(),
                    isTutor: isTutorPage,
                    preCode: preCode,
                    postCode: postCode
                };
            }
        }
        return { title: '', description: '', isTutor: false, preCode: '', postCode: '' };
    };

    const generateWithGemini = async (prompt) => {
        const apiKey = SETTINGS.geminiApiKey;
        if (!apiKey) {
            throw new Error('Gemini API key not configured. Please add it in settings.');
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Gemini API request failed');
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    };

    const generateWithOpenAI = async (prompt) => {
        const apiKey = SETTINGS.openaiApiKey;
        if (!apiKey) {
            throw new Error('OpenAI API key not configured. Please add it in settings.');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.2,
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'OpenAI API request failed');
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    };

    const generateWithOpenRouter = async (prompt) => {
        const apiKey = SETTINGS.openrouterApiKey;
        if (!apiKey) {
            throw new Error('OpenRouter API key not configured. Please add it in settings.');
        }

        const model = SETTINGS.openrouterModel || 'google/gemini-2.0-flash-001';

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': window.location.href,
                'X-Title': 'SkillRack AI Solver'
            },
            body: JSON.stringify({
                model: model,
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.2,
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `OpenRouter API request failed (${model})`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    };

    const extractCode = (response, language) => {
        // Try to extract code from markdown code blocks
        const codeBlockRegex = /```(?:\w+)?\s*([\s\S]*?)```/g;
        const matches = [...response.matchAll(codeBlockRegex)];
        
        if (matches.length > 0) {
            return matches[0][1].trim();
        }
        
        // If no code blocks, return the whole response (might be plain code)
        return response.trim();
    };

    const generateAISolution = async () => {
        if (!SETTINGS.enableAISolver) return;
        
        const language = getSelectedLanguage();
        const problem = getProblemDescription();
        
        if (!problem.title && !problem.description) {
            alert('Could not find problem description on this page.');
            return;
        }

        // Build prompt based on page type
        let prompt;
        if (problem.isTutor) {
            prompt = `You are an expert ${language} programmer. Complete the MIDDLE PORTION of the code for this problem.

Problem: ${problem.title}
${problem.description}

CRITICAL REQUIREMENTS:
- Write ONLY the missing middle part of the code
- Do NOT include the pre-code or post-code sections (they are already provided)
- Do NOT include imports, class declarations, or main function boilerplate if the pre-code already has them
- The code you write will be inserted between the pre-code and post-code
- Make sure variables from pre-code are used and variables needed by post-code are created
- Write clean, minimal code that solves the problem

Respond with ONLY the middle code portion, wrapped in a code block.`;
        } else {
            prompt = `You are an expert competitive programmer. Write a complete, working solution for this problem in ${language}.

Problem: ${problem.title}
${problem.description}

Requirements:
- Write ONLY the code, no explanations
- The code must be complete and ready to compile/run
- Use standard input/output as shown in the examples
- Follow ${language} best practices
- Keep the code simple and efficient
- For Java, use class name "Hello" (required by SkillRack)
- Include all necessary imports/headers

Respond with ONLY the code, wrapped in a code block.`;
        }

        // Show loading indicator
        const aiBtn = document.getElementById('ai-solution-btn');
        if (aiBtn) {
            aiBtn.disabled = true;
            aiBtn.innerHTML = '⏳ Generating...';
            aiBtn.style.opacity = '0.7';
        }

        try {
            let response;
            if (SETTINGS.aiProvider === 'gemini') {
                response = await generateWithGemini(prompt);
            } else if (SETTINGS.aiProvider === 'openrouter') {
                response = await generateWithOpenRouter(prompt);
            } else {
                response = await generateWithOpenAI(prompt);
            }

            const code = extractCode(response, language);
            
            if (code && window.txtCode) {
                // Insert the code into ACE editor
                window.txtCode.getSession().setValue(code);
                
                // Sync with hidden textarea
                const $ = window.jQuery || window.$;
                if ($ && $("#txtCode").length) {
                    $("#txtCode").val(code);
                }
                
                console.log('AI solution inserted successfully');
            } else {
                alert('Failed to generate solution. Please try again.');
            }
        } catch (error) {
            console.error('AI generation error:', error);
            alert('Error: ' + error.message);
        } finally {
            // Reset button
            if (aiBtn) {
                aiBtn.disabled = false;
                aiBtn.innerHTML = '🤖 AI Solution';
                aiBtn.style.opacity = '1';
            }
        }
    };

    // Add AI Solution button to the page
    const addAISolutionButton = () => {
        if (!SETTINGS.enableAISolver) return;
        
        // Find the button group (Save/Run buttons)
        const btnTables = document.querySelectorAll('.padtbl');
        let targetRow = null;
        
        for (const table of btnTables) {
            const saveBtn = table.querySelector('button[id$="_bf"], button span');
            if (saveBtn && (saveBtn.textContent === 'Save' || saveBtn.querySelector?.('span')?.textContent === 'Save')) {
                targetRow = table.querySelector('tr');
                break;
            }
        }
        
        // Alternative: find by button text
        if (!targetRow) {
            const allButtons = document.querySelectorAll('button');
            for (const btn of allButtons) {
                if (btn.textContent.trim() === 'Save') {
                    targetRow = btn.closest('tr');
                    break;
                }
            }
        }

        if (targetRow && !document.getElementById('ai-solution-btn')) {
            const td = document.createElement('td');
            const aiBtn = document.createElement('button');
            aiBtn.id = 'ai-solution-btn';
            aiBtn.type = 'button';
            aiBtn.innerHTML = '🤖 AI Solution';
            aiBtn.className = 'ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only ui-button-outlined';
            aiBtn.style.cssText = `
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                color: white !important;
                border: none !important;
                padding: 8px 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
            `;
            aiBtn.onmouseover = () => {
                aiBtn.style.transform = 'scale(1.05)';
                aiBtn.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
            };
            aiBtn.onmouseout = () => {
                aiBtn.style.transform = 'scale(1)';
                aiBtn.style.boxShadow = 'none';
            };
            aiBtn.onclick = generateAISolution;
            
            td.appendChild(aiBtn);
            targetRow.appendChild(td);
            
            console.log('AI Solution button added');
        }
    };

    // Initialize AI button when page is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(addAISolutionButton, 1000);
            setTimeout(addAISolutionButton, 3000);
        });
    } else {
        setTimeout(addAISolutionButton, 1000);
        setTimeout(addAISolutionButton, 3000);
    }

    // Also watch for dynamic content changes
    const aiObserver = new MutationObserver((mutations) => {
        if (!document.getElementById('ai-solution-btn')) {
            setTimeout(addAISolutionButton, 500);
        }
    });
    
    if (document.body) {
        aiObserver.observe(document.body, { childList: true, subtree: true });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            aiObserver.observe(document.body, { childList: true, subtree: true });
        });
    }
})();

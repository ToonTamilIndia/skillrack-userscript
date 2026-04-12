// ==UserScript==
// @name         Anti-Cheat Bypass
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Bypass tab switching, copy/paste restrictions, full-screen enforcement, auto-solve captcha, and AI-powered solution generator
// @author       ToonTamilIndia (Captcha solver by adithyagenie)
// @match        https://*.skillrack.com/*
// @match        https://skillrack.com/*
// @require      https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js
// @grant        none
// @run-at       document-start
// @downloadURL https://raw.githubusercontent.com/ToonTamilIndia/skillrack-userscript/refs/heads/main/userscript.user.js
// @updateURL https://raw.githubusercontent.com/ToonTamilIndia/skillrack-userscript/refs/heads/main/userscript.user.js
// ==/UserScript==

(function () {
    'use strict';

    // ============================================
    // SCRIPT VERSION & REMOTE URLS
    // ============================================
    const SCRIPT_VERSION = '5.0';
    const REMOTE_SCRIPT_URL = 'https://raw.githubusercontent.com/ToonTamilIndia/skillrack-userscript/refs/heads/main/userscript.user.js';
    const KILL_SWITCH_URL = 'https://raw.githubusercontent.com/ToonTamilIndia/skillrack-userscript/refs/heads/main/kill.txt';
    const DISCLAIMER_ACCEPTED_KEY = 'skillrack_bypass_disclaimer_accepted';
    const SCRIPT_DISABLED_KEY = 'skillrack_bypass_disabled_by_killswitch';

    // ============================================
    // UTILITY: Compare version strings (e.g., "4.5" vs "4.6")
    // ============================================
    const compareVersions = (local, remote) => {
        const localParts = local.split('.').map(Number);
        const remoteParts = remote.split('.').map(Number);

        for (let i = 0; i < Math.max(localParts.length, remoteParts.length); i++) {
            const l = localParts[i] || 0;
            const r = remoteParts[i] || 0;
            if (r > l) return -1; // Remote is newer
            if (l > r) return 1;  // Local is newer
        }
        return 0; // Equal
    };

    // ============================================
    // KILL SWITCH CHECK
    // ============================================
    const checkKillSwitch = async () => {
        try {
            const response = await fetch(KILL_SWITCH_URL + '?t=' + Date.now(), {
                cache: 'no-store'
            });
            if (!response.ok) {
                console.log('[SkillRack Bypass] Kill switch check failed, allowing script to run');
                return true; // Allow if can't fetch
            }
            const text = (await response.text()).trim().toLowerCase();
            if (text === 'false') {
                console.log('[SkillRack Bypass] Kill switch activated - script disabled');
                localStorage.setItem(SCRIPT_DISABLED_KEY, 'true');
                return false;
            }
            localStorage.removeItem(SCRIPT_DISABLED_KEY);
            return true;
        } catch (e) {
            console.log('[SkillRack Bypass] Kill switch check error:', e);
            return true; // Allow if error
        }
    };

    // ============================================
    // VERSION CHECK
    // ============================================
    const checkForUpdate = async () => {
        try {
            const response = await fetch(REMOTE_SCRIPT_URL + '?t=' + Date.now(), {
                cache: 'no-store'
            });
            if (!response.ok) return null;

            const scriptText = await response.text();
            // Extract version from @version line
            const versionMatch = scriptText.match(/@version\s+(\d+\.\d+(?:\.\d+)?)/);
            if (versionMatch) {
                return versionMatch[1];
            }
        } catch (e) {
            console.log('[SkillRack Bypass] Version check error:', e);
        }
        return null;
    };

    // ============================================
    // SHOW MANDATORY UPDATE DIALOG
    // ============================================
    const showUpdateDialog = (remoteVersion) => {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.id = 'bypass-update-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;

            overlay.innerHTML = `
                <div style="
                    background: #1e1e1e;
                    border-radius: 16px;
                    padding: 32px;
                    max-width: 450px;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                    border: 2px solid #f44336;
                ">
                    <div style="margin-bottom: 16px;">
                        <svg viewBox="0 0 24 24" width="48" height="48" fill="#f44336">
                            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"></path>
                        </svg>
                    </div>
                    <h2 style="color: #f44336; margin: 0 0 16px 0; font-size: 24px;">Update Required</h2>
                    <p style="color: #fff; margin: 0 0 8px 0; font-size: 14px;">
                        A new version of SkillRack Bypass is available!
                    </p>
                    <p style="color: #888; margin: 0 0 24px 0; font-size: 13px;">
                        Your version: <span style="color: #ff9800;">${SCRIPT_VERSION}</span><br>
                        Latest version: <span style="color: #4CAF50;">${remoteVersion}</span>
                    </p>
                    <p style="color: #ff9800; margin: 0 0 24px 0; font-size: 12px;">
                        You must update to continue using this script.
                    </p>
                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button id="bypass-update-btn" style="
                            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                            color: white;
                            border: none;
                            padding: 12px 32px;
                            border-radius: 8px;
                            font-size: 14px;
                            font-weight: bold;
                            cursor: pointer;
                            transition: transform 0.2s;
                        ">Update Now</button>
                        <button id="bypass-update-close" style="
                            background: #333;
                            color: #888;
                            border: 1px solid #444;
                            padding: 12px 24px;
                            border-radius: 8px;
                            font-size: 14px;
                            cursor: pointer;
                        ">Close (Disable Script)</button>
                    </div>
                </div>
            `;

            const addToBody = () => {
                document.body.appendChild(overlay);

                document.getElementById('bypass-update-btn').addEventListener('click', () => {
                    window.open(REMOTE_SCRIPT_URL, '_blank');
                    // Keep dialog open so they can update
                });

                document.getElementById('bypass-update-close').addEventListener('click', () => {
                    overlay.remove();
                    resolve(false); // User chose not to update
                });
            };

            if (document.body) {
                addToBody();
            } else {
                document.addEventListener('DOMContentLoaded', addToBody);
            }
        });
    };

    // ============================================
    // SHOW KILL SWITCH DISABLED MESSAGE
    // ============================================
    const showKillSwitchMessage = () => {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        overlay.innerHTML = `
            <div style="
                background: #1e1e1e;
                border-radius: 16px;
                padding: 32px;
                max-width: 400px;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                border: 2px solid #f44336;
            ">
                <div style="margin-bottom: 16px;">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="#f44336">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm5.31-3.1L6.69 6.29C8.04 5.23 9.74 4.6 11.4 4.6c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"></path>
                    </svg>
                </div>
                <h2 style="color: #f44336; margin: 0 0 16px 0; font-size: 24px;">Script Disabled</h2>
                <p style="color: #fff; margin: 0 0 16px 0; font-size: 14px;">
                    This script has been temporarily disabled by the author.
                </p>
                <p style="color: #888; margin: 0; font-size: 12px;">
                    Please check back later or visit the GitHub repository for updates.
                </p>
            </div>
        `;

        if (document.body) {
            document.body.appendChild(overlay);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(overlay);
            });
        }
    };

    // ============================================
    // SHOW FIRST-TIME DISCLAIMER
    // ============================================
    const showDisclaimer = () => {
        return new Promise((resolve) => {
            // Check if already accepted
            if (localStorage.getItem(DISCLAIMER_ACCEPTED_KEY) === 'true') {
                resolve(true);
                return;
            }

            const overlay = document.createElement('div');
            overlay.id = 'bypass-disclaimer-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;

            overlay.innerHTML = `
                <div style="
                    background: #1e1e1e;
                    border-radius: 16px;
                    padding: 32px;
                    max-width: 500px;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                    border: 2px solid #ff9800;
                ">
                    <div style="margin-bottom: 16px;">
                        <svg viewBox="0 0 24 24" width="48" height="48" fill="#ff9800">
                            <path d="M12 2L1 21h22L12 2zm0 3.45L20.14 19H3.86L12 5.45zM13 17h-2v-2h2v2zm0-4h-2v-4h2v4z"></path>
                        </svg>
                    </div>
                    <h2 style="color: #ff9800; margin: 0 0 16px 0; font-size: 22px;">Disclaimer & Terms of Use</h2>
                    <div style="
                        background: #2d2d2d;
                        border-radius: 8px;
                        padding: 16px;
                        margin-bottom: 20px;
                        text-align: left;
                        max-height: 200px;
                        overflow-y: auto;
                        font-size: 12px;
                        color: #ccc;
                        line-height: 1.6;
                    ">
                        <p style="margin: 0 0 12px 0;"><strong style="color: #f44336;">IMPORTANT - READ CAREFULLY:</strong></p>
                        <ul style="margin: 0; padding-left: 20px;">
                            <li style="margin-bottom: 8px;">This script is provided <strong>"AS IS"</strong> without any warranty of any kind.</li>
                            <li style="margin-bottom: 8px;">The author(s) are <strong>NOT RESPONSIBLE</strong> for any consequences arising from the use of this script, including but not limited to:
                                <ul style="margin-top: 4px; padding-left: 16px;">
                                    <li>Academic penalties or disciplinary actions</li>
                                    <li>Account suspension or termination</li>
                                    <li>Legal consequences</li>
                                    <li>Any damage to your academic record</li>
                                </ul>
                            </li>
                            <li style="margin-bottom: 8px;">By using this script, you acknowledge that bypassing anti-cheat measures may violate your institution's academic integrity policies.</li>
                            <li style="margin-bottom: 8px;">You are <strong>solely responsible</strong> for your actions and any consequences that may result.</li>
                            <li style="margin-bottom: 8px;">This script is for <strong>educational purposes only</strong>.</li>
                        </ul>
                    </div>
                    <p style="color: #888; margin: 0 0 20px 0; font-size: 11px;">
                        By clicking "I Accept", you confirm that you have read, understood, and agree to these terms.
                    </p>
                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button id="bypass-accept-btn" style="
                            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                            color: white;
                            border: none;
                            padding: 12px 32px;
                            border-radius: 8px;
                            font-size: 14px;
                            font-weight: bold;
                            cursor: pointer;
                        ">I Accept & Understand</button>
                        <button id="bypass-decline-btn" style="
                            background: #333;
                            color: #888;
                            border: 1px solid #444;
                            padding: 12px 24px;
                            border-radius: 8px;
                            font-size: 14px;
                            cursor: pointer;
                        ">Decline</button>
                    </div>
                </div>
            `;

            const addToBody = () => {
                document.body.appendChild(overlay);

                // Use setTimeout to ensure elements are fully rendered (Firefox compatibility)
                setTimeout(() => {
                    const acceptBtn = document.getElementById('bypass-accept-btn');
                    const declineBtn = document.getElementById('bypass-decline-btn');

                    if (acceptBtn) {
                        acceptBtn.addEventListener('click', () => {
                            localStorage.setItem(DISCLAIMER_ACCEPTED_KEY, 'true');
                            overlay.remove();
                            resolve(true);
                        });
                    }

                    if (declineBtn) {
                        declineBtn.addEventListener('click', () => {
                            overlay.remove();
                            resolve(false);
                        });
                    }
                }, 0);
            };

            if (document.body) {
                addToBody();
            } else {
                document.addEventListener('DOMContentLoaded', addToBody);
            }
        });
    };

    // ============================================
    // INITIALIZATION CHECK (Kill Switch, Update, Disclaimer)
    // ============================================
    const initializeScript = async () => {
        // Step 1: Check kill switch
        const killSwitchOk = await checkKillSwitch();
        if (!killSwitchOk) {
            showKillSwitchMessage();
            return false;
        }

        // Step 2: Check for updates
        const remoteVersion = await checkForUpdate();
        if (remoteVersion && compareVersions(SCRIPT_VERSION, remoteVersion) < 0) {
            const userAcceptedUpdate = await showUpdateDialog(remoteVersion);
            if (!userAcceptedUpdate) {
                console.log('[SkillRack Bypass] User declined update - script disabled');
                return false;
            }
        }

        // Step 3: Show disclaimer (first time only)
        const disclaimerAccepted = await showDisclaimer();
        if (!disclaimerAccepted) {
            console.log('[SkillRack Bypass] User declined disclaimer - script disabled');
            return false;
        }

        return true;
    };

    // Run initialization and only continue if all checks pass
    let scriptEnabled = false;
    let initCallbacks = [];

    // Register a callback to run when script is enabled
    const onScriptEnabled = (callback) => {
        if (scriptEnabled) {
            callback();
        } else {
            initCallbacks.push(callback);
        }
    };

    // We need to run async initialization but continue with the rest of the script
    // For features that run at document-start, we'll check scriptEnabled flag
    (async () => {
        scriptEnabled = await initializeScript();
        if (scriptEnabled) {
            console.log('[SkillRack Bypass] All checks passed - script enabled');
            // Run all registered callbacks
            initCallbacks.forEach(cb => {
                try { cb(); } catch (e) { console.error('[SkillRack Bypass] Callback error:', e); }
            });
            initCallbacks = [];
        }
    })();

    // ============================================
    // SETTINGS - Toggle features on/off
    // ============================================
    const DEFAULT_SETTINGS = {
        // Anti-cheat bypasses
        bypassTabDetection: true,
        bypassCopyPaste: true,
        bypassFullscreen: true,
        bypassMultiMonitor: true,
        blockTelemetry: true,
        enableDragDrop: true,
        enableTextSelection: true,
        enableContextMenu: true,

        // Captcha solver (credit: adithyagenie)
        enableCaptchaSolver: true,
        captchaUsername: "",

        // AI Solution Generator
        enableAISolver: false,
        includePrePostCode: false,
        aiTemperature: 0,
        aiSystemPrompt: "",
        aiProvider: "gemini",
        geminiApiKey: "",
        geminiModel: "gemini-2.5-flash",
        openaiApiKey: "",
        openaiModel: "gpt-4o-mini",
        openrouterApiKey: "",
        openrouterModel: "google/gemini-2.5-flash-001",

        // ========== G4F SETTINGS (NEW) ==========
        g4fApiKey: "",
        g4fModel: "auto",
        // ========================================

        // ========== DUCKDUCKGO SETTINGS (NEW) ==========
        duckduckgoModel: "gpt-4o-mini",
        duckduckgoApiUrl: "https://duckduckgo-api.toontamilindia.workers.dev",
        duckduckgoApiKey: "",
        duckduckgoIncludeReasoning: false,
        duckduckgoReasoningEffort: "low",
        // ================================================

        // ========== YUPPBRIDGE SETTINGS (NEW) ==========
        yuppbridgeApiUrl: "",
        yuppbridgeApiKey: "",
        yuppbridgeModel: "gpt-4o",
        // ================================================

        // ========== AUTO SOLVER SETTINGS ==========
        enableAutoSolver: false,
        autoSolverMaxRetries: 1,
        autoSolverDelay: 500,
        // ==========================================
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
    // GEMINI PROVIDER MODULE (DYNAMIC MODEL LOADING)
    // ============================================

    const GeminiProvider = (function () {
        'use strict';

        const CONFIG = {
            API_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
            CACHE_KEY: 'gemini_models_cache',
            CACHE_TTL: 6 * 60 * 60 * 1000, // 6 hours cache
            DEFAULT_MODEL: 'gemini-2.5-flash'
        };

        function getApiKey() {
            return SETTINGS.geminiApiKey || null;
        }

        function normalizeModel(rawModel) {
            const name = rawModel.name || '';
            const id = name.replace('models/', '');
            const displayName = rawModel.displayName || id;
            const description = rawModel.description || '';

            // Categorize models
            let category = 'Other';
            if (id.includes('gemini-2')) category = 'Gemini 2.x';
            else if (id.includes('gemini-1.5')) category = 'Gemini 1.5';
            else if (id.includes('gemini-1.0') || id.includes('gemini-pro')) category = 'Gemini 1.0';
            else if (id.includes('text-embedding') || id.includes('embedding')) category = 'Embeddings';
            else if (id.includes('aqa')) category = 'AQA';

            return {
                id: id,
                name: displayName,
                description: description,
                category: category,
                supportedMethods: rawModel.supportedGenerationMethods || [],
                inputTokenLimit: rawModel.inputTokenLimit || 0,
                outputTokenLimit: rawModel.outputTokenLimit || 0
            };
        }

        function getCachedModels() {
            try {
                const cached = localStorage.getItem(CONFIG.CACHE_KEY);
                if (cached) {
                    const { models, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < CONFIG.CACHE_TTL) {
                        return models;
                    }
                }
            } catch (e) {
                console.log('[Gemini] Cache read error:', e);
            }
            return null;
        }

        function setCachedModels(models) {
            try {
                localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
                    models: models,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.log('[Gemini] Cache write error:', e);
            }
        }

        function clearCache() {
            localStorage.removeItem(CONFIG.CACHE_KEY);
        }

        async function fetchModels(forceRefresh = false) {
            const apiKey = getApiKey();
            if (!apiKey) {
                console.log('[Gemini] No API key, using fallback models');
                return getFallbackModels();
            }

            if (!forceRefresh) {
                const cached = getCachedModels();
                if (cached) {
                    console.log('[Gemini] Using cached models:', cached.length);
                    return cached;
                }
            }

            try {
                const response = await fetch(`${CONFIG.API_URL}?key=${apiKey}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                const rawModels = data.models || [];

                // Filter to only generative models (exclude embeddings, etc.)
                const models = rawModels
                    .filter(m => {
                        const methods = m.supportedGenerationMethods || [];
                        return methods.includes('generateContent');
                    })
                    .map(normalizeModel)
                    .sort((a, b) => {
                        // Sort by category priority, then by name
                        const categoryOrder = ['Gemini 2.x', 'Gemini 1.5', 'Gemini 1.0', 'Other'];
                        const aIdx = categoryOrder.indexOf(a.category);
                        const bIdx = categoryOrder.indexOf(b.category);
                        if (aIdx !== bIdx) return aIdx - bIdx;
                        return a.name.localeCompare(b.name);
                    });

                console.log('[Gemini] Fetched models:', models.length);
                setCachedModels(models);
                return models;
            } catch (error) {
                console.error('[Gemini] Fetch error:', error);
                return getFallbackModels();
            }
        }

        function getFallbackModels() {
            return [
                { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', category: 'Gemini 2.x', description: 'Fast and efficient' },
                { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', category: 'Gemini 2.x', description: 'Most capable model' },
                { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', category: 'Gemini 2.x', description: 'Previous generation flash' },
                { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', category: 'Gemini 1.5', description: 'Fast multimodal model' },
                { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', category: 'Gemini 1.5', description: 'Advanced reasoning' },
            ];
        }

        function filterModels(models, query) {
            if (!query) return models;
            const lowerQuery = query.toLowerCase();
            return models.filter(m =>
                m.id.toLowerCase().includes(lowerQuery) ||
                m.name.toLowerCase().includes(lowerQuery) ||
                m.category.toLowerCase().includes(lowerQuery)
            );
        }

        function groupModels(models) {
            const groups = {};
            models.forEach(model => {
                if (!groups[model.category]) groups[model.category] = [];
                groups[model.category].push(model);
            });
            return groups;
        }

        return {
            CONFIG,
            fetchModels,
            filterModels,
            groupModels,
            clearCache,
            normalizeModel
        };
    })();

    // ============================================
    // OPENAI PROVIDER MODULE (DYNAMIC MODEL LOADING)
    // ============================================

    const OpenAIProvider = (function () {
        'use strict';

        const CONFIG = {
            API_URL: 'https://api.openai.com/v1/models',
            CACHE_KEY: 'openai_models_cache',
            CACHE_TTL: 6 * 60 * 60 * 1000, // 6 hours cache
            DEFAULT_MODEL: 'gpt-4o-mini'
        };

        function getApiKey() {
            return SETTINGS.openaiApiKey || null;
        }

        function normalizeModel(rawModel) {
            const id = rawModel.id || '';

            // Categorize models
            let category = 'Other';
            let displayName = id;

            if (id.startsWith('gpt-4o')) {
                category = 'GPT-4o';
                displayName = id.replace('gpt-4o', 'GPT-4o').replace(/-/g, ' ');
            } else if (id.startsWith('gpt-4')) {
                category = 'GPT-4';
                displayName = id.replace('gpt-4', 'GPT-4').replace(/-/g, ' ');
            } else if (id.startsWith('gpt-3.5')) {
                category = 'GPT-3.5';
                displayName = id.replace('gpt-3.5', 'GPT-3.5').replace(/-/g, ' ');
            } else if (id.startsWith('o1') || id.startsWith('o3') || id.startsWith('o4')) {
                category = 'Reasoning (o-series)';
                displayName = id.toUpperCase().replace(/-/g, ' ');
            } else if (id.includes('davinci') || id.includes('curie') || id.includes('babbage') || id.includes('ada')) {
                category = 'Legacy';
            }

            return {
                id: id,
                name: displayName,
                category: category,
                ownedBy: rawModel.owned_by || 'openai'
            };
        }

        function getCachedModels() {
            try {
                const cached = localStorage.getItem(CONFIG.CACHE_KEY);
                if (cached) {
                    const { models, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < CONFIG.CACHE_TTL) {
                        return models;
                    }
                }
            } catch (e) {
                console.log('[OpenAI] Cache read error:', e);
            }
            return null;
        }

        function setCachedModels(models) {
            try {
                localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
                    models: models,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.log('[OpenAI] Cache write error:', e);
            }
        }

        function clearCache() {
            localStorage.removeItem(CONFIG.CACHE_KEY);
        }

        async function fetchModels(forceRefresh = false) {
            const apiKey = getApiKey();
            if (!apiKey) {
                console.log('[OpenAI] No API key, using fallback models');
                return getFallbackModels();
            }

            if (!forceRefresh) {
                const cached = getCachedModels();
                if (cached) {
                    console.log('[OpenAI] Using cached models:', cached.length);
                    return cached;
                }
            }

            try {
                const response = await fetch(CONFIG.API_URL, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                const rawModels = data.data || [];

                // Filter to only chat completion models
                const chatModelPatterns = ['gpt-4', 'gpt-3.5', 'o1', 'o3', 'o4', 'chatgpt'];
                const excludePatterns = ['instruct', 'vision', 'audio', 'realtime', 'tts', 'whisper', 'dall-e', 'embedding', 'moderation'];

                const models = rawModels
                    .filter(m => {
                        const id = m.id.toLowerCase();
                        const isChat = chatModelPatterns.some(p => id.includes(p));
                        const isExcluded = excludePatterns.some(p => id.includes(p));
                        return isChat && !isExcluded;
                    })
                    .map(normalizeModel)
                    .sort((a, b) => {
                        // Sort by category priority, then by name
                        const categoryOrder = ['GPT-4o', 'Reasoning (o-series)', 'GPT-4', 'GPT-3.5', 'Legacy', 'Other'];
                        const aIdx = categoryOrder.indexOf(a.category);
                        const bIdx = categoryOrder.indexOf(b.category);
                        if (aIdx !== bIdx) return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
                        return a.name.localeCompare(b.name);
                    });

                console.log('[OpenAI] Fetched models:', models.length);
                setCachedModels(models);
                return models;
            } catch (error) {
                console.error('[OpenAI] Fetch error:', error);
                return getFallbackModels();
            }
        }

        function getFallbackModels() {
            return [
                { id: 'gpt-4o', name: 'GPT-4o', category: 'GPT-4o', ownedBy: 'openai' },
                { id: 'gpt-4o-mini', name: 'GPT-4o Mini', category: 'GPT-4o', ownedBy: 'openai' },
                { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', category: 'GPT-4', ownedBy: 'openai' },
                { id: 'gpt-4', name: 'GPT-4', category: 'GPT-4', ownedBy: 'openai' },
                { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', category: 'GPT-3.5', ownedBy: 'openai' },
                { id: 'o1', name: 'O1', category: 'Reasoning (o-series)', ownedBy: 'openai' },
                { id: 'o1-mini', name: 'O1 Mini', category: 'Reasoning (o-series)', ownedBy: 'openai' },
                { id: 'o3-mini', name: 'O3 Mini', category: 'Reasoning (o-series)', ownedBy: 'openai' },
            ];
        }

        function filterModels(models, query) {
            if (!query) return models;
            const lowerQuery = query.toLowerCase();
            return models.filter(m =>
                m.id.toLowerCase().includes(lowerQuery) ||
                m.name.toLowerCase().includes(lowerQuery) ||
                m.category.toLowerCase().includes(lowerQuery)
            );
        }

        function groupModels(models) {
            const groups = {};
            models.forEach(model => {
                if (!groups[model.category]) groups[model.category] = [];
                groups[model.category].push(model);
            });
            return groups;
        }

        return {
            CONFIG,
            fetchModels,
            filterModels,
            groupModels,
            clearCache,
            normalizeModel
        };
    })();

    // ============================================
    // OPENROUTER PROVIDER MODULE (DYNAMIC MODEL LOADING)
    // ============================================

    const OpenRouterProvider = (function () {
        'use strict';

        const CONFIG = {
            // Use official API endpoint which has proper CORS support
            API_URL: 'https://openrouter.ai/api/v1/models',
            CACHE_KEY: 'openrouter_models_cache',
            CACHE_TTL: 6 * 60 * 60 * 1000, // 6 hours cache
            DEFAULT_MODEL: 'google/gemini-2.0-flash-001'
        };

        // Get API key from settings
        function getApiKey() {
            return SETTINGS.openrouterApiKey || null;
        }

        function normalizeModel(rawModel) {
            // Handle official API response format
            const pricing = rawModel.pricing || {};
            const promptPrice = parseFloat(pricing.prompt || 0);
            const completionPrice = parseFloat(pricing.completion || 0);
            const isFree = promptPrice === 0 && completionPrice === 0;

            // Extract author from model ID (e.g., "google/gemini-2.0-flash" -> "google")
            const idParts = (rawModel.id || '').split('/');
            const author = idParts.length > 1 ? idParts[0] : 'unknown';
            const shortName = idParts.length > 1 ? idParts[idParts.length - 1] : rawModel.id;

            // Determine group based on author
            const groupMap = {
                'google': 'Google',
                'anthropic': 'Anthropic',
                'openai': 'OpenAI',
                'meta-llama': 'Meta',
                'meta': 'Meta',
                'mistralai': 'Mistral',
                'deepseek': 'DeepSeek',
                'qwen': 'Qwen',
                'nvidia': 'NVIDIA',
                'cohere': 'Cohere',
                'perplexity': 'Perplexity',
                'x-ai': 'xAI'
            };
            const group = groupMap[author.toLowerCase()] || 'Other';

            return {
                id: rawModel.id || '',
                name: rawModel.name || shortName || 'Unknown',
                fullName: rawModel.name || rawModel.id || 'Unknown',
                author: author,
                group: group,
                description: rawModel.description || '',
                context_length: rawModel.context_length || null,
                isFree: isFree,
                supportsReasoning: false,
                inputModalities: ['text'],
                outputModalities: ['text']
            };
        }

        function getCachedModels() {
            try {
                const cached = localStorage.getItem(CONFIG.CACHE_KEY);
                if (!cached) return null;

                const { models, timestamp } = JSON.parse(cached);
                const age = Date.now() - timestamp;

                if (age > CONFIG.CACHE_TTL) {
                    localStorage.removeItem(CONFIG.CACHE_KEY);
                    return null;
                }

                return models;
            } catch (error) {
                try { localStorage.removeItem(CONFIG.CACHE_KEY); } catch (e) { }
                return null;
            }
        }

        function setCachedModels(models) {
            try {
                localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
                    models: models,
                    timestamp: Date.now()
                }));
            } catch (error) {
                console.error('[OpenRouter] Cache write error:', error);
            }
        }

        function clearCache() {
            try {
                localStorage.removeItem(CONFIG.CACHE_KEY);
            } catch (error) { }
        }

        async function fetchModels(forceRefresh = false) {
            if (!forceRefresh) {
                const cachedModels = getCachedModels();
                if (cachedModels && cachedModels.length > 0) {
                    console.log('[OpenRouter] Using cached models:', cachedModels.length);
                    return cachedModels;
                }
            }

            const apiKey = getApiKey();
            if (!apiKey) {
                console.log('[OpenRouter] No API key, using fallback models');
                return getFallbackModels();
            }

            console.log('[OpenRouter] Fetching models from API...');
            const response = await fetch(CONFIG.API_URL, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'SkillRack Bypass'
                }
            });

            if (!response.ok) {
                console.warn('[OpenRouter] API request failed, using fallback models');
                return getFallbackModels();
            }

            const rawResponse = await response.json();
            let modelArray = [];

            // API returns { data: [...] }
            if (rawResponse.data && Array.isArray(rawResponse.data)) {
                modelArray = rawResponse.data;
            } else if (Array.isArray(rawResponse)) {
                modelArray = rawResponse;
            }

            // Filter and normalize models
            const normalizedModels = modelArray
                .filter(m => m && m.id)
                .map(m => normalizeModel(m))
                .sort((a, b) => {
                    // Sort: Free first, then by group, then by name
                    if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
                    if (a.group !== b.group) return a.group.localeCompare(b.group);
                    return a.name.localeCompare(b.name);
                });

            console.log('[OpenRouter] Fetched models:', normalizedModels.length);

            if (normalizedModels.length > 0) {
                setCachedModels(normalizedModels);
            }

            return normalizedModels;
        }

        // Fallback models when API is unavailable or no API key
        function getFallbackModels() {
            return [
                { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash Exp', author: 'google', group: 'Google', isFree: true },
                { id: 'google/gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash', author: 'google', group: 'Google', isFree: false },
                { id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro', author: 'google', group: 'Google', isFree: false },
                { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1', author: 'deepseek', group: 'DeepSeek', isFree: true },
                { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', author: 'deepseek', group: 'DeepSeek', isFree: false },
                { id: 'qwen/qwen3-235b-a22b:free', name: 'Qwen3 235B', author: 'qwen', group: 'Qwen', isFree: true },
                { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B', author: 'meta-llama', group: 'Meta', isFree: true },
                { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', author: 'anthropic', group: 'Anthropic', isFree: false },
                { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', author: 'anthropic', group: 'Anthropic', isFree: false },
                { id: 'openai/gpt-4o', name: 'GPT-4o', author: 'openai', group: 'OpenAI', isFree: false },
                { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', author: 'openai', group: 'OpenAI', isFree: false },
                { id: 'openai/o3-mini', name: 'o3-mini', author: 'openai', group: 'OpenAI', isFree: false },
                { id: 'mistralai/mistral-large', name: 'Mistral Large', author: 'mistralai', group: 'Mistral', isFree: false },
                { id: 'mistralai/codestral-latest', name: 'Codestral', author: 'mistralai', group: 'Mistral', isFree: false },
            ].map(m => ({ ...m, fullName: m.name, description: '', context_length: null, supportsReasoning: false, inputModalities: ['text'], outputModalities: ['text'] }));
        }

        function filterModels(models, query) {
            if (!query || typeof query !== 'string' || !Array.isArray(models)) {
                return models || [];
            }

            const lowerQuery = query.toLowerCase().trim();
            if (!lowerQuery) return models;

            return models.filter(model => {
                const id = (model.id || '').toLowerCase();
                const name = (model.name || '').toLowerCase();
                const fullName = (model.fullName || '').toLowerCase();
                const author = (model.author || '').toLowerCase();
                const group = (model.group || '').toLowerCase();
                return id.includes(lowerQuery) ||
                    name.includes(lowerQuery) ||
                    fullName.includes(lowerQuery) ||
                    author.includes(lowerQuery) ||
                    group.includes(lowerQuery);
            });
        }

        function groupModels(models) {
            const groups = {};
            const freeModels = [];

            for (const model of models) {
                if (model.isFree) {
                    freeModels.push(model);
                } else {
                    const group = model.group || 'Other';
                    if (!groups[group]) groups[group] = [];
                    groups[group].push(model);
                }
            }

            return { freeModels, groups };
        }

        return {
            CONFIG,
            fetchModels,
            filterModels,
            groupModels,
            clearCache,
            normalizeModel
        };
    })();

    // ============================================
    // G4F PROVIDER MODULE (NEW)
    // ============================================

    const G4FProvider = (function () {
        'use strict';

        const CONFIG = {
            BASE_URL: 'https://g4f.space',
            CACHE_KEY: 'g4f_models_cache',
            CACHE_TTL: 24 * 60 * 60 * 1000,
            DEFAULT_MODEL: 'auto'
        };

        function getApiKey() {
            return SETTINGS.g4fApiKey || null;
        }

        function normalizeModel(rawModel) {
            const nameParts = (rawModel.id || '').split('/');
            const displayName = nameParts.length > 1
                ? nameParts[nameParts.length - 1]
                : rawModel.id;

            return {
                id: rawModel.id || '',
                name: displayName || rawModel.id || 'Unknown Model',
                owner: rawModel.owned_by || 'unknown',
                context_window: rawModel.context_window || rawModel.max_tokens || null
            };
        }

        function getCachedModels() {
            try {
                const cached = localStorage.getItem(CONFIG.CACHE_KEY);
                if (!cached) return null;

                const { models, timestamp } = JSON.parse(cached);
                const age = Date.now() - timestamp;

                if (age > CONFIG.CACHE_TTL) {
                    localStorage.removeItem(CONFIG.CACHE_KEY);
                    return null;
                }

                return models;
            } catch (error) {
                try { localStorage.removeItem(CONFIG.CACHE_KEY); } catch (e) { }
                return null;
            }
        }

        function setCachedModels(models) {
            try {
                localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
                    models: models,
                    timestamp: Date.now()
                }));
            } catch (error) {
                console.error('[G4F] Cache write error:', error);
            }
        }

        function clearCache() {
            try {
                localStorage.removeItem(CONFIG.CACHE_KEY);
            } catch (error) { }
        }

        async function fetchModels(forceRefresh = false) {
            if (!forceRefresh) {
                const cachedModels = getCachedModels();
                if (cachedModels && cachedModels.length > 0) {
                    return cachedModels;
                }
            }

            const apiKey = getApiKey();
            if (!apiKey) {
                throw new Error('G4F API key not configured. Please add it in settings.');
            }

            const response = await fetch(`${CONFIG.BASE_URL}/v1/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Failed to fetch G4F models: ${response.status}`);
            }

            const rawResponse = await response.json();
            let modelArray;

            if (Array.isArray(rawResponse)) {
                modelArray = rawResponse;
            } else if (rawResponse.data && Array.isArray(rawResponse.data)) {
                modelArray = rawResponse.data;
            } else if (rawResponse.models && Array.isArray(rawResponse.models)) {
                modelArray = rawResponse.models;
            } else {
                modelArray = [];
            }

            const normalizedModels = modelArray
                .filter(m => m && m.id)
                .map(m => normalizeModel(m));

            if (normalizedModels.length > 0) {
                setCachedModels(normalizedModels);
            }

            return normalizedModels;
        }

        function filterModels(models, query) {
            if (!query || typeof query !== 'string' || !Array.isArray(models)) {
                return models || [];
            }

            const lowerQuery = query.toLowerCase().trim();
            if (!lowerQuery) return models;

            return models.filter(model => {
                const id = (model.id || '').toLowerCase();
                const name = (model.name || '').toLowerCase();
                const owner = (model.owner || '').toLowerCase();
                return id.includes(lowerQuery) || name.includes(lowerQuery) || owner.includes(lowerQuery);
            });
        }

        async function generateCompletion(messages, options = {}) {
            const apiKey = getApiKey();
            if (!apiKey) {
                throw new Error('G4F API key not configured. Please add it in settings.');
            }

            if (!Array.isArray(messages) || messages.length === 0) {
                throw new Error('Messages array is required');
            }

            const model = options.model || CONFIG.DEFAULT_MODEL;
            const payload = {
                model: model,
                messages: messages
            };
            payload.temperature = options.temperature ?? SETTINGS.aiTemperature;
            if (typeof options.max_tokens === 'number') payload.max_tokens = options.max_tokens;

            const response = await fetch(`${CONFIG.BASE_URL}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                let errorMessage = `G4F API request failed: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error?.message) errorMessage = errorData.error.message;
                } catch (e) { }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (!content) {
                throw new Error('G4F returned empty response');
            }

            return content;
        }

        return {
            CONFIG,
            fetchModels,
            filterModels,
            clearCache,
            generateCompletion,
            getApiKey,
            normalizeModel
        };
    })();

    // G4F wrapper function (NEW)
    const generateWithG4F = async (prompt) => {
        const model = SETTINGS.g4fModel || 'auto';
        return await G4FProvider.generateCompletion(
            [{ role: 'user', content: prompt }],
            { model: model, temperature: SETTINGS.aiTemperature, max_tokens: 2048 }
        );
    };

    // ============================================
    // DUCKDUCKGO PROVIDER MODULE (Uses Proxy API to avoid CSP)
    // ============================================

    const DuckDuckGoProvider = (function () {
        'use strict';

        const CONFIG = {
            DEFAULT_API_URL: 'https://duckduckgo-api.toontamilindia.workers.dev',
            DEFAULT_MODEL: 'gpt-4o-mini'
        };

        const AVAILABLE_MODELS = [
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', owner: 'OpenAI', desc: 'General-purpose AI' },
            { id: 'gpt-5-mini', name: 'GPT-5 Mini (Beta)', owner: 'OpenAI', desc: 'Reasoning AI' },
            { id: 'gpt-oss-120b', name: 'GPT-OSS 120B', owner: 'OpenAI', desc: 'Open source, Reasoning AI' },
            { id: 'llama-4-scout', name: 'Llama 4 Scout', owner: 'Meta', desc: 'Open source' },
            { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', owner: 'Anthropic', desc: 'General-purpose AI' },
            { id: 'mistral-small-3', name: 'Mistral Small 3', owner: 'Mistral AI', desc: 'Open source' }
        ];
        const REASONING_MODELS = new Set(['gpt-5-mini', 'gpt-oss-120b']);
        const REASONING_EFFORTS = new Set(['low', 'medium', 'high']);

        function getApiUrl() {
            return SETTINGS.duckduckgoApiUrl || CONFIG.DEFAULT_API_URL;
        }

        function getApiKey() {
            return SETTINGS.duckduckgoApiKey || '';
        }

        function supportsReasoningModel(modelId) {
            return REASONING_MODELS.has(modelId);
        }

        function normalizeReasoningEffort(value) {
            const effort = `${value || ''}`.toLowerCase();
            return REASONING_EFFORTS.has(effort) ? effort : 'low';
        }

        async function generateCompletion(messages, options = {}) {
            if (!Array.isArray(messages) || messages.length === 0) {
                throw new Error('Messages array is required');
            }

            const apiUrl = getApiUrl();
            const apiKey = getApiKey();
            const modelName = options.model || SETTINGS.duckduckgoModel || CONFIG.DEFAULT_MODEL;
            const includeReasoning = Boolean(options.includeReasoning ?? SETTINGS.duckduckgoIncludeReasoning);
            const reasoningEffort = normalizeReasoningEffort(options.reasoningEffort || SETTINGS.duckduckgoReasoningEffort);
            const requestReasoning = includeReasoning && supportsReasoningModel(modelName);

            const headers = {
                'Content-Type': 'application/json'
            };

            if (apiKey) {
                headers['X-API-Key'] = apiKey;
            }

            const payload = {
                messages: messages,
                model: modelName
            };
            if (requestReasoning) {
                payload.include_reasoning = true;
                payload.reasoning_effort = reasoningEffort;
            }

            const response = await fetch(`${apiUrl}/chat`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                let errorMessage = `DuckDuckGo AI Proxy request failed: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) { }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            const choice = data.choices?.[0] || {};
            const message = choice.message || {};
            const content = message.content;
            const reasoning = message.reasoning || choice.reasoning || data.reasoning || '';

            if (!content && !(requestReasoning && reasoning)) {
                throw new Error('DuckDuckGo AI Proxy returned empty response');
            }

            if (requestReasoning && reasoning) {
                const reasoningBlock = `[Reasoning]\n${reasoning}`;
                return content ? `${reasoningBlock}\n\n${content}` : reasoningBlock;
            }

            return content;
        }

        function getModels() {
            return AVAILABLE_MODELS;
        }

        return {
            CONFIG,
            getModels,
            generateCompletion,
            getApiUrl
        };
    })();

    // DuckDuckGo wrapper function
    const generateWithDuckDuckGo = async (prompt) => {
        const model = SETTINGS.duckduckgoModel || 'gpt-4o-mini';
        return await DuckDuckGoProvider.generateCompletion(
            [{ role: 'user', content: prompt }],
            {
                model: model,
                includeReasoning: SETTINGS.duckduckgoIncludeReasoning,
                reasoningEffort: SETTINGS.duckduckgoReasoningEffort
            }
        );
    };

    // ============================================
    // YUPPBRIDGE PROVIDER MODULE (200+ Models from Yupp AI)
    // Self-hosted OpenAI-compatible API
    // https://github.com/cloudWaddie/yuppbridge
    // ============================================

    const YuppBridgeProvider = (function () {
        'use strict';

        const CONFIG = {
            CACHE_KEY: 'yuppbridge_models_cache',
            CACHE_TTL: 6 * 60 * 60 * 1000, // 6 hours cache
            DEFAULT_MODEL: 'gpt-4o'
        };

        // Clean up YuppBridge response artifacts (removes <yapp> tags, [Variant] markers, etc.)
        function cleanYuppBridgeResponse(content) {
            if (!content || typeof content !== 'string') return content;

            // Remove [Variant] markers and everything after
            let cleaned = content.replace(/\[Variant\][\s\S]*$/i, '');

            // Remove <yapp> tags and their contents
            cleaned = cleaned.replace(/<yapp[^>]*>[\s\S]*?<\/yapp>/gi, '');

            // Remove any standalone [Variant] that might be in the middle
            cleaned = cleaned.replace(/\[Variant\]/gi, '');

            // Trim whitespace
            cleaned = cleaned.trim();

            // If we stripped everything, return original content with basic cleanup
            if (!cleaned) {
                console.warn('[YuppBridge] Response was completely stripped, using original');
                return content.replace(/<yapp[^>]*>[\s\S]*?<\/yapp>/gi, '').trim();
            }

            return cleaned;
        }

        function getApiUrl() {
            return SETTINGS.yuppbridgeApiUrl || '';
        }

        function getApiKey() {
            return SETTINGS.yuppbridgeApiKey || '';
        }

        function normalizeModel(rawModel) {
            const id = rawModel.id || '';
            const name = rawModel.name || id;
            const ownedBy = rawModel.owned_by || 'unknown';

            // Categorize models based on ID patterns
            let category = 'Other';
            const idLower = id.toLowerCase();

            if (idLower.includes('gpt-4o')) category = 'GPT-4o';
            else if (idLower.includes('gpt-4')) category = 'GPT-4';
            else if (idLower.includes('gpt-3.5') || idLower.includes('gpt-35')) category = 'GPT-3.5';
            else if (idLower.includes('claude')) category = 'Claude';
            else if (idLower.includes('gemini')) category = 'Gemini';
            else if (idLower.includes('llama')) category = 'Llama';
            else if (idLower.includes('mistral') || idLower.includes('mixtral')) category = 'Mistral';
            else if (idLower.includes('deepseek')) category = 'DeepSeek';
            else if (idLower.includes('qwen')) category = 'Qwen';
            else if (idLower.startsWith('o1') || idLower.startsWith('o3') || idLower.startsWith('o4')) category = 'Reasoning (o-series)';

            return {
                id: id,
                name: name,
                category: category,
                ownedBy: ownedBy
            };
        }

        function getCachedModels() {
            try {
                const cached = localStorage.getItem(CONFIG.CACHE_KEY);
                if (cached) {
                    const { models, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < CONFIG.CACHE_TTL) {
                        return models;
                    }
                }
            } catch (e) {
                console.log('[YuppBridge] Cache read error:', e);
            }
            return null;
        }

        function setCachedModels(models) {
            try {
                localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
                    models: models,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.log('[YuppBridge] Cache write error:', e);
            }
        }

        function clearCache() {
            localStorage.removeItem(CONFIG.CACHE_KEY);
        }

        async function fetchModels(forceRefresh = false) {
            const apiUrl = getApiUrl();
            if (!apiUrl) {
                console.log('[YuppBridge] No API URL configured, using fallback models');
                return getFallbackModels();
            }

            if (!forceRefresh) {
                const cached = getCachedModels();
                if (cached) {
                    console.log('[YuppBridge] Using cached models:', cached.length);
                    return cached;
                }
            }

            try {
                const headers = {
                    'Content-Type': 'application/json'
                };

                const apiKey = getApiKey();
                if (apiKey) {
                    headers['Authorization'] = `Bearer ${apiKey}`;
                }

                console.log('[YuppBridge] Fetching models from:', `${apiUrl}/api/v1/models`);
                const response = await fetch(`${apiUrl}/api/v1/models`, {
                    method: 'GET',
                    headers: headers
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                const rawModels = data.data || data.models || data || [];

                const models = (Array.isArray(rawModels) ? rawModels : [])
                    .filter(m => m && m.id)
                    .map(normalizeModel)
                    .sort((a, b) => {
                        // Sort by category, then by name
                        const categoryOrder = ['GPT-4o', 'Reasoning (o-series)', 'GPT-4', 'GPT-3.5', 'Claude', 'Gemini', 'Llama', 'Mistral', 'DeepSeek', 'Qwen', 'Other'];
                        const aIdx = categoryOrder.indexOf(a.category);
                        const bIdx = categoryOrder.indexOf(b.category);
                        if (aIdx !== bIdx) return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
                        return a.name.localeCompare(b.name);
                    });

                console.log('[YuppBridge] Fetched models:', models.length);
                setCachedModels(models);
                return models;
            } catch (error) {
                console.error('[YuppBridge] Fetch error:', error);
                return getFallbackModels();
            }
        }

        function getFallbackModels() {
            return [
                { id: 'gpt-4o', name: 'GPT-4o', category: 'GPT-4o', ownedBy: 'openai' },
                { id: 'gpt-4o-mini', name: 'GPT-4o Mini', category: 'GPT-4o', ownedBy: 'openai' },
                { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', category: 'GPT-4', ownedBy: 'openai' },
                { id: 'claude-3-opus', name: 'Claude 3 Opus', category: 'Claude', ownedBy: 'anthropic' },
                { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', category: 'Claude', ownedBy: 'anthropic' },
                { id: 'claude-3-haiku', name: 'Claude 3 Haiku', category: 'Claude', ownedBy: 'anthropic' },
                { id: 'gemini-pro', name: 'Gemini Pro', category: 'Gemini', ownedBy: 'google' },
                { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', category: 'Gemini', ownedBy: 'google' },
                { id: 'llama-3-70b', name: 'Llama 3 70B', category: 'Llama', ownedBy: 'meta' },
                { id: 'mistral-large', name: 'Mistral Large', category: 'Mistral', ownedBy: 'mistral' },
                { id: 'deepseek-coder', name: 'DeepSeek Coder', category: 'DeepSeek', ownedBy: 'deepseek' },
            ];
        }

        function filterModels(models, query) {
            if (!query) return models;
            const lowerQuery = query.toLowerCase();
            return models.filter(m =>
                m.id.toLowerCase().includes(lowerQuery) ||
                m.name.toLowerCase().includes(lowerQuery) ||
                m.category.toLowerCase().includes(lowerQuery) ||
                m.ownedBy.toLowerCase().includes(lowerQuery)
            );
        }

        function groupModels(models) {
            const groups = {};
            models.forEach(model => {
                if (!groups[model.category]) groups[model.category] = [];
                groups[model.category].push(model);
            });
            return groups;
        }

        async function generateCompletion(messages, options = {}) {
            const apiUrl = getApiUrl();
            const apiKey = getApiKey();

            if (!apiUrl) {
                throw new Error('YuppBridge API URL not configured. Please set it in settings.');
            }

            if (!Array.isArray(messages) || messages.length === 0) {
                throw new Error('Messages array is required');
            }

            const model = options.model || SETTINGS.yuppbridgeModel || CONFIG.DEFAULT_MODEL;
            const payload = {
                model: model,
                messages: messages
            };
            payload.temperature = options.temperature ?? SETTINGS.aiTemperature;
            if (typeof options.max_tokens === 'number') payload.max_tokens = options.max_tokens;

            const headers = {
                'Content-Type': 'application/json'
            };

            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
                console.log('[YuppBridge] Using API key (first 10 chars):', apiKey.substring(0, 10) + '...');
            } else {
                console.warn('[YuppBridge] WARNING: No API key configured!');
            }

            console.log('[YuppBridge] Sending chat request to:', `${apiUrl}/api/v1/chat/completions`, 'with model:', model);
            const response = await fetch(`${apiUrl}/api/v1/chat/completions`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                let errorMessage = `YuppBridge API request failed: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error?.message) errorMessage = errorData.error.message;
                    else if (errorData.error) errorMessage = errorData.error;
                } catch (e) { }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            let content = data.choices?.[0]?.message?.content;

            if (!content) {
                throw new Error('YuppBridge returned empty response');
            }

            // Clean up YuppBridge response artifacts
            content = cleanYuppBridgeResponse(content);

            return content;
        }

        async function checkHealth() {
            const apiUrl = getApiUrl();
            if (!apiUrl) return { ok: false, error: 'No API URL configured' };

            try {
                const response = await fetch(`${apiUrl}/health`);
                if (response.ok) {
                    const data = await response.json();
                    return { ok: true, data };
                }
                return { ok: false, error: `HTTP ${response.status}` };
            } catch (e) {
                return { ok: false, error: e.message };
            }
        }

        return {
            CONFIG,
            fetchModels,
            filterModels,
            groupModels,
            clearCache,
            normalizeModel,
            generateCompletion,
            checkHealth,
            getApiUrl,
            getApiKey
        };
    })();

    // YuppBridge wrapper function
    const generateWithYuppBridge = async (prompt) => {
        const model = SETTINGS.yuppbridgeModel || 'gpt-4o';
        return await YuppBridgeProvider.generateCompletion(
            [{ role: 'user', content: prompt }],
            { model: model, temperature: SETTINGS.aiTemperature, max_tokens: 2048 }
        );
    };

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

        const createSectionHeader = (title, iconPath = '') => {
            const header = document.createElement('div');
            header.style.cssText = `
                color: #4CAF50;
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                padding: 12px 0 6px 0;
                letter-spacing: 1.2px;
                display: flex;
                align-items: center;
                gap: 8px;
                border-bottom: 2px solid #333;
                margin-top: 10px;
                margin-bottom: 5px;
            `;

            if (iconPath) {
                header.innerHTML = `
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="${iconPath}"></path>
                    </svg>
                    <span>${title}</span>
                `;
            } else {
                header.textContent = title;
            }
            return header;
        };

        // ========== G4F MODEL SELECTOR FUNCTION (NEW) ==========
        const createG4FModelSelector = () => {
            const wrapper = document.createElement('div');
            wrapper.id = 'g4f-model-wrapper';
            wrapper.style.cssText = `padding: 10px 0; border-bottom: 1px solid #333; display: ${SETTINGS.aiProvider === 'g4f' ? 'block' : 'none'};`;

            wrapper.innerHTML = `
                <div style="color: #fff; font-size: 13px; margin-bottom: 6px;">G4F Model</div>
                <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                    <input type="text" id="g4fModelSearch" placeholder="Search models (e.g., qwen, gpt)" style="
                        flex: 1;
                        padding: 8px;
                        border: 1px solid #444;
                        border-radius: 6px;
                        background: #2d2d2d;
                        color: #fff;
                        font-size: 11px;
                        box-sizing: border-box;
                    ">
                    <button id="g4fRefreshModels" style="
                        padding: 8px 12px;
                        border: 1px solid #444;
                        border-radius: 6px;
                        background: #3d3d3d;
                        color: #fff;
                        cursor: pointer;
                        font-size: 11px;
                    ">🔄</button>
                </div>
                <select id="g4fModel" style="
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #444;
                    border-radius: 6px;
                    background: #2d2d2d;
                    color: #fff;
                    font-size: 11px;
                    box-sizing: border-box;
                ">
                    <option value="auto">Auto (Automatic Model Selection)</option>
                </select>
                <div id="g4fModelStatus" style="color: #666; font-size: 10px; margin-top: 4px;"></div>
            `;

            setTimeout(() => {
                const select = document.getElementById('g4fModel');
                const searchInput = document.getElementById('g4fModelSearch');
                const refreshBtn = document.getElementById('g4fRefreshModels');
                const statusDiv = document.getElementById('g4fModelStatus');

                let allModels = [];

                const populateSelect = (models) => {
                    if (!select) return;
                    const currentValue = SETTINGS.g4fModel || 'auto';
                    select.innerHTML = '<option value="auto">Auto (Automatic Model Selection)</option>';

                    models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model.id;
                        option.textContent = `${model.name} (${model.owner})`;
                        option.selected = model.id === currentValue;
                        select.appendChild(option);
                    });

                    if (statusDiv) statusDiv.textContent = `${models.length} models available`;
                };

                const loadModels = async (forceRefresh = false) => {
                    if (!SETTINGS.g4fApiKey) {
                        if (statusDiv) statusDiv.textContent = 'Enter API key to load models';
                        return;
                    }

                    if (statusDiv) statusDiv.textContent = 'Loading models...';

                    try {
                        allModels = await G4FProvider.fetchModels(forceRefresh);
                        populateSelect(allModels);
                    } catch (error) {
                        if (statusDiv) statusDiv.textContent = `Error: ${error.message}`;
                    }
                };

                if (searchInput) {
                    searchInput.addEventListener('input', () => {
                        const filtered = G4FProvider.filterModels(allModels, searchInput.value.trim());
                        populateSelect(filtered);
                    });
                }

                if (refreshBtn) {
                    refreshBtn.addEventListener('click', () => loadModels(true));
                }

                if (select) {
                    select.addEventListener('change', () => {
                        SETTINGS.g4fModel = select.value;
                        saveSettings(SETTINGS);
                    });
                }

                loadModels();
            }, 100);

            return wrapper;
        };
        // ========================================================

        // Add toggles
        panelContent.appendChild(createSectionHeader('Anti-Cheat Bypasses', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z'));
        panelContent.appendChild(createToggle('bypassTabDetection', 'Tab Detection Bypass', SETTINGS.bypassTabDetection, 'Prevent tab switch detection'));
        panelContent.appendChild(createToggle('bypassCopyPaste', 'Copy/Paste Bypass', SETTINGS.bypassCopyPaste, 'Enable clipboard in code editor'));
        panelContent.appendChild(createToggle('bypassFullscreen', 'Fullscreen Bypass', SETTINGS.bypassFullscreen, 'Skip fullscreen enforcement'));
        panelContent.appendChild(createToggle('bypassMultiMonitor', 'Multi-Monitor Bypass', SETTINGS.bypassMultiMonitor, 'Block monitor detection'));
        panelContent.appendChild(createToggle('blockTelemetry', 'Block Telemetry', SETTINGS.blockTelemetry, 'Block heartbeat requests'));

        panelContent.appendChild(createSectionHeader('Editor Features', 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'));
        panelContent.appendChild(createToggle('enableDragDrop', 'Drag & Drop', SETTINGS.enableDragDrop, 'Enable drag & drop text'));
        panelContent.appendChild(createToggle('enableTextSelection', 'Text Selection', SETTINGS.enableTextSelection, 'Enable text selection'));
        panelContent.appendChild(createToggle('enableContextMenu', 'Context Menu', SETTINGS.enableContextMenu, 'Enable right-click menu'));

        panelContent.appendChild(createSectionHeader('Captcha Solver', 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z'));
        panelContent.appendChild(createToggle('enableCaptchaSolver', 'Auto-Solve Captcha', SETTINGS.enableCaptchaSolver, 'Automatically solve math captcha'));
        panelContent.appendChild(createTextInput('captchaUsername', 'Username (optional)', SETTINGS.captchaUsername, 'e.g., abcd123+21@xyz'));

        panelContent.appendChild(createSectionHeader('AI Solution Generator', 'M21 16.5c0 .38-.21.71-.53.88l-7.97 4.43c-.31.17-.69.17-1 0L3.53 17.38c-.32-.17-.53-.5-.53-.88V7.5c0-.38.21-.71.53-.88l7.97-4.43c.31-.17.69-.17 1 0l7.97 4.43c.32.17.53.5.53.88v9z'));
        panelContent.appendChild(createToggle('enableAISolver', 'Enable AI Solver', SETTINGS.enableAISolver, 'Show AI solution button'));
        panelContent.appendChild(createToggle('includePrePostCode', 'Include Pre/Post Code', SETTINGS.includePrePostCode, 'Include pre/post code context. Disable to send full code to AI.'));

        // Temperature setting
        const tempWrapper = document.createElement('div');
        tempWrapper.style.cssText = 'padding: 10px 0; border-bottom: 1px solid #333;';
        tempWrapper.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="color: #fff; font-size: 13px;">AI Temperature</div>
                <div id="temp-value" style="color: #4CAF50; font-size: 13px; font-weight: bold;">${SETTINGS.aiTemperature}</div>
            </div>
            <input type="range" id="aiTemperature" min="0" max="1" step="0.1" value="${SETTINGS.aiTemperature}" style="
                width: 100%;
                height: 4px;
                background: #444;
                border-radius: 2px;
                outline: none;
                cursor: pointer;
                accent-color: #4CAF50;
            ">
            <div style="color: #888; font-size: 11px; margin-top: 4px;">Lower is more predictable, higher is more creative.</div>
        `;
        tempWrapper.querySelector('input').addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            document.getElementById('temp-value').textContent = val;
            SETTINGS.aiTemperature = val;
            saveSettings(SETTINGS);
        });
        panelContent.appendChild(tempWrapper);

        // Custom System Prompt
        const promptWrapper = document.createElement('div');
        promptWrapper.style.cssText = 'padding: 10px 0; border-bottom: 1px solid #333;';
        promptWrapper.innerHTML = `
            <div style="color: #fff; font-size: 13px; margin-bottom: 6px;">Custom System Prompt</div>
            <textarea id="aiSystemPrompt" placeholder="Inject custom instructions to AI solver..." style="
                width: 100%;
                height: 60px;
                padding: 8px;
                border: 1px solid #444;
                border-radius: 6px;
                background: #2d2d2d;
                color: #fff;
                font-size: 12px;
                resize: vertical;
                box-sizing: border-box;
                font-family: inherit;
            ">${SETTINGS.aiSystemPrompt || ''}</textarea>
            <div style="color: #888; font-size: 11px; margin-top: 4px;">Prepended to every AI request. Absolute priority.</div>
        `;
        promptWrapper.querySelector('textarea').addEventListener('input', (e) => {
            SETTINGS.aiSystemPrompt = e.target.value;
            saveSettings(SETTINGS);
        });
        panelContent.appendChild(promptWrapper);

        // Special toggle for Auto Solver
        const autoSolverToggle = createToggle('enableAutoSolver', 'Auto Solver', SETTINGS.enableAutoSolver, 'Auto-solve & submit (requires AI Solver)');
        const autoSolverCheckbox = autoSolverToggle.querySelector('input[type="checkbox"]');
        if (autoSolverCheckbox) {
            autoSolverCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    const confirmed = confirm(
                        'AUTO SOLVER - EXPERIMENTAL FEATURE\n\n' +
                        'â€¢ This feature is UNDER DEVELOPMENT\n' +
                        'â€¢ Errors and unexpected behavior may occur\n' +
                        'â€¢ Not fully tested on all problem types\n' +
                        'â€¢ May cause page reloads or get stuck\n\n' +
                        'USE AT YOUR OWN RISK!\n\n' +
                        'You can stop it anytime using the STOP button that appears.\n\n' +
                        'Do you want to enable Auto Solver?'
                    );
                    if (!confirmed) {
                        e.target.checked = false;
                        SETTINGS.enableAutoSolver = false;
                        saveSettings(SETTINGS);
                    }
                }
            });
        }
        panelContent.appendChild(autoSolverToggle);

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
                <option value="g4f" ${SETTINGS.aiProvider === 'g4f' ? 'selected' : ''}>G4F (g4f.space)</option>
                <option value="duckduckgo" ${SETTINGS.aiProvider === 'duckduckgo' ? 'selected' : ''}>DuckDuckGo AI (FREE!)</option>
                <option value="yuppbridge" ${SETTINGS.aiProvider === 'yuppbridge' ? 'selected' : ''}>YuppBridge (200+ Models)</option>
            </select>
        `;
        const providerSelect = providerWrapper.querySelector('select');
        providerSelect.addEventListener('change', () => {
            SETTINGS.aiProvider = providerSelect.value;
            saveSettings(SETTINGS);
            // Show/hide model selectors based on provider
            const geminiModelWrapper = document.getElementById('gemini-model-wrapper');
            const openaiModelWrapper = document.getElementById('openai-model-wrapper');
            const orModelWrapper = document.getElementById('openrouter-model-wrapper');
            const g4fModelWrapper = document.getElementById('g4f-model-wrapper');
            const ddgModelWrapper = document.getElementById('duckduckgo-model-wrapper');
            if (geminiModelWrapper) {
                geminiModelWrapper.style.display = providerSelect.value === 'gemini' ? 'block' : 'none';
            }
            if (openaiModelWrapper) {
                openaiModelWrapper.style.display = providerSelect.value === 'openai' ? 'block' : 'none';
            }
            if (orModelWrapper) {
                orModelWrapper.style.display = providerSelect.value === 'openrouter' ? 'block' : 'none';
            }
            if (g4fModelWrapper) {
                g4fModelWrapper.style.display = providerSelect.value === 'g4f' ? 'block' : 'none';
            }
            if (ddgModelWrapper) {
                ddgModelWrapper.style.display = providerSelect.value === 'duckduckgo' ? 'block' : 'none';
            }
            const yuppbridgeModelWrapper = document.getElementById('yuppbridge-model-wrapper');
            if (yuppbridgeModelWrapper) {
                yuppbridgeModelWrapper.style.display = providerSelect.value === 'yuppbridge' ? 'block' : 'none';
            }
        });
        panelContent.appendChild(providerWrapper);
        // ================================================================================

        panelContent.appendChild(createTextInput('geminiApiKey', 'Gemini API Key', SETTINGS.geminiApiKey, 'Enter your Gemini API key'));

        // ========== DYNAMIC GEMINI MODEL SELECTOR ==========
        const createGeminiModelSelector = () => {
            const wrapper = document.createElement('div');
            wrapper.id = 'gemini-model-wrapper';
            wrapper.style.cssText = `padding: 10px 0; border-bottom: 1px solid #333; display: ${SETTINGS.aiProvider === 'gemini' ? 'block' : 'none'};`;

            wrapper.innerHTML = `
                <div style="color: #fff; font-size: 13px; margin-bottom: 6px;">Gemini Model</div>
                <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                    <input type="text" id="geminiModelSearch" placeholder="Search models (e.g., 2.5, flash, pro)" style="
                        flex: 1;
                        padding: 8px;
                        border: 1px solid #444;
                        border-radius: 6px;
                        background: #2d2d2d;
                        color: #fff;
                        font-size: 11px;
                        box-sizing: border-box;
                    ">
                    <button id="geminiRefreshModels" title="Refresh models list" style="
                        padding: 8px 12px;
                        border: 1px solid #444;
                        border-radius: 6px;
                        background: #3d3d3d;
                        color: #fff;
                        cursor: pointer;
                        font-size: 11px;
                    ">🔄</button>
                </div>
                <select id="geminiModel" style="
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #444;
                    border-radius: 6px;
                    background: #2d2d2d;
                    color: #fff;
                    font-size: 11px;
                    box-sizing: border-box;
                ">
                    <option value="gemini-2.5-flash">Loading models...</option>
                </select>
                <div id="geminiModelStatus" style="color: #666; font-size: 10px; margin-top: 4px;"></div>
            `;

            setTimeout(() => {
                const select = document.getElementById('geminiModel');
                const searchInput = document.getElementById('geminiModelSearch');
                const refreshBtn = document.getElementById('geminiRefreshModels');
                const statusDiv = document.getElementById('geminiModelStatus');

                let allModels = [];

                const populateSelect = (models) => {
                    if (!select) return;
                    const currentValue = SETTINGS.geminiModel || 'gemini-2.5-flash';
                    select.innerHTML = '';

                    // Group models by category
                    const groups = GeminiProvider.groupModels(models);
                    const categoryOrder = ['Gemini 2.x', 'Gemini 1.5', 'Gemini 1.0', 'Other'];

                    for (const category of categoryOrder) {
                        const categoryModels = groups[category];
                        if (!categoryModels || categoryModels.length === 0) continue;

                        const optgroup = document.createElement('optgroup');
                        optgroup.label = `${category} (${categoryModels.length})`;
                        categoryModels.forEach(model => {
                            const option = document.createElement('option');
                            option.value = model.id;
                            option.textContent = model.name;
                            option.title = model.description || '';
                            option.selected = model.id === currentValue;
                            optgroup.appendChild(option);
                        });
                        select.appendChild(optgroup);
                    }

                    if (statusDiv) statusDiv.textContent = `${models.length} models available`;
                };

                const loadModels = async (forceRefresh = false) => {
                    if (statusDiv) statusDiv.textContent = 'Loading models...';
                    if (refreshBtn) {
                        refreshBtn.disabled = true;
                        refreshBtn.textContent = '⏳';
                    }

                    try {
                        allModels = await GeminiProvider.fetchModels(forceRefresh);
                        populateSelect(allModels);
                        if (statusDiv) statusDiv.textContent = `${allModels.length} models loaded`;
                    } catch (error) {
                        console.error('[Gemini] Failed to load models:', error);
                        if (statusDiv) statusDiv.textContent = `Error: ${error.message}`;
                        select.innerHTML = '<option value="gemini-2.5-flash" selected>Gemini 2.5 Flash (Default)</option>';
                    } finally {
                        if (refreshBtn) {
                            refreshBtn.disabled = false;
                            refreshBtn.textContent = '🔄';
                        }
                    }
                };

                if (searchInput) {
                    let searchTimeout;
                    searchInput.addEventListener('input', () => {
                        clearTimeout(searchTimeout);
                        searchTimeout = setTimeout(() => {
                            const filtered = GeminiProvider.filterModels(allModels, searchInput.value.trim());
                            populateSelect(filtered);
                        }, 150);
                    });
                }

                if (refreshBtn) {
                    refreshBtn.addEventListener('click', () => loadModels(true));
                }

                if (select) {
                    select.addEventListener('change', () => {
                        SETTINGS.geminiModel = select.value;
                        saveSettings(SETTINGS);
                    });
                }

                loadModels();
            }, 100);

            return wrapper;
        };

        panelContent.appendChild(createGeminiModelSelector());
        // ========================================================

        panelContent.appendChild(createTextInput('openaiApiKey', 'OpenAI API Key', SETTINGS.openaiApiKey, 'Enter your OpenAI API key'));

        // ========== DYNAMIC OPENAI MODEL SELECTOR ==========
        const createOpenAIModelSelector = () => {
            const wrapper = document.createElement('div');
            wrapper.id = 'openai-model-wrapper';
            wrapper.style.cssText = `padding: 10px 0; border-bottom: 1px solid #333; display: ${SETTINGS.aiProvider === 'openai' ? 'block' : 'none'};`;

            wrapper.innerHTML = `
                <div style="color: #fff; font-size: 13px; margin-bottom: 6px;">OpenAI Model</div>
                <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                    <input type="text" id="openaiModelSearch" placeholder="Search models (e.g., gpt-4, o1, turbo)" style="
                        flex: 1;
                        padding: 8px;
                        border: 1px solid #444;
                        border-radius: 6px;
                        background: #2d2d2d;
                        color: #fff;
                        font-size: 11px;
                        box-sizing: border-box;
                    ">
                    <button id="openaiRefreshModels" title="Refresh models list" style="
                        padding: 8px 12px;
                        border: 1px solid #444;
                        border-radius: 6px;
                        background: #3d3d3d;
                        color: #fff;
                        cursor: pointer;
                        font-size: 11px;
                    ">🔄</button>
                </div>
                <select id="openaiModel" style="
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #444;
                    border-radius: 6px;
                    background: #2d2d2d;
                    color: #fff;
                    font-size: 11px;
                    box-sizing: border-box;
                ">
                    <option value="gpt-4o-mini">Loading models...</option>
                </select>
                <div id="openaiModelStatus" style="color: #666; font-size: 10px; margin-top: 4px;"></div>
            `;

            setTimeout(() => {
                const select = document.getElementById('openaiModel');
                const searchInput = document.getElementById('openaiModelSearch');
                const refreshBtn = document.getElementById('openaiRefreshModels');
                const statusDiv = document.getElementById('openaiModelStatus');

                let allModels = [];

                const populateSelect = (models) => {
                    if (!select) return;
                    const currentValue = SETTINGS.openaiModel || 'gpt-4o-mini';
                    select.innerHTML = '';

                    // Group models by category
                    const groups = OpenAIProvider.groupModels(models);
                    const categoryOrder = ['GPT-4o', 'Reasoning (o-series)', 'GPT-4', 'GPT-3.5', 'Legacy', 'Other'];

                    for (const category of categoryOrder) {
                        const categoryModels = groups[category];
                        if (!categoryModels || categoryModels.length === 0) continue;

                        const optgroup = document.createElement('optgroup');
                        optgroup.label = `${category} (${categoryModels.length})`;
                        categoryModels.forEach(model => {
                            const option = document.createElement('option');
                            option.value = model.id;
                            option.textContent = model.name;
                            option.selected = model.id === currentValue;
                            optgroup.appendChild(option);
                        });
                        select.appendChild(optgroup);
                    }

                    if (statusDiv) statusDiv.textContent = `${models.length} models available`;
                };

                const loadModels = async (forceRefresh = false) => {
                    if (statusDiv) statusDiv.textContent = 'Loading models...';
                    if (refreshBtn) {
                        refreshBtn.disabled = true;
                        refreshBtn.textContent = '⏳';
                    }

                    try {
                        allModels = await OpenAIProvider.fetchModels(forceRefresh);
                        populateSelect(allModels);
                        if (statusDiv) statusDiv.textContent = `${allModels.length} models loaded`;
                    } catch (error) {
                        console.error('[OpenAI] Failed to load models:', error);
                        if (statusDiv) statusDiv.textContent = `Error: ${error.message}`;
                        select.innerHTML = '<option value="gpt-4o-mini" selected>GPT-4o Mini (Default)</option>';
                    } finally {
                        if (refreshBtn) {
                            refreshBtn.disabled = false;
                            refreshBtn.textContent = '🔄';
                        }
                    }
                };

                if (searchInput) {
                    let searchTimeout;
                    searchInput.addEventListener('input', () => {
                        clearTimeout(searchTimeout);
                        searchTimeout = setTimeout(() => {
                            const filtered = OpenAIProvider.filterModels(allModels, searchInput.value.trim());
                            populateSelect(filtered);
                        }, 150);
                    });
                }

                if (refreshBtn) {
                    refreshBtn.addEventListener('click', () => loadModels(true));
                }

                if (select) {
                    select.addEventListener('change', () => {
                        SETTINGS.openaiModel = select.value;
                        saveSettings(SETTINGS);
                    });
                }

                loadModels();
            }, 100);

            return wrapper;
        };

        panelContent.appendChild(createOpenAIModelSelector());
        // ========================================================

        panelContent.appendChild(createTextInput('openrouterApiKey', 'OpenRouter API Key', SETTINGS.openrouterApiKey, 'Enter your OpenRouter API key'));

        // ========== DYNAMIC OPENROUTER MODEL SELECTOR ==========
        const createOpenRouterModelSelector = () => {
            const wrapper = document.createElement('div');
            wrapper.id = 'openrouter-model-wrapper';
            wrapper.style.cssText = `padding: 10px 0; border-bottom: 1px solid #333; display: ${SETTINGS.aiProvider === 'openrouter' ? 'block' : 'none'};`;

            wrapper.innerHTML = `
                <div style="color: #fff; font-size: 13px; margin-bottom: 6px;">OpenRouter Model</div>
                <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                    <input type="text" id="orModelSearch" placeholder="Search models (e.g., gemini, claude, free)" style="
                        flex: 1;
                        padding: 8px;
                        border: 1px solid #444;
                        border-radius: 6px;
                        background: #2d2d2d;
                        color: #fff;
                        font-size: 11px;
                        box-sizing: border-box;
                    ">
                    <button id="orRefreshModels" title="Refresh models list" style="
                        padding: 8px 12px;
                        border: 1px solid #444;
                        border-radius: 6px;
                        background: #3d3d3d;
                        color: #fff;
                        cursor: pointer;
                        font-size: 11px;
                    ">🔄</button>
                </div>
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
                    <option value="google/gemini-2.0-flash-001">Loading models...</option>
                </select>
                <div id="orModelStatus" style="color: #666; font-size: 10px; margin-top: 4px;"></div>
                <div style="display: flex; gap: 6px; margin-top: 6px;">
                    <label style="display: flex; align-items: center; gap: 4px; color: #888; font-size: 10px; cursor: pointer;">
                        <input type="checkbox" id="orShowFreeOnly" style="margin: 0;">
                        Show free only
                    </label>
                </div>
            `;

            setTimeout(() => {
                const select = document.getElementById('openrouterModel');
                const searchInput = document.getElementById('orModelSearch');
                const refreshBtn = document.getElementById('orRefreshModels');
                const statusDiv = document.getElementById('orModelStatus');
                const freeOnlyCheckbox = document.getElementById('orShowFreeOnly');

                let allModels = [];
                let showFreeOnly = false;

                const populateSelect = (models) => {
                    if (!select) return;
                    const currentValue = SETTINGS.openrouterModel || 'google/gemini-2.0-flash-001';
                    select.innerHTML = '';

                    // Group models
                    const { freeModels, groups } = OpenRouterProvider.groupModels(models);

                    // Add free models first
                    if (freeModels.length > 0) {
                        const freeGroup = document.createElement('optgroup');
                        freeGroup.label = `⭐ Free Models (${freeModels.length})`;
                        freeModels.forEach(model => {
                            const option = document.createElement('option');
                            option.value = model.id;
                            option.textContent = `${model.name} (${model.author})`;
                            option.title = model.description || '';
                            option.selected = model.id === currentValue;
                            freeGroup.appendChild(option);
                        });
                        select.appendChild(freeGroup);
                    }

                    // Add other groups (skip if showing free only)
                    if (!showFreeOnly) {
                        const sortedGroups = Object.keys(groups).sort();
                        for (const groupName of sortedGroups) {
                            const groupModels = groups[groupName];
                            if (groupModels.length === 0) continue;

                            const optgroup = document.createElement('optgroup');
                            optgroup.label = `${groupName} (${groupModels.length})`;
                            groupModels.forEach(model => {
                                const option = document.createElement('option');
                                option.value = model.id;
                                option.textContent = `${model.name} (${model.author})`;
                                option.title = model.description || '';
                                option.selected = model.id === currentValue;
                                optgroup.appendChild(option);
                            });
                            select.appendChild(optgroup);
                        }
                    }

                    const totalCount = showFreeOnly ? freeModels.length : models.length;
                    if (statusDiv) statusDiv.textContent = `${totalCount} models available`;
                };

                const applyFilters = () => {
                    let filtered = allModels;

                    // Apply search filter
                    const searchQuery = searchInput?.value?.trim() || '';
                    if (searchQuery) {
                        filtered = OpenRouterProvider.filterModels(filtered, searchQuery);
                    }

                    // Apply free-only filter
                    if (showFreeOnly) {
                        filtered = filtered.filter(m => m.isFree);
                    }

                    populateSelect(filtered);
                };

                const loadModels = async (forceRefresh = false) => {
                    if (statusDiv) statusDiv.textContent = 'Loading models...';
                    if (refreshBtn) {
                        refreshBtn.disabled = true;
                        refreshBtn.textContent = '⏳';
                    }

                    try {
                        allModels = await OpenRouterProvider.fetchModels(forceRefresh);
                        applyFilters();
                        if (statusDiv) statusDiv.textContent = `${allModels.length} models loaded`;
                    } catch (error) {
                        console.error('[OpenRouter] Failed to load models:', error);
                        if (statusDiv) statusDiv.textContent = `Error: ${error.message}`;
                        // Fallback to default model
                        select.innerHTML = '<option value="google/gemini-2.0-flash-001" selected>Gemini 2.0 Flash (Default)</option>';
                    } finally {
                        if (refreshBtn) {
                            refreshBtn.disabled = false;
                            refreshBtn.textContent = '🔄';
                        }
                    }
                };

                if (searchInput) {
                    let searchTimeout;
                    searchInput.addEventListener('input', () => {
                        clearTimeout(searchTimeout);
                        searchTimeout = setTimeout(applyFilters, 150);
                    });
                }

                if (refreshBtn) {
                    refreshBtn.addEventListener('click', () => loadModels(true));
                }

                if (freeOnlyCheckbox) {
                    freeOnlyCheckbox.addEventListener('change', () => {
                        showFreeOnly = freeOnlyCheckbox.checked;
                        applyFilters();
                    });
                }

                if (select) {
                    select.addEventListener('change', () => {
                        SETTINGS.openrouterModel = select.value;
                        saveSettings(SETTINGS);
                    });
                }

                // Load models on init
                loadModels();
            }, 100);

            return wrapper;
        };

        panelContent.appendChild(createOpenRouterModelSelector());
        // ========================================================

        // ========== G4F API KEY AND MODEL SELECTOR (NEW) ==========
        panelContent.appendChild(createTextInput('g4fApiKey', 'G4F API Key', SETTINGS.g4fApiKey, 'Enter your G4F API key'));
        panelContent.appendChild(createG4FModelSelector());
        // ===========================================================

        // ========== DUCKDUCKGO MODEL SELECTOR (Uses Proxy API) ==========
        const createDuckDuckGoModelSelector = () => {
            const wrapper = document.createElement('div');
            wrapper.id = 'duckduckgo-model-wrapper';
            wrapper.style.cssText = `padding: 10px 0; border-bottom: 1px solid #333; display: ${SETTINGS.aiProvider === 'duckduckgo' ? 'block' : 'none'};`;

            const models = DuckDuckGoProvider.getModels();
            const currentModel = SETTINGS.duckduckgoModel || 'gpt-4o-mini';
            const currentApiUrl = SETTINGS.duckduckgoApiUrl || 'https://duckduckgo-api.toontamilindia.workers.dev';
            const currentApiKey = SETTINGS.duckduckgoApiKey || '';
            const currentIncludeReasoning = Boolean(SETTINGS.duckduckgoIncludeReasoning);
            const currentReasoningEffort = (SETTINGS.duckduckgoReasoningEffort || 'low').toLowerCase();

            let optionsHtml = models.map(m =>
                `<option value="${m.id}" ${m.id === currentModel ? 'selected' : ''}>${m.name} (${m.owner})</option>`
            ).join('');

            wrapper.innerHTML = `
                <div style="color: #fff; font-size: 13px; margin-bottom: 6px;">🦆 DuckDuckGo AI (Proxy)</div>
                <div style="background: #1a3a1a; border: 1px solid #4CAF50; border-radius: 6px; padding: 8px; margin-bottom: 8px;">
                    <div style="color: #4CAF50; font-size: 11px; font-weight: bold;">✨ FREE - Uses Cloudflare Worker Proxy</div>
                    <div style="color: #888; font-size: 10px; margin-top: 4px;">Bypasses CSP restrictions</div>
                </div>
                <div style="margin-bottom: 8px;">
                    <label style="color: #aaa; font-size: 11px; display: block; margin-bottom: 4px;">API URL</label>
                    <input type="text" id="ddgApiUrl" value="${currentApiUrl}" placeholder="https://your-worker.workers.dev" style="
                        width: 100%;
                        padding: 6px 8px;
                        border: 1px solid #444;
                        border-radius: 4px;
                        background: #2d2d2d;
                        color: #fff;
                        font-size: 11px;
                        box-sizing: border-box;
                    ">
                </div>
                <div style="margin-bottom: 8px;">
                    <label style="color: #aaa; font-size: 11px; display: block; margin-bottom: 4px;">API Key (optional)</label>
                    <input type="password" id="ddgApiKey" value="${currentApiKey}" placeholder="Leave empty if not required" style="
                        width: 100%;
                        padding: 6px 8px;
                        border: 1px solid #444;
                        border-radius: 4px;
                        background: #2d2d2d;
                        color: #fff;
                        font-size: 11px;
                        box-sizing: border-box;
                    ">
                </div>
                <div style="margin-bottom: 4px;">
                    <label style="color: #aaa; font-size: 11px; display: block; margin-bottom: 4px;">Model</label>
                    <select id="ddgModelSelect" style="
                        width: 100%;
                        padding: 8px;
                        border: 1px solid #444;
                        border-radius: 6px;
                        background: #2d2d2d;
                        color: #fff;
                        font-size: 12px;
                        box-sizing: border-box;
                    ">
                        ${optionsHtml}
                    </select>
                </div>
                <div style="margin: 8px 0 6px 0; padding: 8px; border: 1px solid #333; border-radius: 6px; background: #232323;">
                    <div style="color: #fff; font-size: 11px; margin-bottom: 6px;">Reasoning (GPT-5 / GPT-OSS)</div>
                    <label style="display: flex; align-items: center; gap: 8px; color: #aaa; font-size: 11px; margin-bottom: 6px; cursor: pointer;">
                        <input type="checkbox" id="ddgIncludeReasoning" ${currentIncludeReasoning ? 'checked' : ''}>
                        Include reasoning in output
                    </label>
                    <label style="color: #aaa; font-size: 10px; display: block; margin-bottom: 4px;">Reasoning Effort</label>
                    <select id="ddgReasoningEffort" style="
                        width: 100%;
                        padding: 6px;
                        border: 1px solid #444;
                        border-radius: 4px;
                        background: #2d2d2d;
                        color: #fff;
                        font-size: 11px;
                        box-sizing: border-box;
                    ">
                        <option value="low" ${currentReasoningEffort === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${currentReasoningEffort === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="high" ${currentReasoningEffort === 'high' ? 'selected' : ''}>High</option>
                    </select>
                    <div id="ddgReasoningHint" style="color: #777; font-size: 10px; margin-top: 6px;"></div>
                </div>
            `;

            setTimeout(() => {
                const select = document.getElementById('ddgModelSelect');
                const apiUrlInput = document.getElementById('ddgApiUrl');
                const apiKeyInput = document.getElementById('ddgApiKey');
                const includeReasoningToggle = document.getElementById('ddgIncludeReasoning');
                const reasoningEffortSelect = document.getElementById('ddgReasoningEffort');
                const reasoningHint = document.getElementById('ddgReasoningHint');
                const validReasoningEfforts = new Set(['low', 'medium', 'high']);

                const updateReasoningControls = () => {
                    const selectedModel = select ? select.value : currentModel;
                    const supportsReasoning = selectedModel === 'gpt-5-mini' || selectedModel === 'gpt-oss-120b';
                    const isEnabled = Boolean(includeReasoningToggle && includeReasoningToggle.checked);

                    if (includeReasoningToggle) {
                        includeReasoningToggle.disabled = !supportsReasoning;
                    }
                    if (reasoningEffortSelect) {
                        reasoningEffortSelect.disabled = !supportsReasoning || !isEnabled;
                    }
                    if (reasoningHint) {
                        reasoningHint.textContent = supportsReasoning
                            ? 'Reasoning is requested from the proxy and prepended before the answer.'
                            : 'Reasoning is available only for GPT-5 Mini and GPT-OSS 120B.';
                    }
                };

                if (select) {
                    select.addEventListener('change', () => {
                        SETTINGS.duckduckgoModel = select.value;
                        saveSettings(SETTINGS);
                        updateReasoningControls();
                    });
                }
                if (apiUrlInput) {
                    apiUrlInput.addEventListener('change', () => {
                        SETTINGS.duckduckgoApiUrl = apiUrlInput.value.trim();
                        saveSettings(SETTINGS);
                    });
                }
                if (apiKeyInput) {
                    apiKeyInput.addEventListener('change', () => {
                        SETTINGS.duckduckgoApiKey = apiKeyInput.value;
                        saveSettings(SETTINGS);
                    });
                }
                if (includeReasoningToggle) {
                    includeReasoningToggle.addEventListener('change', () => {
                        SETTINGS.duckduckgoIncludeReasoning = includeReasoningToggle.checked;
                        saveSettings(SETTINGS);
                        updateReasoningControls();
                    });
                }
                if (reasoningEffortSelect) {
                    reasoningEffortSelect.addEventListener('change', () => {
                        const effort = (reasoningEffortSelect.value || 'low').toLowerCase();
                        SETTINGS.duckduckgoReasoningEffort = validReasoningEfforts.has(effort) ? effort : 'low';
                        saveSettings(SETTINGS);
                    });
                }

                updateReasoningControls();
            }, 100);

            return wrapper;
        };
        panelContent.appendChild(createDuckDuckGoModelSelector());
        // ==============================================================

        // ========== YUPPBRIDGE MODEL SELECTOR (200+ Models) ==========
        const createYuppBridgeModelSelector = () => {
            const wrapper = document.createElement('div');
            wrapper.id = 'yuppbridge-model-wrapper';
            wrapper.style.cssText = `padding: 10px 0; border-bottom: 1px solid #333; display: ${SETTINGS.aiProvider === 'yuppbridge' ? 'block' : 'none'};`;

            const currentApiUrl = SETTINGS.yuppbridgeApiUrl || '';
            const currentApiKey = SETTINGS.yuppbridgeApiKey || '';
            const currentModel = SETTINGS.yuppbridgeModel || 'gpt-4o';

            wrapper.innerHTML = `
                <div style="color: #fff; font-size: 13px; margin-bottom: 6px;">🌉 YuppBridge (200+ Models)</div>
                <div style="background: #1a2a3a; border: 1px solid #2196F3; border-radius: 6px; padding: 8px; margin-bottom: 8px;">
                    <div style="color: #2196F3; font-size: 11px; font-weight: bold;">✨ Self-hosted Yupp AI Proxy</div>
                    <div style="color: #888; font-size: 10px; margin-top: 4px;">OpenAI-compatible API with 200+ models</div>
                    <div style="color: #666; font-size: 9px; margin-top: 2px;">
                        <a href="https://github.com/cloudWaddie/yuppbridge" target="_blank" style="color:#64B5F6;">📖 Self-host Guide</a>
                    </div>
                </div>
                <div style="margin-bottom: 8px;">
                    <label style="color: #aaa; font-size: 11px; display: block; margin-bottom: 4px;">API URL <span style="color:#f44336;">*</span></label>
                    <input type="text" id="yuppbridgeApiUrl" value="${currentApiUrl}" placeholder="https://your-yuppbridge-instance.com" style="
                        width: 100%;
                        padding: 6px 8px;
                        border: 1px solid #444;
                        border-radius: 4px;
                        background: #2d2d2d;
                        color: #fff;
                        font-size: 11px;
                        box-sizing: border-box;
                    ">
                </div>
                <div style="margin-bottom: 8px;">
                    <label style="color: #aaa; font-size: 11px; display: block; margin-bottom: 4px;">API Key <span style="color:#f44336;">*</span></label>
                    <input type="password" id="yuppbridgeApiKey" value="${currentApiKey}" placeholder="Your YuppBridge API key" style="
                        width: 100%;
                        padding: 6px 8px;
                        border: 1px solid #444;
                        border-radius: 4px;
                        background: #2d2d2d;
                        color: #fff;
                        font-size: 11px;
                        box-sizing: border-box;
                    ">
                </div>
                <div style="margin-bottom: 6px;">
                    <label style="color: #aaa; font-size: 11px; display: block; margin-bottom: 4px;">Model</label>
                    <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                        <input type="text" id="yuppbridgeModelSearch" placeholder="Search models (e.g., gpt-4, claude, gemini)" style="
                            flex: 1;
                            padding: 6px 8px;
                            border: 1px solid #444;
                            border-radius: 4px;
                            background: #2d2d2d;
                            color: #fff;
                            font-size: 11px;
                            box-sizing: border-box;
                        ">
                        <button id="yuppbridgeRefreshModels" title="Refresh models list" style="
                            padding: 6px 10px;
                            border: 1px solid #444;
                            border-radius: 4px;
                            background: #3d3d3d;
                            color: #fff;
                            cursor: pointer;
                            font-size: 11px;
                        ">🔄</button>
                        <button id="yuppbridgeHealthCheck" title="Check API health" style="
                            padding: 6px 10px;
                            border: 1px solid #444;
                            border-radius: 4px;
                            background: #3d3d3d;
                            color: #fff;
                            cursor: pointer;
                            font-size: 11px;
                        ">❤️</button>
                    </div>
                    <select id="yuppbridgeModelSelect" style="
                        width: 100%;
                        padding: 8px;
                        border: 1px solid #444;
                        border-radius: 6px;
                        background: #2d2d2d;
                        color: #fff;
                        font-size: 11px;
                        box-sizing: border-box;
                    ">
                        <option value="${currentModel}">${currentModel}</option>
                    </select>
                    <div id="yuppbridgeModelStatus" style="color: #666; font-size: 10px; margin-top: 4px;"></div>
                </div>
            `;

            setTimeout(() => {
                const select = document.getElementById('yuppbridgeModelSelect');
                const apiUrlInput = document.getElementById('yuppbridgeApiUrl');
                const apiKeyInput = document.getElementById('yuppbridgeApiKey');
                const searchInput = document.getElementById('yuppbridgeModelSearch');
                const refreshBtn = document.getElementById('yuppbridgeRefreshModels');
                const healthBtn = document.getElementById('yuppbridgeHealthCheck');
                const statusDiv = document.getElementById('yuppbridgeModelStatus');

                let allModels = [];

                const populateSelect = (models) => {
                    if (!select) return;
                    const currentValue = SETTINGS.yuppbridgeModel || 'gpt-4o';
                    select.innerHTML = '';

                    // Group models by category
                    const groups = YuppBridgeProvider.groupModels(models);
                    const categoryOrder = ['GPT-4o', 'Reasoning (o-series)', 'GPT-4', 'GPT-3.5', 'Claude', 'Gemini', 'Llama', 'Mistral', 'DeepSeek', 'Qwen', 'Other'];

                    for (const category of categoryOrder) {
                        const categoryModels = groups[category];
                        if (!categoryModels || categoryModels.length === 0) continue;

                        const optgroup = document.createElement('optgroup');
                        optgroup.label = `${category} (${categoryModels.length})`;
                        categoryModels.forEach(model => {
                            const option = document.createElement('option');
                            option.value = model.id;
                            option.textContent = `${model.name} (${model.ownedBy})`;
                            option.selected = model.id === currentValue;
                            optgroup.appendChild(option);
                        });
                        select.appendChild(optgroup);
                    }

                    if (statusDiv) statusDiv.textContent = `${models.length} models available`;
                };

                const loadModels = async (forceRefresh = false) => {
                    if (!SETTINGS.yuppbridgeApiUrl) {
                        if (statusDiv) statusDiv.textContent = 'Enter API URL to load models';
                        return;
                    }

                    if (statusDiv) statusDiv.textContent = 'Loading models...';
                    if (refreshBtn) {
                        refreshBtn.disabled = true;
                        refreshBtn.textContent = '⏳';
                    }

                    try {
                        allModels = await YuppBridgeProvider.fetchModels(forceRefresh);
                        populateSelect(allModels);
                        if (statusDiv) statusDiv.textContent = `${allModels.length} models loaded`;
                    } catch (error) {
                        console.error('[YuppBridge] Failed to load models:', error);
                        if (statusDiv) statusDiv.textContent = `Error: ${error.message}`;
                    } finally {
                        if (refreshBtn) {
                            refreshBtn.disabled = false;
                            refreshBtn.textContent = '🔄';
                        }
                    }
                };

                if (apiUrlInput) {
                    apiUrlInput.addEventListener('change', () => {
                        SETTINGS.yuppbridgeApiUrl = apiUrlInput.value.trim();
                        saveSettings(SETTINGS);
                        console.log('[YuppBridge] API URL updated:', SETTINGS.yuppbridgeApiUrl);
                        loadModels(true);
                    });
                    // Also capture on blur for better UX
                    apiUrlInput.addEventListener('blur', () => {
                        if (apiUrlInput.value.trim() !== SETTINGS.yuppbridgeApiUrl) {
                            SETTINGS.yuppbridgeApiUrl = apiUrlInput.value.trim();
                            saveSettings(SETTINGS);
                            console.log('[YuppBridge] API URL updated (blur):', SETTINGS.yuppbridgeApiUrl);
                            loadModels(true);
                        }
                    });
                }

                if (apiKeyInput) {
                    apiKeyInput.addEventListener('change', () => {
                        SETTINGS.yuppbridgeApiKey = apiKeyInput.value;
                        saveSettings(SETTINGS);
                        console.log('[YuppBridge] API Key updated, length:', SETTINGS.yuppbridgeApiKey.length);
                        // Clear cache and reload models with new API key
                        YuppBridgeProvider.clearCache();
                        loadModels(true);
                    });
                    // Also capture on blur
                    apiKeyInput.addEventListener('blur', () => {
                        if (apiKeyInput.value !== SETTINGS.yuppbridgeApiKey) {
                            SETTINGS.yuppbridgeApiKey = apiKeyInput.value;
                            saveSettings(SETTINGS);
                            console.log('[YuppBridge] API Key updated (blur), length:', SETTINGS.yuppbridgeApiKey.length);
                            YuppBridgeProvider.clearCache();
                            loadModels(true);
                        }
                    });
                }

                if (select) {
                    select.addEventListener('change', () => {
                        SETTINGS.yuppbridgeModel = select.value;
                        saveSettings(SETTINGS);
                    });
                }

                if (searchInput) {
                    let searchTimeout;
                    searchInput.addEventListener('input', () => {
                        clearTimeout(searchTimeout);
                        searchTimeout = setTimeout(() => {
                            const filtered = YuppBridgeProvider.filterModels(allModels, searchInput.value.trim());
                            populateSelect(filtered);
                        }, 150);
                    });
                }

                if (refreshBtn) {
                    refreshBtn.addEventListener('click', () => loadModels(true));
                }

                if (healthBtn) {
                    healthBtn.addEventListener('click', async () => {
                        if (statusDiv) statusDiv.textContent = 'Checking health...';
                        healthBtn.disabled = true;
                        healthBtn.textContent = '⏳';

                        const result = await YuppBridgeProvider.checkHealth();

                        if (result.ok) {
                            if (statusDiv) {
                                const uptime = result.data?.uptime ? ` (uptime: ${Math.floor(result.data.uptime)}s)` : '';
                                statusDiv.innerHTML = `<span style="color:#4CAF50;">✓ API is healthy${uptime}</span>`;
                            }
                        } else {
                            if (statusDiv) statusDiv.innerHTML = `<span style="color:#f44336;">✗ ${result.error}</span>`;
                        }

                        healthBtn.disabled = false;
                        healthBtn.textContent = '❤️';
                    });
                }

                // Load models on init if API URL is set
                if (SETTINGS.yuppbridgeApiUrl) {
                    loadModels();
                }
            }, 100);

            return wrapper;
        };
        panelContent.appendChild(createYuppBridgeModelSelector());
        // ==============================================================

        const note = document.createElement('div');
        note.style.cssText = 'color: #666; font-size: 10px; padding: 12px 0; text-align: center;';
        note.innerHTML = 'Reload page after changing settings<br>Keys: <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:#4CAF50;">Gemini</a> | <a href="https://openrouter.ai/keys" target="_blank" style="color:#4CAF50;">OpenRouter</a> | <a href="https://g4f.space" target="_blank" style="color:#4CAF50;">G4F</a><br>DuckDuckGo AI is FREE! | <a href="https://github.com/cloudWaddie/yuppbridge" target="_blank" style="color:#2196F3;">YuppBridge</a>';
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

    // Create settings UI after a delay to ensure page is loaded AND script is enabled
    onScriptEnabled(() => {
        setTimeout(createSettingsUI, 500);
    });

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
            window.ace.edit = function (...args) {
                const editor = originalEdit.apply(this, args);

                if (editor && editor.commands) {
                    // Intercept addCommand to block 'bte' and similar
                    const originalAddCommand = editor.commands.addCommand.bind(editor.commands);
                    editor.commands.addCommand = function (command) {
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
                    editor.commands.on = function (event, callback) {
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
                        editor.session.on = function (event, callback) {
                            if (event === 'change' && callback) {
                                const cbStr = callback.toString();
                                // Block the 30-char diff detection handler
                                if (cbStr.includes('diff > 30') || cbStr.includes('diff>30')) {
                                    console.log('Blocked ACE 30-char anti-paste change handler');
                                    // Replace with a simple sync handler that always syncs
                                    return originalSessionOn(event, function (e) {
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
                        editor.session.on('change', function (e) {
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
            set: function (value) {
                delete window.ace;
                window.ace = value;
                interceptAce();
            },
            get: function () {
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
        window.addEventListener('keydown', function (e) {
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
            get: function () {
                return 'visible'; // Always report as visible
            },
            configurable: true
        });

        Object.defineProperty(document, 'hidden', {
            get: function () {
                return false; // Always report as not hidden
            },
            configurable: true
        });

        // Override addEventListener to block visibilitychange events
        // But allow other events to pass through normally
        EventTarget.prototype.addEventListener = function (type, listener, options) {
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
        originalAddEventListener.call(document, 'paste', function (e) {
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

                const filterClipboardEvents = function (events) {
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

                jq.fn.bind = function (events, ...args) {
                    if (typeof events === 'string' && ['cut', 'copy', 'paste'].some(e => events === e)) {
                        return this; // Only block exact matches
                    }
                    return originalBind.call(this, events, ...args);
                };

                jq.fn.on = function (events, ...args) {
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
                    } catch (e) { }
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
                                    } catch (e) { }
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

                editor.session.setValue = function (text, cursorPos) {
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
            window.cs = function () {
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
            window.oncompile = function () {
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
        Element.prototype.requestFullscreen = function () {
            console.log('Full-screen request intercepted');
            // Return a fake promise that resolves immediately
            return Promise.resolve();
        };

        document.exitFullscreen = function () {
            console.log('Exit full-screen intercepted');
            return Promise.resolve();
        };

        // Override fullscreenchange event listeners
        document.addEventListener = function (type, listener, options) {
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
            get: function () {
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
            get: function () {
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
        XMLHttpRequest.prototype.open = function (method, url) {
            this._url = url;
            return originalXHROpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function (body) {
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

        window.fetch = function (resource, init) {
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
                return Promise.resolve(new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    statusText: 'OK',
                    headers: { 'Content-Type': 'application/json' }
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
            EventTarget.prototype.addEventListener = function (type, listener, options) {
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
                window.PrimeFaces.ajax.Response.handle = function (...args) {
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
                window.PrimeFaces.ajax.Request.handle = function (cfg, ...rest) {
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

            form.addEventListener('submit', function (e) {
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

    // ===== TIMING CONFIGURATION =====
    const CAPTCHA_CONFIG = {
        initialDelay: 800,
        retryDelay: 400,
        maxRetries: 12,
        observerTimeout: 8000
    };

    // Find captcha image dynamically
    function findCaptchaImage() {
        const allImages = document.querySelectorAll('img');
        const idPattern = /^j_id_[a-zA-Z0-9]+$/;

        for (const img of allImages) {
            if (img.id && idPattern.test(img.id)) {
                if (img.src && img.src.length > 100) {
                    console.log(`[Captcha] Found image with matching ID pattern: ${img.id}`);
                    return img;
                }
            }
        }

        const knownIds = ['j_id_5s', 'j_id_76', 'j_id_75', 'j_id_74', 'j_id_5r', 'j_id_5t'];
        for (const id of knownIds) {
            const img = document.getElementById(id);
            if (img && img.tagName === 'IMG' && img.src && img.src.length > 100) {
                console.log(`[Captcha] Found image with known ID: ${id}`);
                return img;
            }
        }

        const base64Images = document.querySelectorAll('img[src^="data:image"]');
        for (const img of base64Images) {
            const width = img.width || img.naturalWidth;
            const height = img.height || img.naturalHeight;

            if (width > 50 && width < 400 && height > 20 && height < 100) {
                console.log(`[Captcha] Found base64 image: ${width}x${height}`);
                return img;
            }
        }

        const codeEditorPanel = document.getElementById('codeeditorpanel');
        if (codeEditorPanel) {
            const img = codeEditorPanel.querySelector('img[src^="data:image"]');
            if (img && img.src && img.src.length > 100) {
                console.log('[Captcha] Found image in code editor panel');
                return img;
            }
        }

        const captchaInput = document.getElementById(CAPTCHA_INPUT_ID);
        if (captchaInput) {
            let container = captchaInput.parentElement;
            for (let i = 0; i < 5 && container; i++) {
                const img = container.querySelector('img[src^="data:image"]');
                if (img && img.src && img.src.length > 100) {
                    console.log(`[Captcha] Found image near input (depth: ${i})`);
                    return img;
                }
                container = container.parentElement;
            }
        }

        return null;
    }

    // Wait for captcha image with retry
    function waitForCaptchaImage() {
        return new Promise((resolve, reject) => {
            let attempts = 0;

            function tryFind() {
                attempts++;
                const img = findCaptchaImage();

                if (img) {
                    console.log(`[Captcha] ✓ Image found on attempt ${attempts}`);
                    resolve(img);
                    return;
                }

                if (attempts >= CAPTCHA_CONFIG.maxRetries) {
                    console.log(`[Captcha] Retry exhausted, trying MutationObserver...`);
                    waitForCaptchaWithObserver()
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                console.log(`[Captcha] Attempt ${attempts}/${CAPTCHA_CONFIG.maxRetries} - waiting...`);
                setTimeout(tryFind, CAPTCHA_CONFIG.retryDelay);
            }

            setTimeout(tryFind, CAPTCHA_CONFIG.initialDelay);
        });
    }

    function waitForCaptchaWithObserver() {
        return new Promise((resolve, reject) => {
            const img = findCaptchaImage();
            if (img) {
                resolve(img);
                return;
            }

            console.log('[Captcha] Setting up DOM observer...');

            let resolved = false;
            const observer = new MutationObserver(() => {
                if (resolved) return;

                const img = findCaptchaImage();
                if (img) {
                    resolved = true;
                    observer.disconnect();
                    console.log('[Captcha] ✓ Image detected by observer');
                    resolve(img);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['src', 'id']
            });

            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    observer.disconnect();
                    console.warn('[Captcha] ✗ Observer timeout - no image found');
                    reject(new Error('Captcha image not found'));
                }
            }, CAPTCHA_CONFIG.observerTimeout);
        });
    }

    function findBackButton() {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
            if (btn.textContent.includes('Back')) {
                return btn;
            }
        }
        const knownIds = ['j_id_63', 'j_id_62'];
        for (const id of knownIds) {
            const btn = document.getElementById(id);
            if (btn) return btn;
        }
        return null;
    }

    // ===== IMPROVED: Enhanced image processing for better OCR =====
    function processImageForOCR(image) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Scale up for better OCR accuracy
        const scale = 3;
        canvas.width = (image.width || image.naturalWidth || 200) * scale;
        canvas.height = (image.height || image.naturalHeight || 50) * scale;

        // Enable image smoothing for upscaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw scaled image
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // ===== ENHANCED PROCESSING =====
        // Convert to high contrast black/white with threshold
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Calculate luminance
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

            // Apply threshold (adjust if needed - lower = more black)
            const threshold = 140;
            const value = luminance < threshold ? 0 : 255;

            data[i] = value;     // R
            data[i + 1] = value; // G
            data[i + 2] = value; // B
            // Alpha stays the same
        }

        ctx.putImageData(imageData, 0, 0);

        return canvas.toDataURL();
    }

    // ===== IMPROVED: Alternative invert processing =====
    function invertColors(image) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const scale = 2;
        canvas.width = (image.width || image.naturalWidth || 200) * scale;
        canvas.height = (image.height || image.naturalHeight || 50) * scale;

        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "difference";
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        return canvas.toDataURL();
    }

    // ===== IMPROVED: Smarter math expression parser =====
    function solveCaptcha(text) {
        const username = SETTINGS.captchaUsername || "";
        let cleanedText = text;

        // Remove username patterns (handle OCR adding spaces)
        // Pattern: 12 digits followed by @ and letters (with possible spaces)
        cleanedText = cleanedText.replace(/\d{9,12}\s*@\s*[a-zA-Z]+/gi, "").trim();

        // Also remove any standalone 12-digit numbers (roll numbers)
        cleanedText = cleanedText.replace(/\b\d{9,12}\b/g, "").trim();

        // Also try removing the configured username (with flexible spacing)
        if (username) {
            // Create pattern that allows spaces around @
            const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const flexiblePattern = escapedUsername.replace(/@/g, '\\s*@\\s*');
            cleanedText = cleanedText.replace(new RegExp(flexiblePattern, "gi"), "").trim();
        }

        // Remove any remaining @ symbols and email-like patterns
        cleanedText = cleanedText.replace(/@[a-zA-Z]+/gi, "").trim();

        // Remove common OCR noise
        cleanedText = cleanedText.replace(/[\n\r\t]/g, " ").trim();

        // Remove multiple spaces
        cleanedText = cleanedText.replace(/\s+/g, " ").trim();

        console.log(`[Captcha] Cleaned text: "${cleanedText}"`);

        // ===== METHOD 1: Standard pattern with + sign =====
        // This should match "100+3", "5+6", "23+45" etc.
        let match = cleanedText.match(/(\d+)\s*\+\s*(\d+)/);
        if (match) {
            const num1 = parseInt(match[1], 10);
            const num2 = parseInt(match[2], 10);
            // Validate both numbers are reasonable (1-999 to handle 3-digit numbers)
            if (num1 >= 1 && num1 <= 999 && num2 >= 1 && num2 <= 999) {
                const result = num1 + num2;
                console.log(`[Captcha] Pattern 1 (X+Y): ${num1} + ${num2} = ${result}`);
                return result;
            }
        }

        // ===== METHOD 2: Handle 2-digit number that should be two single digits =====
        // e.g., "72" is really "7+2" (OCR missed the + sign)
        match = cleanedText.match(/^(\d{2})$/);
        if (match) {
            const numStr = match[1];
            const num1 = parseInt(numStr[0], 10);
            const num2 = parseInt(numStr[1], 10);
            // Both should be non-zero single digits
            if (num1 >= 1 && num1 <= 9 && num2 >= 1 && num2 <= 9) {
                const result = num1 + num2;
                console.log(`[Captcha] Pattern 2 (XY->X+Y): ${num1} + ${num2} = ${result}`);
                return result;
            }
        }

        // ===== METHOD 3: Handle merged 3-4 digits (1748 -> 17+48) =====
        // Look for 3-4 digit number that could be two numbers merged
        match = cleanedText.match(/(\d{3,4})/);
        if (match) {
            const numStr = match[1];
            console.log(`[Captcha] Found merged number: ${numStr}`);

            // Try splitting at different positions
            const results = [];

            for (let i = 1; i < numStr.length; i++) {
                const num1 = parseInt(numStr.substring(0, i), 10);
                const num2 = parseInt(numStr.substring(i), 10);

                // Valid split: both numbers should be reasonable (1-99)
                if (num1 >= 1 && num1 <= 99 && num2 >= 1 && num2 <= 99) {
                    const sum = num1 + num2;
                    results.push({ num1, num2, sum, split: i });
                    console.log(`[Captcha] Possible split: ${num1} + ${num2} = ${sum}`);
                }
            }

            // If only one valid split, use it
            if (results.length === 1) {
                console.log(`[Captcha] ✓ Using split: ${results[0].num1} + ${results[0].num2}`);
                return results[0].sum;
            }

            // If multiple splits possible, prefer middle split (most common for 4 digits)
            if (results.length > 1 && numStr.length === 4) {
                const middleSplit = results.find(r => r.split === 2);
                if (middleSplit) {
                    console.log(`[Captcha] ✓ Using middle split: ${middleSplit.num1} + ${middleSplit.num2}`);
                    return middleSplit.sum;
                }
            }

            // Fallback: use first valid split
            if (results.length > 0) {
                console.log(`[Captcha] ✓ Using first split: ${results[0].num1} + ${results[0].num2}`);
                return results[0].sum;
            }
        }

        // ===== METHOD 3: Two separate numbers on same line =====
        match = cleanedText.match(/(\d{1,2})\s+(\d{1,2})/);
        if (match) {
            const result = parseInt(match[1], 10) + parseInt(match[2], 10);
            console.log(`[Captcha] Pattern 3 (X Y): ${match[1]} + ${match[2]} = ${result}`);
            return result;
        }

        // ===== METHOD 4: Numbers with + as 4 or t or similar OCR errors =====
        match = cleanedText.match(/(\d{1,2})\s*[4tT\+xX\*]\s*(\d{1,2})/);
        if (match) {
            const result = parseInt(match[1], 10) + parseInt(match[2], 10);
            console.log(`[Captcha] Pattern 4 (OCR fix): ${match[1]} + ${match[2]} = ${result}`);
            return result;
        }

        return null;
    }

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

    // ===== CAPTCHA RETRY TRACKING (uses localStorage for persistence across refreshes) =====
    const CAPTCHA_MAX_AUTO_RETRIES = 3; // Stop auto-solving after this many FAILED attempts
    const CAPTCHA_STORAGE_KEY = 'skillrack_captcha_retries';
    const CAPTCHA_PENDING_KEY = 'skillrack_captcha_pending';
    const CAPTCHA_FAILED_KEY = 'skillrack_captcha_failed';

    function getCaptchaRetryCount() {
        return parseInt(localStorage.getItem(CAPTCHA_STORAGE_KEY) || '0', 10);
    }

    function incrementCaptchaRetry() {
        const count = getCaptchaRetryCount() + 1;
        localStorage.setItem(CAPTCHA_STORAGE_KEY, count.toString());
        console.log(`[Captcha] Retry count: ${count}/${CAPTCHA_MAX_AUTO_RETRIES}`);
        return count;
    }

    function resetCaptchaRetry() {
        localStorage.removeItem(CAPTCHA_STORAGE_KEY);
        localStorage.removeItem(CAPTCHA_PENDING_KEY);
        localStorage.removeItem(CAPTCHA_FAILED_KEY);
        console.log('[Captcha] Retry count reset');
    }

    // ===== IMPROVED: Multiple OCR attempts with different processing =====
    async function handleCaptcha() {
        if (!SETTINGS.enableCaptchaSolver) return;

        // Check if we've exceeded max auto-retries
        const retryCount = getCaptchaRetryCount();
        if (retryCount >= CAPTCHA_MAX_AUTO_RETRIES) {
            console.log(`[Captcha] ⚠️ Max auto-retries (${CAPTCHA_MAX_AUTO_RETRIES}) reached - stopping auto-solve`);
            handleIncorrectCaptcha();
            return;
        }

        if (typeof Tesseract === 'undefined') {
            console.log('[Captcha] Tesseract not loaded, skipping');
            return;
        }

        console.log('[Captcha] Starting captcha detection...');

        let image;
        try {
            image = await waitForCaptchaImage();
        } catch (e) {
            console.error('[Captcha] Failed to find captcha image:', e.message);
            return;
        }

        const textbox = document.getElementById(CAPTCHA_INPUT_ID);
        const button = document.getElementById(PROCEED_BTN_ID);

        if (!textbox || !button) {
            console.log("[Captcha] Input or button not found. Input:", !!textbox, "Button:", !!button);
            return;
        }

        console.log("[Captcha] All elements found! Processing OCR...");

        // Ensure image is fully loaded
        if (!image.complete) {
            await new Promise(resolve => {
                image.onload = resolve;
                setTimeout(resolve, 1000);
            });
        }

        // ===== USE ONE OCR METHOD PER RETRY (HIERARCHY) =====
        const processingMethods = [
            { name: "Enhanced", fn: () => processImageForOCR(image) },
            { name: "Inverted", fn: () => invertColors(image) },
            { name: "Original", fn: () => image.src }
        ];

        // Use retry count to pick which method to try (hierarchy: Enhanced → Inverted → Original)
        const retryIdx = getCaptchaRetryCount();
        const methodIdx = Math.min(retryIdx, processingMethods.length - 1);
        const method = processingMethods[methodIdx];

        console.log(`[Captcha] Using ${method.name} processing (attempt ${retryIdx + 1}/${CAPTCHA_MAX_AUTO_RETRIES})...`);

        try {
            const processedImg = method.fn();

            const { data: { text } } = await Tesseract.recognize(processedImg, "eng", {
                tessedit_char_whitelist: "0123456789+= ",
                tessedit_pageseg_mode: "7", // Single line
            });

            console.log(`[Captcha] OCR Result (${method.name}): "${text.trim()}"`);
            const result = solveCaptcha(text);

            if (result !== null) {
                // Validate result is reasonable (1-198 for sum of two 1-99 numbers)
                if (result < 1 || result > 198) {
                    console.log(`[Captcha] ⚠️ Result ${result} seems invalid`);
                    handleIncorrectCaptcha();
                    return;
                }

                console.log(`[Captcha] ✓ Solution found: ${result}`);
                console.log(`[Captcha] Submitting answer...`);

                // Mark that we're attempting (will be checked on next page load)
                localStorage.setItem(CAPTCHA_PENDING_KEY, 'true');

                textbox.value = result;
                setTimeout(() => safeButtonClick(button), 100);
                return;
            }

        } catch (error) {
            console.error(`[Captcha] ${method.name} OCR Error:`, error);
        }

        // Method failed to produce a valid result
        console.log(`[Captcha] ✗ ${method.name} OCR method failed`);
        handleIncorrectCaptcha();
    }


    function handleIncorrectCaptcha() {
        if (!SETTINGS.enableCaptchaSolver) return;

        // Mark that we've had an incorrect captcha attempt
        sessionStorage.setItem('captchaAttemptFailed', 'true');

        const retryCount = getCaptchaRetryCount();
        console.log(`[Captcha] ⚠️ Auto-solve failed after ${retryCount} attempts - requesting manual input`);

        const captext = prompt(`❌ Captcha auto-solve failed (${retryCount} attempts).\n\nPlease look at the captcha image and enter the math result manually:\n(e.g., if you see "7 + 2", enter "9")`);

        if (captext === null || captext.trim() === '') {
            console.log('[Captcha] User cancelled manual input');
            return;
        }

        const textbox = document.getElementById(CAPTCHA_INPUT_ID);
        const button = document.getElementById(PROCEED_BTN_ID);

        if (textbox && button) {
            // Reset retry count on manual input (user is solving it now)
            resetCaptchaRetry();

            textbox.value = captext.trim();
            setTimeout(() => safeButtonClick(button), 100);
        }
    }

    document.addEventListener("click", (event) => {
        if (SETTINGS.enableCaptchaSolver &&
            event.target.tagName === "SPAN" &&
            event.target.parentNode.tagName === "BUTTON" &&
            event.target.textContent === "Solve") {
            sessionStorage.setItem("Solvebtnid", event.target.parentNode.id);
            // Reset ALL failure tracking when user manually clicks Solve button
            resetCaptchaRetry();
        }
    }, false);

    // Check if captcha elements exist on the current page
    // Check if we're on the CODING page (has Run, Save buttons)
    function isOnCodingPageGlobal() {
        // Check for Run button
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
            const text = btn.textContent || '';
            if (text.includes('Run') || text.includes('Save') || text.includes('Submit')) {
                return true;
            }
        }
        // Check for code editor
        if (document.getElementById('txtCode') || document.querySelector('.ace_editor')) {
            return true;
        }
        return false;
    }

    function hasCaptchaElements() {
        // If we're on coding page with Run/Save buttons, we're NOT on captcha page
        if (isOnCodingPageGlobal()) {
            return false;
        }

        const captchaInput = document.getElementById(CAPTCHA_INPUT_ID);
        const proceedBtn = document.getElementById(PROCEED_BTN_ID);
        // Must have both input and proceed button visible
        return captchaInput && proceedBtn && (proceedBtn.offsetParent !== null || proceedBtn.style.display !== 'none');
    }

    function initCaptchaSolver() {
        if (!SETTINGS.enableCaptchaSolver) return;

        // Log current retry state
        const currentRetries = getCaptchaRetryCount();
        const hasPending = localStorage.getItem(CAPTCHA_PENDING_KEY);
        const hasFailed = localStorage.getItem(CAPTCHA_FAILED_KEY);
        console.log(`[Captcha] State: retries=${currentRetries}, pending=${!!hasPending}, failed=${!!hasFailed}`);

        // FIRST: Check if captcha elements exist on this page
        if (!hasCaptchaElements()) {
            console.log('[Captcha] No captcha on this page - skipping');

            // If we're on the coding page (AI solution page), ALWAYS reset captcha state
            // This ensures fresh start when user navigates back to solve another problem
            if (isOnCodingPageGlobal()) {
                console.log('[Captcha] On coding page - resetting all captcha state for fresh start');
                resetCaptchaRetry();
            } else if (hasPending) {
                // Clear pending flag if we successfully passed captcha (on other pages)
                console.log('[Captcha] ✓ Previous captcha was correct! Resetting retry count.');
                localStorage.removeItem(CAPTCHA_PENDING_KEY);
                resetCaptchaRetry();
            }
            return;
        }

        // We ARE on a captcha page
        console.log('[Captcha] Captcha page detected');

        // Check for Incorrect Captcha error on page
        const errors = document.getElementsByClassName(ERROR_CLASS);
        let hasIncorrectCaptchaError = false;
        for (let err of errors) {
            if (err.textContent && err.textContent.includes("Incorrect Captcha")) {
                hasIncorrectCaptchaError = true;
                console.log('[Captcha] Found "Incorrect Captcha" error message');
                break;
            }
        }

        // If we had a pending submit and we're STILL on captcha page, it failed
        // (Either explicit error OR page just reloaded with new captcha)
        if (hasPending) {
            localStorage.removeItem(CAPTCHA_PENDING_KEY);

            // Being back on captcha page after submit = failure
            const newCount = incrementCaptchaRetry();
            console.log(`[Captcha] ✗ Previous attempt FAILED - back on captcha page (${newCount}/${CAPTCHA_MAX_AUTO_RETRIES})`);

            // Check if we've exceeded max retries
            if (newCount >= CAPTCHA_MAX_AUTO_RETRIES) {
                console.log('[Captcha] ⚠️ Max retries reached - requesting manual input');
                localStorage.setItem(CAPTCHA_FAILED_KEY, 'true');
                handleIncorrectCaptcha();
                return;
            }
        }

        // Don't auto-solve if marked as failed
        if (hasFailed || localStorage.getItem(CAPTCHA_FAILED_KEY)) {
            console.log('[Captcha] Manual mode - not auto-solving (max retries exceeded)');
            // Show prompt for manual input
            handleIncorrectCaptcha();
            return;
        }

        if (sessionStorage.getItem("captchaFail")) {
            sessionStorage.removeItem("captchaFail");
            const oldBtnId = sessionStorage.getItem("Solvebtnid");
            if (oldBtnId) {
                const oldBtn = document.getElementById(oldBtnId);
                if (oldBtn) oldBtn.click();
            }
            return;
        }

        handleCaptcha();
    }

    // Initialize captcha solver only if script is enabled
    onScriptEnabled(() => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initCaptchaSolver);
        } else {
            setTimeout(initCaptchaSolver, 100);
        }

        window.addEventListener("load", function () {
            setTimeout(() => {
                // Clear the failure flag when page reloads after successful submission
                const errors = document.getElementsByClassName(ERROR_CLASS);
                let hasIncorrectCaptchaError = false;
                for (let err of errors) {
                    if (err.textContent.includes("Incorrect Captcha")) {
                        hasIncorrectCaptchaError = true;
                        break;
                    }
                }

                // Only clear flags if there's no error (meaning previous attempt was successful)
                if (!hasIncorrectCaptchaError) {
                    resetCaptchaRetry();
                }

                const img = findCaptchaImage();
                const textbox = document.getElementById(CAPTCHA_INPUT_ID);
                if (img && textbox && !textbox.value) {
                    console.log('[Captcha] Backup initialization triggered');
                    handleCaptcha();
                }
            }, 500);
        });

        console.log('Anti-cheat bypass script v5.0 loaded successfully');
        console.log('Settings:', SETTINGS);
    });

    // ============================================
    // 10. AI SOLUTION GENERATOR
    // Uses Gemini, OpenAI, OpenRouter, or G4F to generate code solutions
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
        const isCodeTrackPage = window.location.href.includes('codeprogram');

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

                // For code track pages, get pre-code and post-code (inline code)
                if (isCodeTrackPage) {
                    // Look for pre elements in the code editor panel
                    const codeEditorPanel = document.getElementById('codeeditorpanel');
                    if (codeEditorPanel) {
                        const preCodes = codeEditorPanel.querySelectorAll('pre');
                        preCodes.forEach((pre) => {
                            const text = pre.textContent.trim();
                            // Skip empty snippets
                            if (text.length > 5) {
                                // Check if this is post-code (in #j_id_8t or similar)
                                if (pre.closest('#j_id_8t, [id*="_8t"]')) {
                                    if (!postCode) {
                                        postCode = text;
                                    }
                                } else if (pre.closest('#j_id_8n, [id*="_8n"]')) {
                                    // This is pre-code
                                    if (!preCode) {
                                        preCode = text;
                                    }
                                } else if (!preCode) {
                                    // Fallback: first pre element is likely pre-code
                                    preCode = text;
                                }
                            }
                        });
                    }

                    // Also check for pre elements in the problem card itself
                    const cardPres = card.querySelectorAll('pre');
                    cardPres.forEach((pre) => {
                        const text = pre.textContent.trim();
                        if (text.length > 5 && !preCode) {
                            preCode = text;
                        }
                    });

                    // Fallback: Get all pres in codediv area
                    if (!preCode || !postCode) {
                        const codeDivPres = document.querySelectorAll('#codediv pre, #codediv .ui-outputpanel pre');
                        const presList = Array.from(codeDivPres);
                        if (presList.length >= 1 && !preCode) preCode = presList[0].textContent.trim();
                        if (presList.length >= 2 && !postCode) postCode = presList[presList.length - 1].textContent.trim();
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
                    if (SETTINGS.includePrePostCode) {
                        if (preCode) {
                            fullDescription += `\nPre-written code (DO NOT include this, it's already provided):\n\`\`\`\n${preCode}\n\`\`\`\n`;
                        }
                        if (postCode) {
                            fullDescription += `\nPost-code that will run after your solution (DO NOT include this):\n\`\`\`\n${postCode}\n\`\`\`\n`;
                        }
                        fullDescription += `\nIMPORTANT: Write ONLY the middle part of the code. The pre-code and post-code are already provided by the system.`;
                    }
                } else if (isCodeTrackPage && (preCode || postCode)) {
                    // For code track with inline code (pre-code and/or post-code)
                    fullDescription = `Task: ${description}\n`;
                    if (SETTINGS.includePrePostCode) {
                        if (preCode) {
                            fullDescription += `\nPre-written code (DO NOT include this, it's already provided):\n\`\`\`\n${preCode}\n\`\`\`\n`;
                        }
                        if (postCode) {
                            fullDescription += `\nPost-code that will run after your solution (DO NOT include this):\n\`\`\`\n${postCode}\n\`\`\`\n`;
                        }
                        fullDescription += `\nIMPORTANT: Write ONLY the middle part of the code. The pre-code and post-code are already provided by the system.`;
                    }
                }

                return {
                    title: problemTitle,
                    description: fullDescription.trim(),
                    isTutor: isTutorPage,
                    isCodeTrack: isCodeTrackPage,
                    preCode: preCode,
                    postCode: postCode
                };
            }
        }
        return { title: '', description: '', isTutor: false, isCodeTrack: false, preCode: '', postCode: '' };
    };

    // ========== Get error information from page ==========
    const getErrorInfo = () => {
        let errorInfo = {
            hasError: false,
            errorType: null,  // 'wrong_output', 'compilation_error', or 'runtime_error'
            input: '',
            expectedOutput: '',
            yourOutput: '',
            compilationError: '',
            currentCode: ''
        };

        // Get current code from editor
        if (window.txtCode && window.txtCode.getSession) {
            errorInfo.currentCode = window.txtCode.getSession().getValue();
        }

        // Check for "Incorrect Captcha" - ignore this
        const growlItems = document.querySelectorAll('.ui-growl-item');
        for (const item of growlItems) {
            if (item.textContent.includes('Incorrect Captcha')) {
                return errorInfo; // Not a code error
            }
        }

        // Check for error panel
        const errorPanel = document.getElementById('errormsg');
        if (!errorPanel) return errorInfo;

        const panelContent = document.getElementById('errormsg_content');
        if (!panelContent) return errorInfo;

        // Check if it's visible/has content
        const panelText = panelContent.textContent.trim();
        if (!panelText) return errorInfo;

        errorInfo.hasError = true;

        // Check for compilation error (has error messages like "error:", "undefined reference", etc.)
        const compilationIndicators = [
            'error:', 'undefined reference', 'multiple definition',
            'ld returned', 'collect2:', 'fatal error', 'syntax error',
            'expected', 'undeclared', 'implicit declaration'
        ];

        // Check for runtime errors
        const runtimeIndicators = [
            'segmentation fault', 'core dumped', 'bus error', 'floating point exception',
            'abort', 'timeout', 'time limit exceeded', 'memory limit', 'stack overflow',
            'runtime error', 'killed', 'signal'
        ];

        const panelTextLower = panelText.toLowerCase();
        const isCompilationError = compilationIndicators.some(indicator =>
            panelTextLower.includes(indicator.toLowerCase())
        );

        const isRuntimeError = runtimeIndicators.some(indicator =>
            panelTextLower.includes(indicator.toLowerCase())
        );

        if (isCompilationError) {
            errorInfo.errorType = 'compilation_error';
            // Get the compilation error text
            const errorDiv = panelContent.querySelector('div[style*="word-wrap"]');
            if (errorDiv) {
                errorInfo.compilationError = errorDiv.textContent.replace(/\s+/g, ' ').trim();
            } else {
                errorInfo.compilationError = panelText;
            }
        } else if (isRuntimeError) {
            errorInfo.errorType = 'runtime_error';
            // Extract Input, Expected Output, Your Output (runtime error shows these)
            const cards = panelContent.querySelectorAll('.ui-card-content');
            const labels = panelContent.querySelectorAll('.ui.label');

            labels.forEach((label, index) => {
                const labelText = label.textContent.toLowerCase();
                const cardContent = cards[index]?.textContent.trim() || '';

                if (labelText.includes('input')) {
                    errorInfo.input = cardContent;
                } else if (labelText.includes('expected')) {
                    errorInfo.expectedOutput = cardContent;
                } else if (labelText.includes('your program') || labelText.includes('your output')) {
                    errorInfo.yourOutput = cardContent;
                }
            });
        } else {
            errorInfo.errorType = 'wrong_output';

            // Extract Input, Expected Output, Your Output
            const cards = panelContent.querySelectorAll('.ui-card-content');
            const labels = panelContent.querySelectorAll('.ui.label');

            labels.forEach((label, index) => {
                const labelText = label.textContent.toLowerCase();
                const cardContent = cards[index]?.textContent.trim() || '';

                if (labelText.includes('input')) {
                    errorInfo.input = cardContent;
                } else if (labelText.includes('expected')) {
                    errorInfo.expectedOutput = cardContent;
                } else if (labelText.includes('your program') || labelText.includes('your output')) {
                    errorInfo.yourOutput = cardContent;
                }
            });
        }

        return errorInfo;
    };

    const generateWithGemini = async (prompt) => {
        const apiKey = SETTINGS.geminiApiKey;
        if (!apiKey) {
            throw new Error('Gemini API key not configured. Please add it in settings.');
        }

        const model = SETTINGS.geminiModel || 'gemini-2.5-flash';
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: SETTINGS.aiTemperature,
                    maxOutputTokens: 8192,
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
                model: SETTINGS.openaiModel || 'gpt-4o-mini',
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: SETTINGS.aiTemperature,
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
                temperature: SETTINGS.aiTemperature,
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

    const stripComments = (code, language) => {
        let result = code;
        const lang = language.toLowerCase();

        if (lang === 'python') {
            result = result.replace(/#.*$/gm, '');
            result = result.replace(/'''[\s\S]*?'''/g, '');
            result = result.replace(/"""[\s\S]*?"""/g, '');
        } else if (lang === 'c' || lang === 'c++' || lang === 'c++23' || lang === 'java') {
            result = result.replace(/\/\/.*$/gm, '');
            result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        }

        result = result.replace(/^\s*[\r\n]/gm, '\n');
        result = result.replace(/\n{3,}/g, '\n\n');
        result = result.trim();

        return result;
    };

    const extractCode = (response, language) => {
        let normalizedResponse = typeof response === 'string' ? response : String(response || '');
        
        // Handle JSON responses (strip JSON wrapper if present)
        try {
            // Check if response looks like JSON
            if (normalizedResponse.trim().startsWith('{') && normalizedResponse.includes('"content"')) {
                const jsonData = JSON.parse(normalizedResponse);
                // Try to extract content from various JSON structures
                if (jsonData.choices && jsonData.choices[0]?.message?.content) {
                    normalizedResponse = jsonData.choices[0].message.content;
                } else if (jsonData.content) {
                    normalizedResponse = jsonData.content;
                } else if (jsonData.text) {
                    normalizedResponse = jsonData.text;
                }
            }
        } catch (e) {
            // Not JSON, continue with string processing
        }

        let code = '';
        
        // Match code blocks with language specifiers (c++, ++23, cpp, c, python, etc.)
        // Pattern: ```languageName followed by code and closing ```
        const codeBlockRegex = /```(?:[a-zA-Z0-9_+-]*)?\n?([\s\S]*?)```/g;
        const matches = [...normalizedResponse.matchAll(codeBlockRegex)];

        if (matches.length > 0) {
            // Find the longest match (most likely the actual code)
            let bestMatch = matches[0][1].trim();
            for (const match of matches) {
                const trimmed = match[1].trim();
                if (trimmed.length > bestMatch.length) {
                    bestMatch = trimmed;
                }
            }
            code = bestMatch;
        } else {
            // Fallback: look for unclosed code block
            const openBlockRegex = /```(?:[a-zA-Z0-9_+-]*)?\n?([\s\S]+?)(?=```|$)/;
            const openMatch = normalizedResponse.match(openBlockRegex);
            if (openMatch) {
                code = openMatch[1].trim();
            } else {
                // Last resort: use entire response and clean it
                code = normalizedResponse.trim();
                // Remove common explanatory prefixes
                const prefixes = ['Here is', 'Here\'s', 'The fixed code', 'The solution', 'Fixed code:', 'Solution:', 'Here\'s the code:', 'Here is the code:'];
                for (const prefix of prefixes) {
                    const lowerCode = code.toLowerCase();
                    if (lowerCode.startsWith(prefix.toLowerCase())) {
                        code = code.substring(prefix.length).trim();
                        break;
                    }
                }
            }
        }

        // CRITICAL FIX: Remove language specifiers that might have leaked in
        // Remove lines that only contain language tags like "c++", "++23", "cpp", etc.
        const lines = code.split('\n');
        code = lines.filter(line => {
            const trimmed = line.trim();
            // Skip lines that are ONLY language tags (case-insensitive, support c++, cpp, cpp23, ++, ++23, etc.)
            // Language tags: c, c++, cpp, cpp23, ++, ++23, python, java, javascript, typescript, etc.
            if (/^(c\+\+|cpp\d*|\+\+\d*|[a-z]+\d*|[a-z]+\+\+)$/i.test(trimmed)) {
                return false; // This is likely a language tag, skip it
            }
            return true;
        }).join('\n');

        // Remove any backticks that leaked in (at line start/end only)
        code = code.replace(/^```[a-zA-Z0-9+]*\s*/gm, '');
        code = code.replace(/\s*```$/gm, '');
        
        // Also remove any standalone language tags on their own lines (more aggressive)
        code = code.split('\n').filter(line => {
            const trimmed = line.trim();
            return !(/^(c\+\+|cpp\d*|\+\+\d*|[a-z]+\d*|[a-z]+\+\+)$/i.test(trimmed));
        }).join('\n');
        
        code = code.trim();

        code = stripComments(code, language);

        return code;
    };

    function getAiButtonMarkup(label = 'AI Solution') {
        return `<span style="display:inline-flex;align-items:center;gap:8px;"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="display:block;fill:currentColor;"><path d="M12 2a3 3 0 0 1 3 3v1.06a6.002 6.002 0 0 1 3.94 3.94H20a3 3 0 1 1 0 6h-1.06a6.002 6.002 0 0 1-3.94 3.94V21a3 3 0 1 1-6 0v-1.06A6.002 6.002 0 0 1 5.06 16H4a3 3 0 1 1 0-6h1.06A6.002 6.002 0 0 1 9 6.06V5a3 3 0 0 1 3-3Zm0 6a4 4 0 1 0 0 8a4 4 0 0 0 0-8Z"></path></svg><span>${label}</span></span>`;
    }

    let isAiGenerationInProgress = false;

    // ========== UTILITY: Compare code similarity ==========
    const calculateCodeSimilarity = (code1, code2) => {
        // Simple similarity check: compare normalized code strings
        const normalize = (code) => {
            return code
                .replace(/\s+/g, ' ')
                .replace(/[{}();]/g, '')
                .toLowerCase()
                .trim();
        };
        
        const norm1 = normalize(code1);
        const norm2 = normalize(code2);
        
        if (norm1 === norm2) return 1.0; // Identical
        
        // Simple character-based similarity
        const minLen = Math.min(norm1.length, norm2.length);
        let matches = 0;
        for (let i = 0; i < minLen; i++) {
            if (norm1[i] === norm2[i]) matches++;
        }
        
        return matches / Math.max(norm1.length, norm2.length);
    };

    // ==========  generateAISolution FUNCTION ==========
    const generateAISolution = async () => {
        if (!SETTINGS.enableAISolver) return;
        if (isAiGenerationInProgress) {
            console.log('[AI] Generation already in progress - ignoring duplicate trigger');
            return;
        }
        isAiGenerationInProgress = true;

        const language = getSelectedLanguage();
        const problem = getProblemDescription();
        const errorInfo = getErrorInfo();  // NEW: Check for errors

        if (!problem.title && !problem.description && !errorInfo.hasError) {
            alert('Could not find problem description on this page.');
            isAiGenerationInProgress = false;
            return;
        }

        const customSystemPrompt = SETTINGS.aiSystemPrompt ? SETTINGS.aiSystemPrompt.trim() + '\n\n' : '';
        let prompt;

        // Helper: build full code by wrapping middle code with pre/post code
        const hasPrePost = problem.preCode || problem.postCode;
        const wrapWithPrePost = (middleCode) => {
            // If includePrePostCode is disabled, include the pre/post code in the AI request
            if (!SETTINGS.includePrePostCode && hasPrePost) {
                let full = '';
                if (problem.preCode) full += problem.preCode + '\n';
                full += middleCode;
                if (problem.postCode) full += '\n' + problem.postCode;
                return full;
            }
            // If includePrePostCode is enabled, only send middle code to AI
            return middleCode;
        };

        // ========== Error fix mode ==========
        if (errorInfo.hasError && errorInfo.currentCode) {
            // When includePrePostCode is off, wrap current code with pre/post
            const effectiveCode = wrapWithPrePost(errorInfo.currentCode);

            if (errorInfo.errorType === 'compilation_error') {
                prompt = customSystemPrompt + `You are a senior competitive programmer solving a SkillRack problem.
Fix the ${language} compilation error below. Output ONLY the corrected code, no explanations or comments.

PROBLEM: ${problem.title}
${problem.description}

BUGGY CODE:
\`\`\`${language.toLowerCase()}
${effectiveCode}
\`\`\`

COMPILATION ERROR:
${errorInfo.compilationError}

FIXING RULES:
1. Fix ONLY the syntax/type/declaration error causing compilation failure.
2. Do NOT change the program logic.
3. Do NOT add extra output or debug statements.
${language.toLowerCase() === 'python' ? '4. If a function is defined (e.g. solve/main), make sure it is CALLED at the very end.' : ''}

\`\`\`${language.toLowerCase()}`;

            } else if (errorInfo.errorType === 'runtime_error') {
                prompt = customSystemPrompt + `You are a senior competitive programmer solving a SkillRack problem.
Fix the ${language} runtime error below. Output ONLY the corrected code, no explanations or comments.

PROBLEM: ${problem.title}
${problem.description}

BUGGY CODE:
\`\`\`${language.toLowerCase()}
${effectiveCode}
\`\`\`

RUNTIME ERROR CONTEXT:
Input:    ${errorInfo.input}
Expected: ${errorInfo.expectedOutput}
Got:      ${errorInfo.yourOutput || '(CRASH / no output)'}

FIXING STEPS:
1. Trace through the code with the given input.
2. Identify the crash source: out-of-bounds access, null pointer, division by zero, stack overflow, etc.
3. Fix the root cause without changing the correct parts of the logic.

\`\`\`${language.toLowerCase()}`;

            } else if (errorInfo.errorType === 'wrong_output') {
                const isEmptyOutput = !errorInfo.yourOutput || errorInfo.yourOutput.trim() === '' || errorInfo.yourOutput.trim() === '&nbsp;';

                prompt = customSystemPrompt + `You are a senior competitive programmer solving a SkillRack problem.
The program produces wrong output. Rewrite it so it passes all test cases.
Output ONLY the corrected code, no explanations or comments.

PROBLEM: ${problem.title}
${problem.description}

CURRENT (WRONG) CODE:
\`\`\`${language.toLowerCase()}
${effectiveCode}
\`\`\`

FAILING TEST CASE:
Input:    ${errorInfo.input}
Expected: ${errorInfo.expectedOutput}
Got:      ${errorInfo.yourOutput || '(EMPTY)'}
${isEmptyOutput && language.toLowerCase() === 'python' ? '\nNOTE: Empty output likely means a function is defined but not called. Add a call at the END of the file.' : ''}

DEBUGGING STRATEGY (follow in order):
1. TRUST THE EXPECTED OUTPUT — it is the ground truth. If the problem description seems to say otherwise, ignore the description.
2. Manually trace the current code with the given Input. Confirm it really produces the wrong output.
3. Identify the bug category:
   a. Wrong formula or arithmetic?
   b. Wrong variable mapping / input order? (e.g., variables A,B,C,D assigned in wrong order)
   c. Missing step or off-by-one?
   d. Wrong operator or sign?
   e. Pattern/series problem (reverse-engineer from expected output)?
4. Fix the identified bug. Do NOT restructure the whole program unnecessarily.
5. Verify mentally with the given test case before outputting.

\`\`\`${language.toLowerCase()}`;
            }
        }
        // ========== Normal mode (no error) ==========
        else if (problem.isTutor) {
            if (SETTINGS.includePrePostCode) {
                prompt = customSystemPrompt + `You are a senior competitive programmer solving a SkillRack tutor problem.
Write ONLY the missing middle section of ${language} code. No imports, no main function, no comments.

PROBLEM: ${problem.title}
${problem.description}

RULES FOR TUTOR MODE:
1. Variables declared in pre-code are already available — use them directly.
2. Variables required by post-code must be computed and assigned.
3. Write ONLY the middle logic; pre-code and post-code are already provided by the system.
4. If the description conflicts with the sample output shown, trust the sample output.

\`\`\`${language.toLowerCase()}`;
            } else {
                prompt = customSystemPrompt + `You are a senior competitive programmer solving a SkillRack problem.
Write a complete, correct ${language} program that passes ALL test cases.
Output ONLY the code, no explanations or comments.

PROBLEM: ${problem.title}
${problem.description}

SOLVING APPROACH:
1. Carefully read all sample inputs and expected outputs given in the problem.
2. Reverse-engineer the formula or pattern from the examples if the description is unclear.
3. Handle all edge cases visible in the samples.
4. Trust sample output over problem description if they conflict.

\`\`\`${language.toLowerCase()}`;
            }
        } else if (problem.isCodeTrack && hasPrePost) {
            if (SETTINGS.includePrePostCode) {
                prompt = customSystemPrompt + `You are a senior competitive programmer solving a SkillRack code-track problem.
Write ONLY the missing middle ${language} code. No headers, no main declaration, no comments.

PROBLEM: ${problem.title}
${problem.description}

RULES FOR CODE-TRACK MODE:
1. Your code will be inserted DIRECTLY into the gap between pre-code and post-code. It must connect perfectly.
2. Pre-code and post-code are already provided by the system — do NOT repeat them.
3. If the post-code starts with a brace '{' or an 'else', your middle code must provide the corresponding 'if' or statement.
4. Use variables/functions from pre-code. Produce variables/results required by post-code.
5. Trust sample output over problem description if they conflict.

\`\`\`${language.toLowerCase()}`;
            } else {
                const ioHint = (language === 'C++' || language === 'C++23') ? 'Use getline() for strings with spaces.' :
                    (language === 'C') ? 'Use fgets() for strings with spaces.' : '';

                prompt = customSystemPrompt + `You are a senior competitive programmer solving a SkillRack problem.
Write a complete, correct ${language} program that passes ALL test cases.
Output ONLY the code, no explanations or comments.

PROBLEM: ${problem.title}
${problem.description}
${ioHint ? '\nI/O HINT: ' + ioHint : ''}

SOLVING APPROACH:
1. Carefully read all sample inputs and expected outputs given in the problem.
2. Reverse-engineer the formula or pattern from the examples if the description is unclear.
3. Handle all edge cases visible in the samples.
4. Trust sample output over problem description if they conflict.

\`\`\`${language.toLowerCase()}`;
            }
        } else if (problem.isCodeTrack) {
            const ioHint = (language === 'C++' || language === 'C++23') ? 'Use getline() for strings with spaces.' :
                (language === 'C') ? 'Use fgets() for strings with spaces.' : '';

            prompt = customSystemPrompt + `You are a senior competitive programmer solving a SkillRack problem.
Write a complete, correct ${language} program that passes ALL test cases.
Output ONLY the code, no explanations or comments.

PROBLEM: ${problem.title}
${problem.description}
${ioHint ? '\nI/O HINT: ' + ioHint : ''}

SOLVING APPROACH:
1. Carefully read all sample inputs and expected outputs given in the problem.
2. Reverse-engineer the formula or pattern from the examples if the description is unclear.
3. Handle all edge cases visible in the samples.
4. Trust sample output over problem description if they conflict.

\`\`\`${language.toLowerCase()}`;
        } else {
            const ioHint = (language === 'C++' || language === 'C++23') ? 'Use getline() for strings with spaces.' :
                (language === 'C') ? 'Use fgets() for strings with spaces.' : '';

            prompt = customSystemPrompt + `You are a senior competitive programmer solving a SkillRack problem.
Write a complete, correct ${language} program that passes ALL test cases.
Output ONLY the code, no explanations or comments.
${language === 'Java' ? '\nClass name must be: Hello' : ''}

PROBLEM: ${problem.title}
${problem.description}
${ioHint ? '\nI/O HINT: ' + ioHint : ''}

SOLVING APPROACH:
1. Carefully read all sample inputs and expected outputs given in the problem.
2. Reverse-engineer the formula or pattern from the examples if the description is unclear.
3. Pay attention to input variable order — SkillRack problems sometimes swap variable meanings.
4. Handle all edge cases visible in the samples.
5. Trust sample output over problem description if they conflict.

\`\`\`${language.toLowerCase()}`;
        }

        // Show loading indicator
        const aiBtn = document.getElementById('ai-solution-btn');
        if (aiBtn) {
            aiBtn.disabled = true;
            aiBtn.innerHTML = errorInfo.hasError ? 'Fixing...' : 'Generating...';
            aiBtn.style.opacity = '0.7';
        }

        try {
            let response;

            switch (SETTINGS.aiProvider) {
                case 'gemini':
                    response = await generateWithGemini(prompt);
                    break;
                case 'openrouter':
                    response = await generateWithOpenRouter(prompt);
                    break;
                case 'openai':
                    response = await generateWithOpenAI(prompt);
                    break;
                case 'g4f':
                    response = await generateWithG4F(prompt);
                    break;
                case 'duckduckgo':
                    response = await generateWithDuckDuckGo(prompt);
                    break;
                case 'yuppbridge':
                    response = await generateWithYuppBridge(prompt);
                    break;
                default:
                    throw new Error(`Unknown AI provider: ${SETTINGS.aiProvider}`);
            }

            const code = extractCode(response, language);

            // Validate code is not empty
            if (!code || code.trim().length < 10) {
                alert('Failed to extract valid code from AI response. Please try again.');
                return;
            }

            // Check if code is similar to existing code
            let existingCode = '';
            if (window.txtCode && window.txtCode.getSession) {
                existingCode = window.txtCode.getSession().getValue();
            }

            if (existingCode && calculateCodeSimilarity(code, existingCode) > 0.95) {
                console.warn('Generated code is too similar to existing code, skipping insertion');
                alert('⚠️ Generated code is identical or too similar to the existing code. AI returned the same solution. Try again or modify your prompt.');
                return;
            }

            if (code && window.txtCode) {
                // Insert the code into ACE editor
                window.txtCode.getSession().setValue(code);

                // Sync with hidden textarea
                const $ = window.jQuery || window.$;
                if ($ && $("#txtCode").length) {
                    $("#txtCode").val(code);
                }

                console.log(errorInfo.hasError ? 'AI fix applied successfully' : 'AI solution inserted successfully');
            } else {
                alert('Failed to insert code into editor. Please try again.');
            }
        } catch (error) {
            console.error('AI generation error:', error);
            alert('Error: ' + error.message);
        } finally {
            isAiGenerationInProgress = false;
            // Reset button
            if (aiBtn) {
                aiBtn.disabled = false;
                aiBtn.innerHTML = getAiButtonMarkup('AI Solution');
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
            aiBtn.innerHTML = getAiButtonMarkup('AI Solution');
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

    // Initialize AI button when page is ready AND script is enabled
    onScriptEnabled(() => {
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
    });

    // ============================================
    // 11. AUTO SOLVER - Automatic problem solving
    // ============================================

    const AutoSolver = (function () {
        'use strict';

        const CONFIG = {
            maxRetries: 3,
            genTimeout: 120000,    // 2 minutes max for AI generation
            runTimeout: 30000,    // 30 seconds max for code execution
            resultTimeout: 15000, // 15 seconds to wait for result
            delayAfterGen: 500,   // Delay after generation before run
            delayBetweenRetries: 1000,
            delayBeforeNext: 1500
        };

        const STOP_PERSIST_KEY = 'autosolver_stopped';

        let isRunning = false;
        let solveInvocationActive = false;
        let shouldStop = false;
        let currentRetries = 0;
        let statusIndicator = null;

        // Load persistent stop state
        function loadStopState() {
            try {
                return localStorage.getItem(STOP_PERSIST_KEY) === 'true';
            } catch (e) {
                return false;
            }
        }

        // Save persistent stop state
        function saveStopState(stopped) {
            try {
                if (stopped) {
                    localStorage.setItem(STOP_PERSIST_KEY, 'true');
                } else {
                    localStorage.removeItem(STOP_PERSIST_KEY);
                }
            } catch (e) { }
        }

        // Initialize stop state from localStorage
        shouldStop = loadStopState();

        // Helper: Sleep function (checks shouldStop)
        const sleep = ms => new Promise(r => {
            const checkInterval = setInterval(() => {
                if (shouldStop) {
                    clearInterval(checkInterval);
                    r();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(checkInterval);
                r();
            }, ms);
        });

        // Helper: Check if we should abort
        function checkStop() {
            if (shouldStop) {
                throw new Error('STOPPED_BY_USER');
            }
        }

        // Helper: Wait for element to appear
        async function waitFor(selector, timeout = 15000) {
            const start = Date.now();
            while (Date.now() - start < timeout) {
                if (shouldStop) return null;
                const el = document.querySelector(selector);
                if (el && el.offsetParent !== null) return el;
                await sleep(50);
            }
            return null;
        }

        // Helper: Force click with fallback
        function forceClick(el, name) {
            if (!el) {
                console.warn(`[AutoSolver] ${name} not found`);
                return false;
            }
            try {
                el.click();
                console.log(`[AutoSolver] Clicked: ${name}`);
                return true;
            } catch (e) {
                console.error(`[AutoSolver] Click failed: ${name}`, e);
                return false;
            }
        }

        // Helper: Check if element contains text
        function hasText(selector, text) {
            const el = document.querySelector(selector);
            return el && el.innerText && el.innerText.toLowerCase().includes(text.toLowerCase());
        }

        // Helper: Click Proceed Next button robustly (similar to AI Solution button)
        async function clickProceedNext() {
            updateStatus('Looking for Proceed Next...', 'info');

            // Method 1: Try by ID (j_id_9i)
            let nextBtn = document.querySelector('#j_id_9i');

            // Method 2: Try by partial ID match
            if (!nextBtn) {
                nextBtn = document.querySelector('button[id*="_9i"]');
            }

            // Method 3: Find by button text "Proceed Next"
            if (!nextBtn) {
                const buttons = document.querySelectorAll('button');
                for (const btn of buttons) {
                    const span = btn.querySelector('span.ui-button-text');
                    if (span && span.textContent.includes('Proceed Next')) {
                        nextBtn = btn;
                        break;
                    }
                    if (btn.textContent.includes('Proceed Next')) {
                        nextBtn = btn;
                        break;
                    }
                }
            }

            if (!nextBtn) {
                console.log('[AutoSolver] Proceed Next button not found');
                updateStatus('Proceed Next not found', 'warning');
                return false;
            }

            console.log('[AutoSolver] Found Proceed Next button:', nextBtn.id || nextBtn.className);
            updateStatus('Clicking Proceed Next...', 'info');

            // Single click to avoid duplicate submissions
            try {
                nextBtn.click();
                console.log('[AutoSolver] Clicked: Proceed Next');
                updateStatus('Moving to next...', 'info');

            } catch (e) {
                console.error('[AutoSolver] Click failed: Proceed Next', e);
                return false;
            }

            // Wait for page to change, then trigger auto-solve again
            await sleep(3000);
            if (!shouldStop) {
                setTimeout(() => solve(), 2000);
            }
            return true;
        }

        // Helper: Update status indicator
        function updateStatus(message, type = 'info') {
            console.log(`[AutoSolver] ${message}`);
            if (statusIndicator) {
                const colors = {
                    info: '#2196F3',
                    success: '#4CAF50',
                    warning: '#FF9800',
                    error: '#f44336'
                };
                statusIndicator.style.background = colors[type] || colors.info;
                if (statusText) {
                    statusText.textContent = `Auto Solver: ${message}`;
                }
            }
        }

        // Create floating status indicator with stop button
        let stopButton = null;
        let statusText = null;

        function createStatusIndicator() {
            if (statusIndicator) return;

            statusIndicator = document.createElement('div');
            statusIndicator.id = 'auto-solver-status';
            statusIndicator.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 999999;
                padding: 10px 16px;
                background: #2196F3;
                color: white;
                border-radius: 8px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                display: none;
                align-items: center;
                gap: 10px;
            `;

            // Status text span
            statusText = document.createElement('span');
            statusText.id = 'auto-solver-text';
            statusText.textContent = 'Auto Solver: Initializing...';
            statusIndicator.appendChild(statusText);

            // Stop button
            stopButton = document.createElement('button');
            stopButton.id = 'auto-solver-stop';
            stopButton.textContent = 'STOP';
            stopButton.style.cssText = `
                background: #f44336;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 4px 10px;
                font-size: 11px;
                font-weight: bold;
                cursor: pointer;
                margin-left: 8px;
                transition: background 0.2s;
            `;
            stopButton.addEventListener('mouseover', () => {
                stopButton.style.background = '#d32f2f';
            });
            stopButton.addEventListener('mouseout', () => {
                stopButton.style.background = '#f44336';
            });
            stopButton.addEventListener('click', () => {
                stop();
                updateStatus('Stopped by user', 'warning');
                setTimeout(hideStatus, 2000);
            });
            statusIndicator.appendChild(stopButton);

            // Wait for body to exist before appending
            if (document.body) {
                document.body.appendChild(statusIndicator);
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    document.body.appendChild(statusIndicator);
                });
            }
        }

        function showStatus() {
            if (statusIndicator) statusIndicator.style.display = 'flex';
        }

        function hideStatus() {
            if (statusIndicator) statusIndicator.style.display = 'none';
        }

        // Wait for AI generation to complete
        async function waitForAIGeneration() {
            const start = Date.now();
            updateStatus('Generating solution...', 'info');

            while (Date.now() - start < CONFIG.genTimeout) {
                // Check for stop request
                if (shouldStop) return false;

                const btn = document.querySelector('#ai-solution-btn');

                if (btn) {
                    const text = btn.innerText || btn.textContent || '';
                    const isDisabled = btn.disabled || btn.hasAttribute('disabled');
                    const opacity = parseFloat(btn.style.opacity || '1');

                    // Check if still generating
                    if (text.includes('Generating') || text.includes('Fixing') ||
                        isDisabled || opacity < 1) {
                        await sleep(200);
                        if (shouldStop) return false;
                        continue;
                    }

                    // Generation complete
                    return true;
                }
                await sleep(200);
                if (shouldStop) return false;
            }

            updateStatus('Generation timeout!', 'warning');
            return false;
        }

        // Wait for execution result
        async function waitForResult() {
            const start = Date.now();
            updateStatus('Waiting for result...', 'info');

            while (Date.now() - start < CONFIG.resultTimeout) {
                // Check for stop request
                if (shouldStop) return 'stopped';

                // Check for success
                if (hasText('#successmsg', 'passed') || hasText('.ui-panel-title', 'passed')) {
                    return 'success';
                }

                // Check for failure
                if (hasText('#errormsg', 'did not pass') || hasText('#errormsg', 'execution')) {
                    return 'failed';
                }

                // Check for compilation error
                if (hasText('#errormsg', 'error:') || hasText('#errormsg', 'compilation')) {
                    return 'compilation_error';
                }

                // Check for runtime error
                if (hasText('#errormsg', 'segmentation') || hasText('#errormsg', 'runtime')) {
                    return 'runtime_error';
                }

                await sleep(100);
                if (shouldStop) return 'stopped';
            }

            return 'timeout';
        }

        // Check if we're on a problem page URL
        function isOnProblemPageURL() {
            const href = window.location.href;
            if (href.includes('codeprogram') || href.includes('tutorprogram')) return true;
            return hasCodeEditor() || hasCaptcha() || isOnProblemListPage();
        }

        // Check if we're on the problem LIST page (shows "Solve" buttons)
        function isOnProblemListPage() {
            // Look for datagrid with Solve buttons
            const solveButtons = document.querySelectorAll('button span.ui-button-text');
            for (const span of solveButtons) {
                if (span.textContent === 'Solve') {
                    return true;
                }
            }
            return false;
        }

        // Check if we're on the actual CODING page (with code editor)
        function isOnCodingPage() {
            return hasCodeEditor() || hasCaptcha();
        }

        // Check if there's a captcha to solve first (but NOT if we're already on coding page)
        function hasCaptcha() {
            const captchaInput = document.getElementById('capval');
            const proceedBtn = document.getElementById('proceedbtn');
            if (!captchaInput || !proceedBtn) return false;
            const isVisible = (el) => el.offsetParent !== null && window.getComputedStyle(el).display !== 'none';
            return isVisible(captchaInput) && isVisible(proceedBtn);
        }

        // Check if code editor is visible
        function hasCodeEditor() {
            return document.getElementById('txtCode') !== null ||
                document.querySelector('.ace_editor') !== null;
        }

        // Main auto-solve function
        async function solve() {
            if (!SETTINGS.enableAutoSolver || !SETTINGS.enableAISolver) {
                console.log('[AutoSolver] Disabled in settings');
                return false;
            }

            // Check for persistent stop state
            if (loadStopState()) {
                console.log('[AutoSolver] Persistent stop active - not solving');
                return false;
            }

            // Reset stop flag when starting a new solve
            shouldStop = false;
            saveStopState(false);

            if (isRunning || solveInvocationActive) {
                console.log('[AutoSolver] Already running');
                return false;
            }
            solveInvocationActive = true;

            if (!isOnProblemPageURL()) {
                console.log('[AutoSolver] Not on a problem page URL');
                solveInvocationActive = false;
                return false;
            }

            // Create and show status indicator early
            createStatusIndicator();
            showStatus();
            updateStatus('Analyzing page...', 'info');

            // Check if we're on problem LIST page (need to click Solve first)
            if (isOnProblemListPage() && !isOnCodingPage()) {
                updateStatus('Finding Solve button...', 'info');
                console.log('[AutoSolver] On problem list page - looking for Solve button...');
                const solveButtons = document.querySelectorAll('button');
                for (const btn of solveButtons) {
                    if (shouldStop) {
                        updateStatus('Stopped', 'warning');
                        setTimeout(hideStatus, 2000);
                        solveInvocationActive = false;
                        return false;
                    }
                    const span = btn.querySelector('span.ui-button-text');
                    if (span && span.textContent === 'Solve') {
                        console.log('[AutoSolver] Found Solve button, clicking...');
                        updateStatus('Clicking Solve...', 'info');
                        forceClick(btn, 'Solve Problem');
                        // Wait for page transition, then re-check
                        await sleep(3000);
                        if (shouldStop) {
                            hideStatus();
                            solveInvocationActive = false;
                            return false;
                        }
                        hideStatus();
                        // Re-trigger solve after page loads
                        if (!shouldStop) {
                            setTimeout(() => solve(), 2000);
                        }
                        solveInvocationActive = false;
                        return true;
                    }
                }
                console.log('[AutoSolver] No Solve button found on list page');
                updateStatus('No Solve button found', 'warning');
                setTimeout(hideStatus, 3000);
                solveInvocationActive = false;
                return false;
            }

            // Wait for captcha to be solved first
            if (hasCaptcha()) {
                updateStatus('Waiting for captcha...', 'info');
                console.log('[AutoSolver] Captcha detected, waiting for it to be solved...');
                // Wait up to 60 seconds for captcha to be solved
                let waitTime = 0;
                const maxWait = 60000;
                while (hasCaptcha() && waitTime < maxWait && !shouldStop) {
                    await sleep(1000);
                    if (shouldStop) {
                        updateStatus('Stopped', 'warning');
                        setTimeout(hideStatus, 2000);
                        solveInvocationActive = false;
                        return false;
                    }
                    waitTime += 1000;
                    if (waitTime % 5000 === 0) {
                        updateStatus(`Captcha... (${waitTime / 1000}s)`, 'info');
                        console.log(`[AutoSolver] Still waiting for captcha... (${waitTime / 1000}s)`);
                    }
                }
                if (shouldStop) {
                    updateStatus('Stopped', 'warning');
                    setTimeout(hideStatus, 2000);
                    solveInvocationActive = false;
                    return false;
                }
                if (hasCaptcha()) {
                    console.log('[AutoSolver] Captcha still present after 60s, aborting');
                    updateStatus('Captcha timeout!', 'error');
                    setTimeout(hideStatus, 3000);
                    solveInvocationActive = false;
                    return false;
                }
                console.log('[AutoSolver] Captcha solved! Continuing...');
                updateStatus('Captcha solved!', 'success');
                await sleep(1000);
                if (shouldStop) {
                    updateStatus('Stopped', 'warning');
                    setTimeout(hideStatus, 2000);
                    solveInvocationActive = false;
                    return false;
                }
            }

            // Wait for code editor
            if (!hasCodeEditor()) {
                updateStatus('Waiting for editor...', 'info');
                console.log('[AutoSolver] Code editor not found, waiting...');
                await sleep(3000);
                if (shouldStop) {
                    updateStatus('Stopped', 'warning');
                    setTimeout(hideStatus, 2000);
                    solveInvocationActive = false;
                    return false;
                }
                if (!hasCodeEditor()) {
                    console.log('[AutoSolver] Code editor still not found, aborting');
                    updateStatus('Editor not found', 'error');
                    setTimeout(hideStatus, 3000);
                    solveInvocationActive = false;
                    return false;
                }
            }

            isRunning = true;
            shouldStop = false;  // Reset stop flag
            currentRetries = 0;

            try {
                return await runSolveLoop();
            } catch (e) {
                if (e.message === 'STOPPED_BY_USER') {
                    console.log('[AutoSolver] Stopped by user');
                    updateStatus('Stopped', 'warning');
                } else {
                    console.error('[AutoSolver] Error:', e);
                    updateStatus('Error occurred!', 'error');
                }
                return false;
            } finally {
                isRunning = false;
                solveInvocationActive = false;
                setTimeout(hideStatus, 3000);
            }
        }

        // Main solve loop with retries
        async function runSolveLoop() {
            const maxRetries = SETTINGS.autoSolverMaxRetries || CONFIG.maxRetries;

            while (currentRetries < maxRetries && !shouldStop) {
                if (shouldStop) throw new Error('STOPPED_BY_USER');

                updateStatus(`Attempt ${currentRetries + 1}/${maxRetries}`, 'info');

                // Step 1: Click AI Solution button
                await sleep(500);
                if (shouldStop) throw new Error('STOPPED_BY_USER');

                const aiBtn = await waitFor('#ai-solution-btn', 5000);
                if (shouldStop) throw new Error('STOPPED_BY_USER');

                if (!aiBtn) {
                    updateStatus('AI button not found', 'error');
                    return false;
                }

                forceClick(aiBtn, 'AI Solution');

                // Step 2: Wait for generation to complete
                const generated = await waitForAIGeneration();
                if (shouldStop) throw new Error('STOPPED_BY_USER');
                if (!generated) {
                    currentRetries++;
                    updateStatus('Generation failed, retrying...', 'warning');
                    await sleep(CONFIG.delayBetweenRetries);
                    if (shouldStop) throw new Error('STOPPED_BY_USER');
                    continue;
                }

                updateStatus('Solution generated!', 'success');
                await sleep(SETTINGS.autoSolverDelay || CONFIG.delayAfterGen);
                if (shouldStop) throw new Error('STOPPED_BY_USER');

                // Step 3: Click Run button
                const runBtn = await waitFor('#j_id_bg, button[id*="_bg"]', 5000);
                if (shouldStop) throw new Error('STOPPED_BY_USER');

                if (!runBtn) {
                    // Try alternative selectors
                    const buttons = document.querySelectorAll('button');
                    let foundRun = false;
                    for (const btn of buttons) {
                        if (btn.textContent.includes('Run')) {
                            forceClick(btn, 'Run');
                            foundRun = true;
                            break;
                        }
                    }
                    if (!foundRun) {
                        updateStatus('Run button not found', 'error');
                        return false;
                    }
                } else {
                    forceClick(runBtn, 'Run');
                }

                // Step 4: Wait for result
                const result = await waitForResult();
                if (shouldStop) throw new Error('STOPPED_BY_USER');

                // Handle stopped result
                if (result === 'stopped') {
                    throw new Error('STOPPED_BY_USER');
                }

                if (result === 'success') {
                    updateStatus('PASSED', 'success');

                    // Click Proceed to Next using robust method
                    await sleep(CONFIG.delayBeforeNext);
                    if (shouldStop) throw new Error('STOPPED_BY_USER');

                    await clickProceedNext();
                    return true;

                } else if (result === 'failed' || result === 'compilation_error' || result === 'runtime_error') {
                    currentRetries++;
                    updateStatus(`${result} - Retry ${currentRetries}/${maxRetries}`, 'warning');

                    if (currentRetries < maxRetries) {
                        await sleep(CONFIG.delayBetweenRetries);
                        if (shouldStop) throw new Error('STOPPED_BY_USER');
                        // The AI should now detect the error and try to fix it
                        continue;
                    }
                } else {
                    // Timeout or unknown
                    currentRetries++;
                    updateStatus('Result timeout, retrying...', 'warning');
                    await sleep(CONFIG.delayBetweenRetries);
                    if (shouldStop) throw new Error('STOPPED_BY_USER');
                    continue;
                }
            }

            updateStatus(`Failed after ${maxRetries} attempts`, 'error');
            return false;
        }

        // Stop auto solver
        function stop() {
            shouldStop = true;
            isRunning = false;
            saveStopState(true);  // Persist stop state
            console.log('[AutoSolver] Stop requested (persistent)');
            updateStatus('Stopping...', 'warning');
            setTimeout(() => {
                hideStatus();
                console.log('[AutoSolver] Stopped');
            }, 1000);
        }

        // Resume auto solver (clear persistent stop)
        function resume() {
            shouldStop = false;
            saveStopState(false);
            console.log('[AutoSolver] Resumed');
        }

        // Track failed attempts to prevent infinite loops
        let consecutiveFailures = 0;
        const MAX_CONSECUTIVE_FAILURES = 3;
        let lastSolveAttempt = 0;
        const MIN_SOLVE_INTERVAL = 5000; // Minimum 5 seconds between solve attempts

        // Check if all problems are completed
        function isAllCompleted() {
            // Look for completion messages
            const pageText = document.body?.innerText || '';
            if (pageText.includes('Congratulations') ||
                pageText.includes('All problems completed') ||
                pageText.includes('completed all')) {
                return true;
            }
            // Check if there's no Solve button and no code editor
            const hasSolveBtn = isOnProblemListPage();
            const hasEditor = hasCodeEditor();
            const hasCaptchaPage = hasCaptcha();

            // If we're on the URL but none of these exist, probably completed
            if (!hasSolveBtn && !hasEditor && !hasCaptchaPage) {
                return true;
            }
            return false;
        }

        // Initialize
        function init() {
            if (!SETTINGS.enableAutoSolver || !SETTINGS.enableAISolver) {
                return;
            }

            console.log('[AutoSolver] Starting...');

            // Check for persistent stop state
            if (loadStopState()) {
                console.log('[AutoSolver] Persistent stop detected - not auto-starting');
                // Show a resume button/notification
                createStatusIndicator();
                showStatus();
                updateStatus('Stopped (click to resume)', 'warning');

                // Modify stop button to be a resume button
                if (stopButton) {
                    stopButton.textContent = 'RESUME';
                    stopButton.style.background = '#4CAF50';
                    stopButton.onclick = () => {
                        resume();
                        stopButton.textContent = 'STOP';
                        stopButton.style.background = '#f44336';
                        stopButton.onclick = () => {
                            stop();
                            updateStatus('Stopped by user', 'warning');
                            setTimeout(hideStatus, 2000);
                        };
                        updateStatus('Resumed!', 'success');
                        setTimeout(() => {
                            if (isOnProblemPageURL()) {
                                solve();
                            }
                        }, 1000);
                    };
                }
                return;
            }

            // Start immediately if on problem page
            if (isOnProblemPageURL()) {
                console.log('[AutoSolver] On problem page, starting auto-solve...');
                solve();
            }

            // Debounced solve trigger
            let solveTimeout = null;
            const debouncedSolve = () => {
                if (solveTimeout) clearTimeout(solveTimeout);
                solveTimeout = setTimeout(() => {
                    const now = Date.now();

                    // Prevent rapid retries
                    if (now - lastSolveAttempt < MIN_SOLVE_INTERVAL) {
                        return;
                    }

                    // Check if all completed
                    if (isAllCompleted()) {
                        console.log('[AutoSolver] All problems completed!');
                        updateStatus('All completed', 'success');
                        setTimeout(hideStatus, 5000);
                        return;
                    }

                    // Check consecutive failures
                    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                        console.log('[AutoSolver] Too many failures, stopping');
                        updateStatus('Stopped - too many failures', 'error');
                        setTimeout(hideStatus, 5000);
                        return;
                    }

                    if (isOnProblemPageURL() && !isRunning) {
                        lastSolveAttempt = now;
                        solve().then((ok) => {
                            if (ok) consecutiveFailures = 0;
                            else consecutiveFailures++;
                        }).catch(() => {
                            consecutiveFailures++;
                        });
                    }
                }, 1000); // Wait 1 second before triggering
            };

            // Throttled observer - only check every 2 seconds max
            let lastObserverTrigger = 0;
            const navObserver = new MutationObserver(() => {
                const now = Date.now();
                if (now - lastObserverTrigger < 2000) return; // Throttle
                lastObserverTrigger = now;

                if (isOnProblemPageURL() && !isRunning) {
                    debouncedSolve();
                }
            });

            if (document.body) {
                navObserver.observe(document.body, { childList: true, subtree: true });
            }
        }

        return {
            solve,
            stop,
            init,
            isRunning: () => isRunning,
            resetFailures: () => { consecutiveFailures = 0; }
        };
    })();

    // Initialize Auto Solver when DOM is ready AND script is enabled
    onScriptEnabled(() => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(AutoSolver.init, 500);
            });
        } else {
            setTimeout(AutoSolver.init, 300);
        }

        // Expose for manual control
        window.AutoSolver = AutoSolver;
    });

})();

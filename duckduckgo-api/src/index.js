const MODEL_MAP = {
	'gpt-4o-mini': 'gpt-4o-mini',
	'gpt-5-mini': 'gpt-5-mini',
	'gpt-oss-120b': 'tinfoil/gpt-oss-120b',
	'llama-4-scout': 'meta-llama/Llama-4-Scout-17B-16E-Instruct',
	'claude-haiku-4-5': 'claude-haiku-4-5',
	'mistral-small-3': 'mistralai/Mistral-Small-24B-Instruct-2501'
};

const AVAILABLE_MODELS = [
	{ id: 'gpt-4o-mini', name: 'GPT-4o Mini', owner: 'OpenAI' },
	{ id: 'gpt-5-mini', name: 'GPT-5 Mini', owner: 'OpenAI' },
	{ id: 'gpt-oss-120b', name: 'GPT-OSS 120B', owner: 'OpenAI' },
	{ id: 'llama-4-scout', name: 'Llama 4 Scout', owner: 'Meta' },
	{ id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', owner: 'Anthropic' },
	{ id: 'mistral-small-3', name: 'Mistral Small 3', owner: 'Mistral AI' }
];

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Safari/605.1.15';
const ORIGIN_API = 'https://duck.ai';
const STATUS_URL = 'https://duck.ai/duckchat/v1/status';
const CHAT_URL = 'https://duck.ai/duckchat/v1/chat';
const FE_VERSION = 'serp_20260410_130311_ET-b0ef3e01af034d9f7df515329a260728eea94525';
const GPT_OSS_MODEL = 'tinfoil/gpt-oss-120b';
const GPT_5_MINI_MODEL = 'gpt-5-mini';
const CLAUDE_HAIKU_MODEL = 'claude-haiku-4-5';
const GPT_OSS_TOOL_CHOICE = {
	NewsSearch: false,
	VideosSearch: false,
	LocalSearch: false,
	WeatherForecast: false
};
const REASONING_SUPPORTED_MODELS = new Set([GPT_5_MINI_MODEL, GPT_OSS_MODEL, CLAUDE_HAIKU_MODEL]);
const CHAT_MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 900;

// SHA256 hash function for Cloudflare Workers
async function sha256Base64(input) {
	const encoder = new TextEncoder();
	const data = encoder.encode(input);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = new Uint8Array(hashBuffer);
	let binary = '';
	for (let i = 0; i < hashArray.length; i++) {
		binary += String.fromCharCode(hashArray[i]);
	}
	return btoa(binary);
}

// Parse hex from pattern like '0xABC' or just 'ABC'
function getHex(s) {
	let t = s;
	const parenIndex = s.indexOf('(');
	if (parenIndex !== -1) {
		t = s.slice(parenIndex + 3, s.length - 1);
	}
	return parseInt(t, 16);
}

// Generate request hash from the x-vqd-hash-1 challenge
async function genRequestHash(hash) {
	// Decode base64
	const decodedStr = atob(hash);
	
	// Helper to capture regex groups
	const capture = (pat) => {
		const regex = new RegExp(pat);
		const match = decodedStr.match(regex);
		return match ? match[1] : null;
	};
	
	// Extract string array
	const stringArrayMatch = capture("\\{const _0x......=\\[(.*?)\\];");
	if (!stringArrayMatch) throw new Error('string array not found');
	const stringArray = stringArrayMatch.split(',').map(s => s.replace(/^'|'$/g, ''));
	
	// Extract offset
	const offsetMatch = capture("0x([0-9a-fA-F]+);let");
	if (!offsetMatch) throw new Error('offset not found');
	const offset = parseInt(offsetMatch, 16);
	
	// Find shift offset
	let shiftOffset = null;
	
	const findOffset = (pat, target) => {
		const index = getHex(pat);
		const originIndex = stringArray.indexOf(target);
		if (originIndex === -1) throw new Error('offset pattern not found in string array');
		return originIndex - (index - offset);
	};
	
	// Try Promise pattern
	const promisePat = capture("await Promise\\[[^(]*\\(0x([0-9a-fA-F]+)\\)\\]");
	if (promisePat && shiftOffset === null) {
		try { shiftOffset = findOffset(promisePat, 'all'); } catch (e) {}
	}
	
	// Try userAgent pattern
	const userAgentPat = capture("\\]\\(\\[navigator\\[[^(]*\\(0x([0-9a-fA-F]+)\\)\\],");
	if (userAgentPat && shiftOffset === null) {
		try { shiftOffset = findOffset(userAgentPat, 'userAgent'); } catch (e) {}
	}
	
	// Try reduce pattern
	const reducePat = capture("\\(Number\\)\\[_0x.{6}\\(0x([0-9a-fA-F]+)\\)\\]");
	if (reducePat && shiftOffset === null) {
		try { shiftOffset = findOffset(reducePat, 'reduce'); } catch (e) {}
	}
	
	// Try querySelectorAll pattern
	const queryPat = capture("\\(0x([0-9a-fA-F]+)\\)]\\('\\*'\\)");
	if (queryPat && shiftOffset === null) {
		try { shiftOffset = findOffset(queryPat, 'querySelectorAll'); } catch (e) {}
	}
	
	if (shiftOffset === null) throw new Error('shift offset not found');
	
	// Extract server hashes
	const serverHashRegex = /'server_hashes':\[([^,]+),([^,]+),([^\]]+)\]/;
	const serverHashMatch = decodedStr.match(serverHashRegex);
	if (!serverHashMatch) throw new Error('server hash pats not found');
	const serverHashPats = [serverHashMatch[1], serverHashMatch[2], serverHashMatch[3]];
	
	const resolveValue = (pat) => {
		if (pat.startsWith("'")) {
			return pat.replace(/^'|'$/g, '');
		} else {
			const index = getHex(pat);
			const arrayLen = stringArray.length;
			const originIndex = ((index - offset + shiftOffset) % arrayLen + arrayLen) % arrayLen;
			return stringArray[originIndex];
		}
	};
	
	const serverHashes = serverHashPats.map(resolveValue);
	
	// User agent hash
	const userAgentHash = await sha256Base64(USER_AGENT);
	
	// Second hash based on challenge type
	let secondHash;
	
	if (decodedStr.includes('innerHTML')) {
		const innerHtmlPat = capture("=([^,;]+),String");
		if (!innerHtmlPat) throw new Error('inner html pattern not found');
		const innerHTML = resolveValue(innerHtmlPat);
		
		const innerHtmlData = {
			'<div><div></div><div></div': 99,
			'<p><div></p><p></div': 128,
			'<br><div></br><br></div': 92,
			'<li><div></li><li></div': 87
		};
		
		const innerHtmlLen = innerHtmlData[innerHTML];
		if (innerHtmlLen === undefined) throw new Error('unknown inner html pattern');
		
		const numberPat = capture("String\\(0x([0-9a-fA-F]+)\\+");
		if (!numberPat) throw new Error('extracted number not found');
		const number = getHex(numberPat);
		
		secondHash = await sha256Base64((number + innerHtmlLen).toString());
	} else if (decodedStr.includes('instanceof HTMLDivElement')) {
		const numberPat = capture(",0x([0-9a-fA-F]+)\\)\\);\\}\\(\\)\\),\\(function");
		if (!numberPat) throw new Error('extracted number not found');
		const number = getHex(numberPat);
		secondHash = await sha256Base64((number + 12).toString());
	} else if (decodedStr.includes('Content-Security-Policy')) {
		const numberPat = capture(",0x([0-9a-fA-F]+)\\)\\);\\}\\(\\)\\),\\(function");
		if (!numberPat) throw new Error('extracted number not found');
		const number = getHex(numberPat);
		secondHash = await sha256Base64((number + 4).toString());
	} else {
		throw new Error('unknown second client hash');
	}
	
	// Third hash
	const thirdPat = capture(",0x([^)]+)\\)\\);\\}\\(\\)\\)\\]\\)");
	if (!thirdPat) throw new Error('third pattern not found');
	const thirdNum = getHex(thirdPat);
	const thirdHash = await sha256Base64(thirdNum.toString());
	
	// Challenge ID
	const challengeIdPat = capture("'challenge_id':([^},]+)");
	if (!challengeIdPat) throw new Error('challenge id not found');
	const challengeId = resolveValue(challengeIdPat);
	
	// Timestamp
	const timestampPat = capture("'timestamp':([^},]+)");
	if (!timestampPat) throw new Error('timestamp not found');
	const timestamp = resolveValue(timestampPat);
	
	// Build result
	const result = {
		server_hashes: serverHashes,
		client_hashes: [userAgentHash, secondHash, thirdHash],
		signals: {},
		meta: {
			v: '4',
			challenge_id: challengeId,
			timestamp: timestamp,
			origin: 'https://duck.ai',
			duration: '13'
		}
	};
	
	return btoa(JSON.stringify(result));
}

// Load token from status endpoint and solve challenge
async function loadToken() {
	const response = await fetch(STATUS_URL, {
		method: 'GET',
		headers: {
			'User-Agent': USER_AGENT,
			'Referer': ORIGIN_API,
			'x-vqd-accept': '1'
		}
	});
	
	if (!response.ok) {
		throw new Error(`Status request failed: ${response.status}`);
	}
	
	const hash = response.headers.get('x-vqd-hash-1');
	if (!hash) {
		const allHeaders = {};
		response.headers.forEach((v, k) => allHeaders[k] = v);
		throw new Error(`x-vqd-hash-1 not found. Headers: ${Object.keys(allHeaders).join(', ')}`);
	}
	
	const requestHash = await genRequestHash(hash);
	return requestHash;
}

function textFromValue(value) {
	if (!value) return '';
	if (typeof value === 'string') return value;
	if (Array.isArray(value)) return value.map(textFromValue).join('');
	if (typeof value === 'object') {
		if (typeof value.text === 'string') return value.text;
		if (typeof value.content === 'string') return value.content;
		if (typeof value.summaryText === 'string') return value.summaryText;
		if (Array.isArray(value.summaryText)) return value.summaryText.map(textFromValue).join('');
		if (Array.isArray(value.content)) return textFromValue(value.content);
		if (Array.isArray(value.parts)) return textFromValue(value.parts);
	}
	return '';
}

function reasoningFromValue(value) {
	if (!value) return '';
	if (typeof value === 'string') return value;
	if (Array.isArray(value)) return value.map(reasoningFromValue).filter(Boolean).join('\n');

	if (typeof value === 'object') {
		if (value.type === 'reasoning') {
			if (typeof value.reasoning === 'string') return value.reasoning;
			if (typeof value.text === 'string') return value.text;
			if (typeof value.summaryText === 'string') return value.summaryText;
			if (Array.isArray(value.summaryText)) return value.summaryText.map(textFromValue).join('\n');
			if (typeof value.content === 'string') return value.content;
			if (Array.isArray(value.content)) return value.content.map(textFromValue).join('\n');
			return '';
		}
		if (typeof value.reasoning === 'string') return value.reasoning;
		if (Array.isArray(value.parts)) return reasoningFromValue(value.parts);
		if (value.message && typeof value.message === 'object') return reasoningFromValue(value.message);
	}

	return '';
}

function normalizeMessages(messages) {
	const normalized = [];
	for (const msg of messages) {
		if (!msg || typeof msg !== 'object') continue;

		const incomingRole = typeof msg.role === 'string' ? msg.role : 'user';
		let role = incomingRole;
		if (role !== 'assistant' && role !== 'user' && role !== 'system') role = 'user';

		const hasParts = Array.isArray(msg.parts) && msg.parts.length > 0;
		let content = typeof msg.content === 'string' ? msg.content : textFromValue(msg.content);
		if (!content && !hasParts) content = textFromValue(msg.parts);

		if (role === 'system') {
			role = 'user';
			content = `System: ${content}`;
		}

		if (!content && !hasParts) continue;

		const normalizedMessage = { role, content: content || '' };
		if (hasParts) normalizedMessage.parts = msg.parts;
		normalized.push(normalizedMessage);
	}
	return normalized;
}

function buildFeSignals() {
	const now = Date.now();
	return btoa(JSON.stringify({ start: now, events: [], end: now }));
}

function supportsReasoning(modelId) {
	return REASONING_SUPPORTED_MODELS.has(modelId);
}

function normalizeReasoningEffort(value) {
	const effort = `${value || ''}`.toLowerCase();
	if (effort === 'none') return undefined;
	if (effort === 'minimal' || effort === 'low' || effort === 'medium' || effort === 'high') return effort;
	return 'low';
}

function buildPayload(modelId, messages, options = {}) {
	const payload = { model: modelId, messages };

	if (supportsReasoning(modelId)) {
		payload.metadata = (options.metadata && typeof options.metadata === 'object')
			? options.metadata
			: { toolChoice: { ...GPT_OSS_TOOL_CHOICE } };
		payload.canUseTools = typeof options.canUseTools === 'boolean' ? options.canUseTools : true;
		const effort = normalizeReasoningEffort(options.reasoningEffort);
		if (effort) payload.reasoningEffort = effort;
		payload.canUseApproxLocation = options.canUseApproxLocation ?? null;
	}

	if (options.durableStream && typeof options.durableStream === 'object') {
		payload.durableStream = options.durableStream;
	}

	return payload;
}

function buildChatHeaders(modelId, token) {
	const headers = {
		'Accept': 'text/event-stream',
		'Content-Type': 'application/json',
		'Origin': ORIGIN_API,
		'Referer': `${ORIGIN_API}/`,
		'User-Agent': USER_AGENT,
		'x-fe-version': FE_VERSION,
		'x-vqd-hash-1': token
	};

	if (supportsReasoning(modelId)) {
		headers['Cookie'] = 'access_type=dev_01';
		headers['x-fe-signals'] = buildFeSignals();
	}

	return headers;
}

function extractChunkText(parsed) {
	return (
		textFromValue(parsed?.message) ||
		textFromValue(parsed?.content) ||
		textFromValue(parsed?.parts) ||
		textFromValue(parsed?.message?.parts) ||
		''
	);
}

function extractChunkReasoning(parsed) {
	return (
		((parsed?.role === 'reasoning') ? (reasoningFromValue(parsed?.text) || reasoningFromValue(parsed?.summaryText)) : '') ||
		reasoningFromValue(parsed?.reasoning) ||
		reasoningFromValue(parsed?.parts) ||
		reasoningFromValue(parsed?.message?.parts) ||
		reasoningFromValue(parsed?.message?.reasoning) ||
		''
	);
}

function mergeChunkValue(current, chunk, separator = '') {
	if (!chunk) return current;
	if (!current) return chunk;
	if (chunk === current) return current;
	if (chunk.startsWith(current) && chunk.length > current.length) return chunk;
	if (current.endsWith(chunk)) return current;
	return `${current}${separator}${chunk}`;
}

async function readDuckStream(response) {
	let fullMessage = '';
	let reasoningMessage = '';
	let lastChunk = '';
	let lastReasoningChunk = '';
	let debugLines = '';

	const appendDebug = (line) => {
		if (debugLines.length >= 1000 || !line) return;
		debugLines += `${line.slice(0, 200)}\n`;
	};

	const applyLine = (line) => {
		if (!line) return false;
		appendDebug(line);
		if (!line.startsWith('data:')) return false;

		const data = line.slice(5).trimStart();
		if (!data || data === '[PING]') return false;
		if (data === '[DONE]') return true;

		try {
			const parsed = JSON.parse(data);
			const reasoningChunk = extractChunkReasoning(parsed);
			if (reasoningChunk && reasoningChunk !== lastReasoningChunk) {
				reasoningMessage = mergeChunkValue(reasoningMessage, reasoningChunk, '\n');
				lastReasoningChunk = reasoningChunk;
			}

			const chunk = extractChunkText(parsed);
			if (chunk && chunk !== lastChunk) {
				fullMessage = mergeChunkValue(fullMessage, chunk);
				lastChunk = chunk;
			}
		} catch (e) {}

		return false;
	};

	if (!response.body) {
		const raw = await response.text();
		for (const line of raw.split('\n')) {
			if (applyLine(line.trim())) break;
		}
		return { fullMessage, reasoningMessage, debugLines: debugLines || raw.slice(0, 1000) };
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	let done = false;

	while (!done) {
		const result = await reader.read();
		if (result.done) break;

		buffer += decoder.decode(result.value, { stream: true });
		let newlineIndex = buffer.indexOf('\n');

		while (newlineIndex !== -1) {
			const line = buffer.slice(0, newlineIndex).trim();
			buffer = buffer.slice(newlineIndex + 1);
			if (applyLine(line)) {
				done = true;
				try {
					await reader.cancel();
				} catch (e) {}
				break;
			}
			newlineIndex = buffer.indexOf('\n');
		}
	}

	if (!done && buffer.trim()) {
		applyLine(buffer.trim());
	}

	return { fullMessage, reasoningMessage, debugLines };
}

async function handleChat(request, env) {
	const body = await request.json();
	const {
		messages,
		model,
		stream,
		include_reasoning: includeReasoningRaw,
		includeReasoning: includeReasoningCamel,
		reasoning_effort: reasoningEffortRaw,
		reasoningEffort: reasoningEffortCamel,
		durableStream,
		metadata,
		canUseTools,
		canUseApproxLocation
	} = body;
	const includeReasoning = Boolean(includeReasoningRaw ?? includeReasoningCamel ?? false);
	const reasoningEffort = normalizeReasoningEffort(reasoningEffortRaw ?? reasoningEffortCamel);

	if (!messages || !Array.isArray(messages) || messages.length === 0) {
		return new Response(JSON.stringify({ error: 'Messages array is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Get token with retries
	let token = null;
	let lastError = null;
	for (let i = 0; i < 5; i++) {
		try {
			token = await loadToken();
			break;
		} catch (e) {
			lastError = e;
			await new Promise(r => setTimeout(r, 1000));
		}
	}
	
	if (!token) {
		return new Response(JSON.stringify({ error: `Cannot get token: ${lastError?.message}` }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const modelName = model || 'gpt-4o-mini';
	const modelId = MODEL_MAP[modelName] || modelName;
	const includeReasoningForModel = includeReasoning && supportsReasoning(modelId);

	const normalizedMessages = normalizeMessages(messages);
	if (normalizedMessages.length === 0) {
		return new Response(JSON.stringify({ error: 'Messages must include text content' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const payload = buildPayload(modelId, normalizedMessages, {
		reasoningEffort,
		durableStream,
		metadata,
		canUseTools,
		canUseApproxLocation
	});

	let currentToken = token;
	let response = null;
	let chatFetchError = null;

	for (let attempt = 0; attempt < CHAT_MAX_ATTEMPTS; attempt++) {
		try {
			response = await fetch(CHAT_URL, {
				method: 'POST',
				headers: buildChatHeaders(modelId, currentToken),
				body: JSON.stringify(payload)
			});
		} catch (e) {
			chatFetchError = e;
		}

		const status = response ? response.status : 0;
		const shouldRetry = attempt < CHAT_MAX_ATTEMPTS - 1 && (status === 429 || status === 403 || !response);
		if (!shouldRetry) break;

		try {
			if (response?.body) await response.body.cancel();
		} catch (e) {}

		try {
			currentToken = await loadToken();
		} catch (e) {
			chatFetchError = e;
		}

		await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
	}

	if (!response) {
		return new Response(JSON.stringify({ error: `DuckDuckGo request failed: ${chatFetchError?.message || 'unknown error'}` }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (response.status === 429) {
		return new Response(JSON.stringify({ error: 'Rate limited by DuckDuckGo after retries' }), {
			status: 429,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (!response.ok) {
		const errorText = await response.text();
		return new Response(JSON.stringify({ error: `DuckDuckGo error: ${response.status} - ${errorText}` }), {
			status: response.status,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const { fullMessage, reasoningMessage, debugLines } = await readDuckStream(response);

	if (!fullMessage) {
		return new Response(JSON.stringify({ error: 'Empty response from AI', raw: debugLines.slice(0, 500) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const outputMessage = { role: 'assistant', content: fullMessage };
	if (includeReasoningForModel && reasoningMessage) {
		outputMessage.reasoning = reasoningMessage;
	}

	return new Response(JSON.stringify({
		id: `chatcmpl-${Date.now()}`,
		object: 'chat.completion',
		created: Math.floor(Date.now() / 1000),
		model: modelName,
		choices: [{ 
			index: 0,
			message: outputMessage,
			reasoning: includeReasoningForModel && reasoningMessage ? reasoningMessage : undefined,
			finish_reason: 'stop'
		}],
		usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
	}), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
}

function handleModels() {
	return new Response(JSON.stringify({ 
		object: 'list',
		data: AVAILABLE_MODELS.map(m => ({
			id: m.id,
			object: 'model',
			created: 1686935002,
			owned_by: m.owner.toLowerCase()
		}))
	}), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
}

function addCorsHeaders(response, origin) {
	const newHeaders = new Headers(response.headers);
	newHeaders.set('Access-Control-Allow-Origin', origin || '*');
	newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
	newHeaders.set('Access-Control-Max-Age', '86400');
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders
	});
}

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const origin = request.headers.get('Origin');

		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return addCorsHeaders(new Response(null, { status: 204 }), origin);
		}

		let response;
		try {
			// Routes
			if (url.pathname === '/chat' || url.pathname === '/v1/chat/completions' || url.pathname === '/chat/completions') {
				if (request.method !== 'POST') {
					response = new Response(JSON.stringify({ error: 'Method not allowed' }), {
						status: 405,
						headers: { 'Content-Type': 'application/json' }
					});
				} else {
					response = await handleChat(request, env);
				}
			} else if (url.pathname === '/models' || url.pathname === '/v1/models') {
				response = handleModels();
			} else if (url.pathname === '/health' || url.pathname === '/') {
				response = new Response(JSON.stringify({ 
					status: 'ok', 
					service: 'DuckDuckGo AI Proxy',
					endpoints: ['/chat', '/v1/chat/completions', '/models', '/v1/models']
				}), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			} else {
				response = new Response(JSON.stringify({ error: 'Not found' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		} catch (e) {
			response = new Response(JSON.stringify({ error: e.message, stack: e.stack }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return addCorsHeaders(response, origin);
	}
};

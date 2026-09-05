# DuckDuckGo AI Proxy - Cloudflare Worker

A Cloudflare Worker that proxies requests to DuckDuckGo AI Chat, bypassing CSP restrictions and solving the VQD hash challenge.

## Features

- **Free AI Access** - Uses DuckDuckGo AI Chat (no API key needed for end users)
- **Hash Challenge Solver** - Automatically solves the `x-vqd-hash-1` authentication challenge
- **CORS Support** - Works from any browser/userscript
- **OpenAI-Compatible API** - Drop-in replacement for OpenAI chat completions

## Available Models

The worker exposes the models below at `/models`. DuckDuckGo retires models
without notice; on 2026-09-05 `claude-haiku-4-5` and `gpt-oss-120b` answered,
the Mistral and older GPT ids returned `ERR_MODEL_UNAVAILABLE`, and rapid
requests were rate limited (HTTP 429). The userscript falls back through the
list automatically.

| Model ID | Name | Provider | Reasoning |
|----------|------|----------|-----------|
| `claude-haiku-4-5` | Claude Haiku 4.5 | Anthropic | no |
| `gpt-oss-120b` | GPT-OSS 120B | Tinfoil | yes |
| `gpt-5.4-mini` | GPT-5.4 Mini | OpenAI | yes |
| `gpt-5.4-nano` | GPT-5.4 Nano | OpenAI | yes |
| `gemma-4-31b` | Gemma 4 31B | Google | no |
| `mistral-small-4` | Mistral Small 4 | Mistral AI | no |
| `mistral-small-2603` | Mistral Small 2603 | Mistral AI | no |
| `claude-4-5-haiku` | Claude 4.5 Haiku | Anthropic | no |

Endpoints: `POST /chat` (alias `/v1/chat/completions`), `GET /models`
(alias `/v1/models`), `GET /health`.

## Operational notes

* The token handshake (`x-vqd-hash-1`) depends on DuckDuckGo accepting the
  worker's egress IP. On 2026-09-05 the shared `workers.dev` deployment was
  refused (`x-vqd-hash-1 not found`) while the same code answered from a
  residential IP. Deploy your own worker to get a separate quota, and keep
  request volume modest; bursts are answered with HTTP 429.
* `src/index.js` retries the status request on both `duck.ai` and
  `duckduckgo.com` with a short backoff before failing.
* You can exercise the worker locally without Cloudflare: Node 18 needs a
  WebCrypto shim (`globalThis.crypto = require('crypto').webcrypto`) and the
  file imported as an ES module.

## Setup

### 1. Install Dependencies

```bash
cd duckduckgo-api
npm install
```

### 2. Configure API Key (Optional)

Edit `wrangler.toml` and set your API key:

```toml
[vars]
API_KEY = "your-secret-api-key-here"
```

Or use Cloudflare secrets (recommended for production):

```bash
wrangler secret put API_KEY
```

### 3. Login to Cloudflare

```bash
wrangler login
```

### 4. Deploy

```bash
npm run deploy
# or
wrangler deploy
```

### 5. Get Your Worker URL

After deployment, you'll see something like:
```
Published duckduckgo-api (1.0.0)
  https://duckduckgo-api.<your-subdomain>.workers.dev
```

## API Endpoints

### POST /chat or /v1/chat/completions

Send a chat completion request.

**Headers:**
- `Content-Type: application/json`
- `X-API-Key: your-api-key` (if API key is configured)

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "Hello, how are you?" }
  ],
  "model": "gpt-4o-mini"
}
```

**Available Models:**
- `gpt-4o-mini` (default) - OpenAI
- `gpt-5-mini` - OpenAI
- `gpt-oss-120b` - OpenAI
- `llama-4-scout` - Meta
- `claude-3.5-haiku` - Anthropic
- `mixtral-small-3` - Mistral AI

**Response:**
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "I'm doing well, thank you for asking!"
      }
    }
  ],
  "model": "gpt-4o-mini"
}
```

### GET /models or /v1/models

Get available models.

### GET / or /health

Health check endpoint.

## Usage in Userscript

Update your userscript settings:

1. Set `AI Provider` to `DuckDuckGo`
2. Set `DuckDuckGo API URL` to your worker URL (e.g., `https://duckduckgo-api.your-subdomain.workers.dev`)
3. Set `DuckDuckGo API Key` if you configured one

## Local Development

```bash
npm run dev
```

This starts a local server at `http://localhost:8787`

## License

MIT

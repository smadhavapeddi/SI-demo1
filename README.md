# DigitalOcean Serverless Inference — Node.js Demo

Minimal demo of DigitalOcean's Serverless Inference API using the standard
`openai` npm package (Serverless Inference is OpenAI-compatible).

## Setup

```bash
npm install
cp .env.example .env
```

Create a Model Access Key in the DO control panel ([docs](https://docs.digitalocean.com/products/inference/how-to/manage-model-access-keys/)) and paste it into `.env` as `MODEL_ACCESS_KEY`.

## Run

```bash
npm run chat     # single request/response
npm run stream   # streamed tokens
npm run cache    # prompt caching demo (Anthropic models only)
```

## What each demo shows

- **chat** — basic `chat.completions.create` call against a DO-hosted open-source model (defaults to `llama3.3-70b-instruct`).
- **stream** — same call with `stream: true`, printing tokens as they arrive.
- **cache** — sends a long system prompt with `cache_control: { type: "ephemeral" }` twice against an Anthropic model (defaults to `claude-3-5-haiku`). The first response reports `cache_created_input_tokens`; the second reports `cache_read_input_tokens`, showing the cache hit.

Override the model with `MODEL_ID` / `CACHE_MODEL_ID` in `.env`. See [available models](https://docs.digitalocean.com/products/inference/details/models/).

## Reference

- [Chat Completions API](https://docs.digitalocean.com/products/inference/how-to/use-chat-completions-api/)
- [Prompt Caching](https://docs.digitalocean.com/products/inference/how-to/use-prompt-caching/)

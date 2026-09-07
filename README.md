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

## Deploying to App Platform

`server.js` wraps the same logic in an Express web service (`GET /health`, `POST /chat`, `POST /stream`, `POST /cache`) so it can run as an App Platform Web Service. `.do/app.yaml` is a ready-made app spec pointed at `smadhavapeddi/SI-demo1` (`main` branch).

### 1. Push this code to your repo

```bash
cd do-serverless-inference-demo
git init                                   # skip if already a git repo
git remote add origin https://github.com/smadhavapeddi/SI-demo1.git
git add .
git commit -m "DO Serverless Inference App Platform demo"
git branch -M main
git push -u origin main
```

### 2. Create the app

Option A — doctl (CLI):

```bash
doctl auth init                            # one-time, needs a DO API token
doctl apps create --spec .do/app.yaml
```

Option B — control panel: go to **Apps → Create App → GitHub**, pick `smadhavapeddi/SI-demo1` / `main`. App Platform will auto-detect Node.js from `package.json`; when prompted, upload `.do/app.yaml` instead of clicking through the wizard, or just set the run command to `npm start` and HTTP port to `8080` manually.

### 3. Set the secret

The spec declares `MODEL_ACCESS_KEY` as a `SECRET` env var with no value — set it after creation (it won't be committed to git):

```bash
doctl apps update <app-id> --spec .do/app.yaml   # spec still has no value; set via UI instead
```

Easier: **App → Settings → App-Level Environment Variables → Edit**, add `MODEL_ACCESS_KEY` = your model access key, encrypted.

### 4. Verify

```bash
curl https://<your-app>.ondigitalocean.app/health
curl -X POST https://<your-app>.ondigitalocean.app/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Give me one fun fact about the ocean."}'
```

Every push to `main` auto-redeploys (`deploy_on_push: true` in the spec).

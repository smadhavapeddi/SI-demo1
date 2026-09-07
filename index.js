// DigitalOcean Serverless Inference demo (Node.js)
//
// Serverless Inference exposes an OpenAI-compatible API at
// https://inference.do-ai.run/v1, so the standard `openai` npm package
// works as-is — just point it at DO's base URL and use a Model Access Key.
//
// Usage:
//   npm install
//   cp .env.example .env   # then fill in MODEL_ACCESS_KEY
//   npm run chat           # single request/response
//   npm run stream         # streamed tokens
//   npm run cache          # prompt caching demo (2 calls, 2nd is a cache hit)

import "dotenv/config";
import OpenAI from "openai";

const MODEL_ACCESS_KEY = process.env.MODEL_ACCESS_KEY;
const MODEL_ID = process.env.MODEL_ID || "llama3.3-70b-instruct";

if (!MODEL_ACCESS_KEY) {
  console.error(
    "Missing MODEL_ACCESS_KEY. Copy .env.example to .env and add your key.\n" +
      "Docs: https://docs.digitalocean.com/products/inference/how-to/manage-model-access-keys/"
  );
  process.exit(1);
}

const client = new OpenAI({
  baseURL: "https://inference.do-ai.run/v1",
  apiKey: MODEL_ACCESS_KEY,
});

// 1. Basic chat completion --------------------------------------------------
async function chatDemo() {
  const completion = await client.chat.completions.create({
    model: MODEL_ID,
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Give me one fun fact about the ocean." },
    ],
    temperature: 0.7,
    max_completion_tokens: 200,
  });

  console.log("Model:", completion.model);
  console.log("Response:", completion.choices[0].message.content);
  console.log("Usage:", completion.usage);
}

// 2. Streaming chat completion ----------------------------------------------
async function streamDemo() {
  const stream = await client.chat.completions.create({
    model: MODEL_ID,
    messages: [
      { role: "user", content: "Write a 3-line haiku about serverless computing." },
    ],
    max_completion_tokens: 100,
    stream: true,
  });

  process.stdout.write("Response: ");
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || "";
    process.stdout.write(token);
  }
  process.stdout.write("\n");
}

// 3. Prompt caching demo ------------------------------------------------------
// Anthropic models on DO Inference support explicit cache_control blocks.
// The first call writes the cache (billed at a premium); the second call,
// with an identical cached prefix, reads from cache at a discount.
// Docs: https://docs.digitalocean.com/products/inference/how-to/use-prompt-caching/
async function cacheDemo() {
  const cacheModel = process.env.CACHE_MODEL_ID || "claude-3-5-haiku";

  // Needs to be long enough to clear the model's minimum cacheable token
  // threshold (roughly 512-4096 tokens depending on model).
  const longContext = `Reference document for support triage.\n${
    "Policy: All refund requests must be processed within 5 business days. ".repeat(120)
  }`;

  const messages = [
    {
      role: "system",
      content: [
        {
          type: "text",
          text: longContext,
          cache_control: { type: "ephemeral", ttl: "5m" },
        },
      ],
    },
    { role: "user", content: "Summarize the refund policy in one sentence." },
  ];

  console.log("First call (populates cache)...");
  const first = await client.chat.completions.create({
    model: cacheModel,
    messages,
    max_completion_tokens: 100,
  });
  console.log("Response:", first.choices[0].message.content);
  console.log("Usage:", first.usage);

  console.log("\nSecond call (should hit cache)...");
  const second = await client.chat.completions.create({
    model: cacheModel,
    messages,
    max_completion_tokens: 100,
  });
  console.log("Response:", second.choices[0].message.content);
  console.log("Usage:", second.usage);
}

const command = process.argv[2] || "chat";
const demos = { chat: chatDemo, stream: streamDemo, cache: cacheDemo };

if (!demos[command]) {
  console.error(`Unknown command "${command}". Use one of: ${Object.keys(demos).join(", ")}`);
  process.exit(1);
}

demos[command]().catch((err) => {
  console.error("Request failed:", err.message || err);
  process.exit(1);
});

// Web service wrapper around the DO Serverless Inference demo, so it can run
// as an App Platform "Web Service" component (which needs a long-running
// HTTP process bound to process.env.PORT).
//
// Endpoints:
//   GET  /health          liveness check (used by App Platform's health check)
//   POST /chat            { "prompt": "..." }              -> full response
//   POST /stream          { "prompt": "..." }              -> text/event-stream tokens
//   POST /cache           { "prompt": "..." }              -> two calls demonstrating prompt caching (Anthropic models)

import "dotenv/config";
import express from "express";
import OpenAI from "openai";

const MODEL_ACCESS_KEY = process.env.MODEL_ACCESS_KEY;
const MODEL_ID = process.env.MODEL_ID || "llama3.3-70b-instruct";
const CACHE_MODEL_ID = process.env.CACHE_MODEL_ID || "claude-3-5-haiku";
const PORT = process.env.PORT || 8080;

if (!MODEL_ACCESS_KEY) {
  console.error("Missing MODEL_ACCESS_KEY env var. Set it as an App Platform secret.");
  process.exit(1);
}

const client = new OpenAI({
  baseURL: "https://inference.do-ai.run/v1",
  apiKey: MODEL_ACCESS_KEY,
});

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

app.post("/chat", async (req, res) => {
  const prompt = req.body?.prompt || "Give me one fun fact about the ocean.";
  try {
    const completion = await client.chat.completions.create({
      model: MODEL_ID,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_completion_tokens: 200,
    });
    res.json({
      model: completion.model,
      response: completion.choices[0].message.content,
      usage: completion.usage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.post("/stream", async (req, res) => {
  const prompt = req.body?.prompt || "Write a 3-line haiku about serverless computing.";
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await client.chat.completions.create({
      model: MODEL_ID,
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 200,
      stream: true,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || "";
      if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message || String(err) })}\n\n`);
    res.end();
  }
});

app.post("/cache", async (req, res) => {
  const question = req.body?.prompt || "Summarize the refund policy in one sentence.";
  const longContext = `Reference document for support triage.\n${
    "Policy: All refund requests must be processed within 5 business days. ".repeat(120)
  }`;

  const messages = [
    {
      role: "system",
      content: [
        { type: "text", text: longContext, cache_control: { type: "ephemeral", ttl: "5m" } },
      ],
    },
    { role: "user", content: question },
  ];

  try {
    const first = await client.chat.completions.create({
      model: CACHE_MODEL_ID,
      messages,
      max_completion_tokens: 100,
    });
    const second = await client.chat.completions.create({
      model: CACHE_MODEL_ID,
      messages,
      max_completion_tokens: 100,
    });
    res.json({
      first: { response: first.choices[0].message.content, usage: first.usage },
      second: { response: second.choices[0].message.content, usage: second.usage },
    });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`DO Serverless Inference demo listening on :${PORT}`);
});

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: "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", // defaults to process.env["ANTHROPIC_API_KEY"]
});

const msg = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20240620",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello, Claude" }],
});
console.log(msg);

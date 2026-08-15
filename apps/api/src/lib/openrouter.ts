/**
 * OpenRouter client via stable HTTP API.
 * Key is read only from process.env (loaded from gitignored .env).
 */

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  console.warn(
    "[nexus] OPENROUTER_API_KEY is not set. LLM calls will fail until you add it to .env"
  );
}

/** Default models — overridable per role later */
export const MODELS = {
  sovereign: "anthropic/claude-sonnet-4",
  architect: "anthropic/claude-sonnet-4",
  worker: "anthropic/claude-sonnet-4",
  guardian: "anthropic/claude-sonnet-4",
  fast: "google/gemini-2.5-flash",
} as const;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatCompletion(opts: {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<{ content: string; tokensIn: number; tokensOut: number; model: string }> {
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const model = opts.model ?? MODELS.sovereign;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.BOSS_APP_URL ?? "http://localhost:5173",
      "X-Title": "Boss Built",
    },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 2048,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const raw = data.choices?.[0]?.message?.content;
  const content =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? raw.map((c) => c.text ?? "").join("")
        : "";

  return {
    content: content.trim(),
    tokensIn: data.usage?.prompt_tokens ?? 0,
    tokensOut: data.usage?.completion_tokens ?? 0,
    model,
  };
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(apiKey);
}

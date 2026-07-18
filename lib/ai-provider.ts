import "server-only";

const AI_GATEWAY_URL =
  process.env.AI_GATEWAY_BASE_URL ?? "https://ai-gateway.vercel.sh/v1";
const OLLAMA_URL =
  process.env.OLLAMA_BASE_URL ??
  process.env.OLLAMA_URL ??
  "http://127.0.0.1:11434";

export const AI_MODEL =
  process.env.AI_GATEWAY_MODEL ??
  process.env.OLLAMA_MODEL ??
  "openai/gpt-5-mini";

export type AiProviderMode = "vercel-ai-gateway" | "ollama";

function gatewayToken() {
  return process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN;
}

export function aiProviderMode(): AiProviderMode {
  return gatewayToken() ? "vercel-ai-gateway" : "ollama";
}

function localModel() {
  return process.env.OLLAMA_MODEL ?? "qwen2.5:7b";
}

function schemaName(format: object) {
  const candidate =
    "properties" in format &&
    format.properties &&
    typeof format.properties === "object" &&
    "draft" in format.properties
      ? "ariadne_profile"
      : "ariadne_activity";
  return candidate;
}

async function gatewayChat({
  messages,
  format,
}: {
  messages: Array<{ role: string; content: string }>;
  format: object;
}) {
  const token = gatewayToken();
  if (!token) throw new Error("Vercel AI Gateway is not configured.");

  const response = await fetch(`${AI_GATEWAY_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      stream: false,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName(format),
          description:
            "An educator-reviewed Ariadne AAC and classroom-access draft.",
          schema: format,
          strict: true,
        },
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      }
    | null;
  if (!response.ok) {
    const detail = payload?.error?.message?.slice(0, 240);
    throw new Error(
      detail
        ? `Vercel AI Gateway returned ${response.status}: ${detail}`
        : `Vercel AI Gateway returned ${response.status}.`,
    );
  }
  const content = payload?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Vercel AI Gateway returned an empty response.");
  return content;
}

async function ollamaChat({
  messages,
  format,
}: {
  messages: Array<{ role: string; content: string }>;
  format: object;
}) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: localModel(),
      messages,
      stream: false,
      format,
      keep_alive: "30m",
      options: {
        temperature: 0,
        num_ctx: 8192,
        num_predict: 900,
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}.`);
  }
  const payload = (await response.json()) as {
    message?: { content?: string };
  };
  const content = payload.message?.content
    ?.replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
  if (!content) throw new Error("Ollama returned an empty response.");
  return content;
}

export async function aiChat(input: {
  messages: Array<{ role: string; content: string }>;
  format: object;
}) {
  return aiProviderMode() === "vercel-ai-gateway"
    ? gatewayChat(input)
    : ollamaChat(input);
}

export async function aiHealth() {
  if (aiProviderMode() === "vercel-ai-gateway") {
    const response = await fetch(
      `${AI_GATEWAY_URL}/models/${encodeURIComponent(AI_MODEL)}`,
      {
        headers: { Authorization: `Bearer ${gatewayToken()}` },
        signal: AbortSignal.timeout(5_000),
        cache: "no-store",
      },
    );
    return response.ok;
  }

  const response = await fetch(`${OLLAMA_URL}/api/tags`, {
    signal: AbortSignal.timeout(2_500),
    cache: "no-store",
  });
  if (!response.ok) return false;
  const payload = (await response.json()) as {
    models?: Array<{ name: string }>;
  };
  const model = localModel();
  return Boolean(
    payload.models?.some(
      (item) => item.name === model || item.name.startsWith(`${model}:`),
    ),
  );
}

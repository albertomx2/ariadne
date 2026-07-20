import "server-only";

const GITHUB_MODELS_URL =
  process.env.GITHUB_MODELS_BASE_URL ?? "https://models.github.ai/inference";
const GITHUB_MODELS_CATALOG_URL = "https://models.github.ai/catalog/models";
const AI_GATEWAY_URL =
  process.env.AI_GATEWAY_BASE_URL ?? "https://ai-gateway.vercel.sh/v1";
const OLLAMA_URL =
  process.env.OLLAMA_BASE_URL ??
  process.env.OLLAMA_URL ??
  "http://127.0.0.1:11434";

export type AiProviderMode =
  | "github-models"
  | "vercel-ai-gateway"
  | "ollama";

function gatewayToken() {
  return process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN;
}

export function aiProviderMode(): AiProviderMode {
  if (process.env.GITHUB_MODELS_TOKEN) return "github-models";
  return gatewayToken() ? "vercel-ai-gateway" : "ollama";
}

export const AI_MODEL =
  aiProviderMode() === "github-models"
    ? (process.env.GITHUB_MODELS_MODEL ?? "openai/gpt-4.1-mini")
    : (process.env.AI_GATEWAY_MODEL ??
      process.env.OLLAMA_MODEL ??
      "openai/gpt-5-mini");

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

async function openAiCompatibleChat({
  messages,
  format,
  url,
  token,
  provider,
  extraHeaders = {},
}: {
  messages: Array<{ role: string; content: string }>;
  format: object;
  url: string;
  token: string;
  provider: string;
  extraHeaders?: Record<string, string>;
}) {
  const request = (strictSchema: boolean) =>
    fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        stream: false,
        temperature: 0,
        max_tokens: 1800,
        response_format: strictSchema
          ? {
              type: "json_schema",
              json_schema: {
                name: schemaName(format),
                description:
                  "An educator-reviewed Ariadne AAC and classroom-access draft.",
                schema: format,
                strict: true,
              },
            }
          : { type: "json_object" },
      }),
      signal: AbortSignal.timeout(45_000),
    });

  let response = await request(true);
  if (response.status === 400 || response.status === 422) {
    response = await request(false);
  }

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
        ? `${provider} returned ${response.status}: ${detail}`
        : `${provider} returned ${response.status}.`,
    );
  }
  const content = payload?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error(`${provider} returned an empty response.`);
  return content;
}

async function hostedChat(input: {
  messages: Array<{ role: string; content: string }>;
  format: object;
}) {
  if (aiProviderMode() === "github-models") {
    const token = process.env.GITHUB_MODELS_TOKEN;
    if (!token) throw new Error("GitHub Models is not configured.");
    return openAiCompatibleChat({
      ...input,
      url: `${GITHUB_MODELS_URL}/chat/completions`,
      token,
      provider: "GitHub Models",
      extraHeaders: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
      },
    });
  }

  const token = gatewayToken();
  if (!token) throw new Error("Vercel AI Gateway is not configured.");
  return openAiCompatibleChat({
    ...input,
    url: `${AI_GATEWAY_URL}/chat/completions`,
    token,
    provider: "Vercel AI Gateway",
  });
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
  return aiProviderMode() === "ollama" ? ollamaChat(input) : hostedChat(input);
}

export async function aiHealth() {
  if (aiProviderMode() === "github-models") {
    const response = await fetch(GITHUB_MODELS_CATALOG_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${process.env.GITHUB_MODELS_TOKEN}`,
        "X-GitHub-Api-Version": "2026-03-10",
      },
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (!response.ok) return false;
    const models = (await response.json()) as Array<{ id?: string }>;
    return models.some((model) => model.id === AI_MODEL);
  }

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

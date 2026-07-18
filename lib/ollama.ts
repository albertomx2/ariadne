import "server-only";

const OLLAMA_URL =
  process.env.OLLAMA_BASE_URL ??
  process.env.OLLAMA_URL ??
  "http://127.0.0.1:11434";
export const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL ?? "qwen2.5:7b";

export async function ollamaChat({
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
      model: OLLAMA_MODEL,
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

export async function ollamaHealth() {
  const response = await fetch(`${OLLAMA_URL}/api/tags`, {
    signal: AbortSignal.timeout(2_500),
    cache: "no-store",
  });
  if (!response.ok) return false;
  const payload = (await response.json()) as {
    models?: Array<{ name: string }>;
  };
  return Boolean(
    payload.models?.some(
      (model) =>
        model.name === OLLAMA_MODEL ||
        model.name.startsWith(`${OLLAMA_MODEL}:`),
    ),
  );
}

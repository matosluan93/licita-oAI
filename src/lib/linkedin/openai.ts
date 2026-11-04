export async function completeJson<T>({
  apiKey,
  system,
  user,
  maxTokens = 1800,
}: {
  apiKey: string;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<T> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      max_tokens: maxTokens,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error("Falha no serviço de análise.");
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('A IA nao retornou conteudo.');
  }

  return JSON.parse(content) as T;
}

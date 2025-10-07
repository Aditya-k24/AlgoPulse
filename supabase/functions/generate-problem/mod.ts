import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

interface GenerateRequest {
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  languages?: Array<"python" | "java" | "cpp">;
}

const SYSTEM_PROMPT = `You are an assistant that generates DSA problems.
Return strict JSON matching this schema:
{
  "title": string,
  "category": string,
  "difficulty": "Easy" | "Medium" | "Hard",
  "description": string,
  "sample_input": string,
  "sample_output": string,
  "constraints": string,
  "solutions": { "python": string, "java": string, "cpp": string },
  "methods": string[]
}`;

async function callOpenAI(apiKey: string, body: unknown): Promise<any> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(body) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });
  if (!resp.ok) throw new Error(`OpenAI error: ${resp.status}`);
  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content;
  return JSON.parse(content);
}

function validatePayload(p: any): boolean {
  if (!p || typeof p !== "object") return false;
  const hasSolutions = p.solutions && p.solutions.python && p.solutions.java && p.solutions.cpp;
  return (
    typeof p.title === "string" &&
    typeof p.category === "string" &&
    typeof p.difficulty === "string" &&
    typeof p.description === "string" &&
    hasSolutions
  );
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });

  const { category, difficulty, languages }: GenerateRequest = await req.json();
  if (!category || !difficulty) return new Response("Bad Request", { status: 400 });

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return new Response("Server Misconfigured", { status: 500 });

  try {
    const data = await callOpenAI(openaiKey, { category, difficulty, languages });
    if (!validatePayload(data)) return new Response("Invalid AI payload", { status: 502 });

    return new Response(JSON.stringify({ problem: data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

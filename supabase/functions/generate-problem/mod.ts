import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

interface GenerateRequest {
  category?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  languages?: Array<"python" | "java" | "cpp">;
  existingTitles?: string[];
  creativeHint?: string;
}

const SYSTEM_PROMPT = `You are an expert assistant that generates unique, creative DSA problems.
IMPORTANT: Each problem must be completely different and original. Avoid generating variations of classic problems like "Two Sum", "Valid Parentheses", etc.
Be creative with problem scenarios, themes, and edge cases.
If provided with existingTitles in the request, you MUST avoid creating any problem with a similar title or concept.
If provided with a creativeHint in the request, use it as inspiration to create a truly unique problem.
If category is specified, create a problem in that category. If not, choose any appropriate category.
If difficulty is specified, create a problem of that difficulty. If not, choose a difficulty that matches the problem's complexity.
Return strict JSON matching this schema:
{
  "title": string,
  "category": string,
  "difficulty": "Easy" | "Medium" | "Hard",
  "description": string,
  "sample_input": string,
  "sample_output": string,
  "constraints": string,
  "solutions": { "python": string, "java": string, "cpp": string, "javascript": string },
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
      temperature: 0.9,
    }),
  });
  if (!resp.ok) throw new Error(`OpenAI error: ${resp.status}`);
  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content;
  return JSON.parse(content);
}

function validatePayload(p: any): boolean {
  if (!p || typeof p !== "object") return false;
  const hasSolutions = p.solutions && p.solutions.python && p.solutions.java && p.solutions.cpp && p.solutions.javascript;
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

  const { category, difficulty, languages, existingTitles }: GenerateRequest = await req.json();
  
  // Default to random if not specified
  const finalCategory = category;
  const finalDifficulty = difficulty;

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return new Response("Server Misconfigured", { status: 500 });

  try {
    const creativeHints = [
      "Create a problem with a unique real-world scenario (e.g., scheduling, routing, resource allocation)",
      "Design a problem involving graph traversal with unusual constraints",
      "Generate a problem about array manipulation with creative edge cases",
      "Create a problem about string processing with interesting patterns",
      "Design a problem that requires multiple data structures working together",
      "Generate a problem inspired by a specific domain (gaming, networking, logistics, etc.)",
      "Create a problem with time/space optimization constraints",
      "Design a problem about mathematical sequences or number theory",
      "Generate a problem involving dynamic state tracking",
      "Create a problem with parallel or concurrent processing themes"
    ];
    
    const randomHint = creativeHints[Math.floor(Math.random() * creativeHints.length)];
    const requestBody: Record<string, unknown> = { 
      languages,
      creativeHint: randomHint,
      ...(existingTitles && existingTitles.length > 0 ? { existingTitles } : {}),
      ...(finalCategory ? { category: finalCategory } : {}),
      ...(finalDifficulty ? { difficulty: finalDifficulty } : {})
    };
    
    const data = await callOpenAI(openaiKey, requestBody);
    if (!validatePayload(data)) return new Response("Invalid AI payload", { status: 502 });

    return new Response(JSON.stringify({ problem: data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

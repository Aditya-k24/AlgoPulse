import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

interface ExecuteRequest {
  language: "python3" | "java" | "cpp";
  code: string;
  stdin?: string;
}

async function runViaJDoodle(req: ExecuteRequest, clientId: string, clientSecret: string) {
  const map: Record<string, { language: string; versionIndex: string }> = {
    python3: { language: "python3", versionIndex: "4" },
    java: { language: "java", versionIndex: "4" },
    cpp: { language: "cpp17", versionIndex: "0" },
  };
  const cfg = map[req.language];
  const resp = await fetch("https://api.jdoodle.com/v1/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: clientId,
      clientSecret: clientSecret,
      script: req.code,
      stdin: req.stdin ?? "",
      language: cfg.language,
      versionIndex: cfg.versionIndex,
    }),
  });
  if (!resp.ok) throw new Error(`JDoodle error: ${resp.status}`);
  return await resp.json();
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });

  const payload: ExecuteRequest = await req.json();
  if (!payload?.language || !payload?.code) return new Response("Bad Request", { status: 400 });

  const clientId = Deno.env.get("JDOODLE_CLIENT_ID");
  const clientSecret = Deno.env.get("JDOODLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) return new Response("Server Misconfigured", { status: 500 });

  try {
    const out = await runViaJDoodle(payload, clientId, clientSecret);
    return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

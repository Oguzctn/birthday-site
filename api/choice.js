const KEY = "birthday-choice";

async function redisCommand(command) {
  const endpoint = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;

  if (!endpoint || !token) {
    throw new Error("Upstash Redis is not connected to this Vercel project.");
  }

  const response = await fetch(`${endpoint.replace(/\/$/, "")}/${command}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) throw new Error("The shared choice store is unavailable.");
  return response.json();
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store, max-age=0");

  try {
    if (request.method === "GET") {
      const saved = await redisCommand(`get/${KEY}`);
      return response.status(200).json({ choice: saved.result || null });
    }

    if (request.method === "POST") {
      const { choice } = request.body || {};

      if (choice !== "paper" && choice !== "cosmos") {
        return response.status(400).json({ error: "Invalid choice." });
      }

      const saved = await redisCommand(`set/${KEY}/${choice}/NX`);

      if (saved.result === "OK") {
        return response.status(200).json({ choice, locked: true });
      }

      const existing = await redisCommand(`get/${KEY}`);
      return response
        .status(409)
        .json({ choice: existing.result || null, locked: true });
    }

    response.setHeader("Allow", "GET, POST");
    return response.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    return response
      .status(503)
      .json({ error: "Seçim kaydedilemedi. Lütfen tekrar deneyin." });
  }
}

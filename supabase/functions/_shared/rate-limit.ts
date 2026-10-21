// deno-lint-ignore-file no-explicit-any
// Verifie/incremente un compteur de requetes atomique (fonction SQL
// check_rate_limit). `admin` doit etre un client service_role (la table
// rate_limits n'a aucune policy RLS publique).

export async function isWithinRateLimit(
  admin: any,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // Ne bloque jamais un utilisateur legitime a cause d'une panne du
    // mecanisme de rate limiting lui-meme.
    console.error("rate limit check failed, allowing request", error);
    return true;
  }

  return data === true;
}

export function rateLimitKeyFor(userId: string | undefined, req: Request): string {
  if (userId) return `user:${userId}`;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
  return `anon:${ip}`;
}

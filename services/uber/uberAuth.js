const TOKEN_URL = "https://auth.uber.com/oauth/v2/token";

let cachedToken = null;
let tokenExpiresAt = 0;

const getUberAccessToken = async () => {
  // Reutiliza o token enquanto estiver válido.
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const { UBER_CLIENT_ID, UBER_CLIENT_SECRET } = process.env;

  if (!UBER_CLIENT_ID || !UBER_CLIENT_SECRET) {
    throw new Error("Credenciais do Uber Direct não configuradas");
  }

  const body = new URLSearchParams({
    client_id: UBER_CLIENT_ID,
    client_secret: UBER_CLIENT_SECRET,
    grant_type: "client_credentials",
    scope: "eats.deliveries direct.organizations"
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Falha na autenticação Uber:", {
      status: response.status,
      error: data.error,
      description: data.error_description
    });

    throw new Error("Não foi possível autenticar na Uber Direct");
  }

  if (!data.access_token) {
    throw new Error("A Uber não retornou um token de acesso");
  }

  cachedToken = data.access_token;

  // Margem de segurança de 60 segundos.
  const expiresIn = Number(data.expires_in || 3600);
  tokenExpiresAt =
    Date.now() + Math.max(0, expiresIn - 60) * 1000;

  return cachedToken;
};

module.exports = { getUberAccessToken };
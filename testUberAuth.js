
require("dotenv").config();

const { getUberAccessToken } =
  require("./services/uber/uberAuth");

async function test() {
  try {
    const token = await getUberAccessToken();

    console.log("Uber Direct autenticado com sucesso!");
    console.log("Token recebido:", Boolean(token));
  } catch (error) {
    console.error("Erro:", error.message);
    process.exitCode = 1;
  }
}

test();

const jwt = require("jsonwebtoken");
const Client = require("../models/clients");

module.exports = async (req, res, next) => {
  const { authorization } = req.headers;

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    return res.status(401).send({
      message: "Autorização necessária"
    });
  }

  const token = authorization.replace(
    "Bearer ",
    ""
  );

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    /*
     * O token do cliente deve possuir
     * o ID do cliente.
     *
     * Aceitamos _id ou id durante
     * essa transição.
     */
    if (payload.type !== "customer") {
        return res.status(403).send({
            message:
            "Token não pertence a um cliente"
        });
    }
    const clientId =
      payload._id ||
      payload.id ||
      payload.clientId;

    if (!clientId) {
      return res.status(401).send({
        message:
          "Token de cliente inválido"
      });
    }

    const client =
      await Client.findById(clientId);


    if (!client) {
      return res.status(401).send({
        message:
          "Cliente não encontrado"
      });
    }
    if (!client.active) {
        return res.status(403).send({
            message: "Conta do cliente desativada"
        });
    }

    req.client = client;

    return next();

  } catch (error) {
    return res.status(401).send({
      message: "Token inválido"
    });
  }
};
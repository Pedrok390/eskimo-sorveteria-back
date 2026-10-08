const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
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

    if (payload.type === "customer") {
      return res.status(403).send({
        message:
          "Acesso permitido apenas para funcionários"
      });
    }

    if (
      !["owner", "employee"].includes(
        payload.role
      )
    ) {
      return res.status(403).send({
        message:
          "Usuário sem permissão"
      });
    }

    req.user = payload;

    return next();

  } catch (error) {
    return res.status(401).send({
      message: "Token inválido"
    });
  }
};
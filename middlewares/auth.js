const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).send({
      message: "Autorização necessária"
    });
  }

  const token = authorization.replace("Bearer ", "");

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = payload;

    return next();
  } catch (err) {
    return res.status(401).send({
      message: "Token inválido"
    });
  }
};
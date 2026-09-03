module.exports = (req, res, next) => {
  if (req.user.role !== "owner") {
    return res.status(403).send({
      message: "Você não tem permissão para realizar esta ação"
    });
  }

  next();
};
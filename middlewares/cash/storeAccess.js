
const mongoose = require("mongoose");
const User = require("../../models/users");
const Store = require("../../models/stores");

const storeAccess = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const storeId = req.params.storeId || req.body?.storeId;

    if (!userId) {
      return res.status(401).json({
        message: "Usuário não autenticado"
      });
    }

    if (!storeId || !mongoose.isValidObjectId(storeId)) {
      return res.status(400).json({
        message: "ID da loja inválido"
      });
    }

    const user = await User.findById(userId);

    if (!user || !user.active) {
      return res.status(403).json({
        message: "Usuário sem acesso ao sistema"
      });
    }

    const store = await Store.findOne({
      _id: storeId,
      active: true
    });

    if (!store) {
      return res.status(404).json({
        message: "Loja não encontrada ou inativa"
      });
    }

    let hasAccess = false;

    if (user.role === "owner") {
      // O proprietário deve pertencer à loja.
      hasAccess = store.owners?.some(
        (ownerId) => ownerId.equals(user._id)
      );
    } else if (user.role === "employee") {
      // Funcionário acessa exclusivamente sua loja.
      hasAccess =
        user.store?.toString() === store._id.toString();
    }

    if (!hasAccess) {
      return res.status(403).json({
        message: "Você não tem permissão para acessar esta loja"
      });
    }

    // Dados validados para os próximos middlewares.
    req.store = store;
    req.currentUser = user;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = storeAccess;

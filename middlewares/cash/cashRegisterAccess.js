const mongoose = require("mongoose");
const CashRegister = require("../../models/cash/cashRegister");
const storeAccess = require("./storeAccess");

const cashRegisterAccess = async (req, res, next) => {
  try {
    const cashRegisterId =
      req.params.cashRegisterId ||
      req.body?.cashRegisterId;

    if (!mongoose.isValidObjectId(cashRegisterId)) {
      return res.status(400).json({
        message: "ID do terminal inválido"
      });
    }

    const cashRegister = await CashRegister.findOne({
      _id: cashRegisterId,
      active: true
    });

    if (!cashRegister) {
      return res.status(404).json({
        message: "Terminal não encontrado ou inativo"
      });
    }

    // A loja vem do banco, nunca do frontend.
    req.params.storeId = cashRegister.store.toString();

    // Guarda o terminal validado para o controller.
    req.cashRegister = cashRegister;

    return storeAccess(req, res, next);
  } catch (error) {
    return next(error);
  }
};

module.exports = cashRegisterAccess;
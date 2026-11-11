const mongoose = require("mongoose");

const CashRegister = require("../../models/cash/cashRegister");
const Store = require("../../models/stores");
const User = require("../../models/users");

const createCashRegister = async (req, res, next) => {
  try {
    const { storeId, name, code } = req.body;

    if (!mongoose.isValidObjectId(storeId)) {
      return res.status(400).json({
        message: "ID da loja inválido"
      });
    }

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof code !== "string" ||
      !code.trim()
    ) {
      return res.status(400).json({
        message: "Nome e código do terminal são obrigatórios"
      });
    }

    const user = await User.findById(req.user?._id);

    if (!user || !user.active || user.role !== "owner") {
      return res.status(403).json({
        message: "Somente proprietários podem cadastrar terminais"
      });
    }

    const store = await Store.findOne({
      _id: storeId,
      active: true,
      owners: user._id
    });

    if (!store) {
      return res.status(403).json({
        message: "Você não tem acesso a esta loja"
      });
    }

    const normalizedCode = code.trim().toUpperCase();

    const existingRegister = await CashRegister.findOne({
      store: store._id,
      code: normalizedCode
    });

    if (existingRegister) {
      return res.status(409).json({
        message: "Já existe um terminal com esse código nesta loja"
      });
    }

    const cashRegister = await CashRegister.create({
      store: store._id,
      name: name.trim(),
      code: normalizedCode,
      active: true
    });

    return res.status(201).json({
      message: "Terminal cadastrado com sucesso",
      cashRegister
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Já existe um terminal com esse código nesta loja"
      });
    }

    return next(error);
  }
};
const listCashRegisters = async (req, res, next) => {
  try {
    const cashRegisters = await CashRegister.find({
      store: req.store._id
    }).sort({ name: 1 });

    return res.status(200).json({
      cashRegisters
    });
  } catch (error) {
    next(error);
  }
};
module.exports = {
  createCashRegister,
  listCashRegisters
};
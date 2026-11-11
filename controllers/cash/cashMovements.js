
const mongoose = require("mongoose");

const CashSession = require("../../models/cash/cashSessions");
const CashMovement = require("../../models/cash/cashMovements");

const createCashMovement = async (req, res, next) => {
  try {
    const { cashSessionId, type, amount, reason } = req.body;

    if (!mongoose.isValidObjectId(cashSessionId)) {
      return res.status(400).json({
        message: "ID da sessão inválido"
      });
    }

    if (!["withdrawal", "supply"].includes(type)) {
      return res.status(400).json({
        message: "Tipo de movimentação inválido"
      });
    }

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return res.status(400).json({
        message: "Informe um valor positivo em centavos"
      });
    }

    if (typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({
        message: "O motivo é obrigatório"
      });
    }

    const cashSession = await CashSession.findOne({
      _id: cashSessionId,
      status: "open"
    });

    if (!cashSession) {
      return res.status(409).json({
        message: "Sessão de caixa não encontrada ou fechada"
      });
    }

    // A autorização deve usar a loja da sessão,
    // nunca um storeId enviado pelo cliente.
    if (
      cashSession.store.toString() !==
      req.store._id.toString()
    ) {
      return res.status(403).json({
        message: "Sessão não pertence à loja autorizada"
      });
    }

    if (
      cashSession.cashRegister.toString() !==
      req.cashRegister._id.toString()
    ) {
      return res.status(403).json({
        message: "Sessão não pertence ao terminal informado"
      });
    }

    const movement = await CashMovement.create({
      store: cashSession.store,
      cashRegister: cashSession.cashRegister,
      cashSession: cashSession._id,
      type,
      amount,
      reason: reason.trim(),
      performedBy: req.currentUser._id
    });

    return res.status(201).json({
      message:
        type === "withdrawal"
          ? "Sangria registrada com sucesso"
          : "Suprimento registrado com sucesso",
      movement
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCashMovement
};

const mongoose = require("mongoose");
const StockMovement = require("../models/stockMovements");
const moveStock = require("../utils/moveStock");

// ==========================================
// CRIAR MOVIMENTAÇÃO DE ESTOQUE
// ==========================================

module.exports.createStockMovement = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const {
      storeProductId,
      type,
      direction,
      quantity,
      reason
    } = req.body;

    // Tipos que podem ser criados manualmente
    const allowedTypes = [
      "purchase",
      "adjustment",
      "loss"
    ];

    if (!allowedTypes.includes(type)) {
      return res.status(400).send({
        message: "Tipo de movimentação inválido"
      });
    }

    // Compra sempre aumenta estoque
    if (type === "purchase" && direction !== "in") {
      return res.status(400).send({
        message: "Uma compra deve ser uma entrada de estoque"
      });
    }

    // Perda sempre diminui estoque
    if (type === "loss" && direction !== "out") {
      return res.status(400).send({
        message: "Uma perda deve ser uma saída de estoque"
      });
    }

    // Ajuste pode ser entrada ou saída
    if (!["in", "out"].includes(direction)) {
      return res.status(400).send({
        message: "Direção inválida"
      });
    }

    session.startTransaction();

    const result = await moveStock({
      storeProductId,
      type,
      direction,
      quantity,
      reason,
      employee: req.user._id,
      session
    });

    await session.commitTransaction();

    return res.status(201).send({
      message: "Movimentação realizada com sucesso",
      movement: result.movement,
      stockBefore: result.stockBefore,
      stockAfter: result.stockAfter
    });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    return next(error);

  } finally {
    await session.endSession();
  }
};


// ==========================================
// LISTAR MOVIMENTAÇÕES
// ==========================================

module.exports.getStockMovements = async (req, res, next) => {
  try {
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).send({
        message: "storeId é obrigatório"
      });
    }

    const movements = await StockMovement.find({
      store: storeId
    })
      .populate("product", "name category")
      .populate("employee", "name email")
      .populate("order", "_id channel status")
      .sort({
        createdAt: -1
      });

    return res.send(movements);

  } catch (error) {
    return next(error);
  }
};
const mongoose = require("mongoose");

const cashMovementSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true
    },

    cashRegister: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CashRegister",
      required: true
    },

    cashSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CashSession",
      required: true,
      index: true
    },

    type: {
      type: String,
      enum: ["withdrawal", "supply"],
      required: true
    },

    // Valor em centavos
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "O valor deve ser informado em centavos inteiros"
      }
    },

    reason: {
      type: String,
      required: true,
      trim: true
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

cashMovementSchema.index({
  cashSession: 1,
  createdAt: -1
});

module.exports = mongoose.model(
  "CashMovement",
  cashMovementSchema
);
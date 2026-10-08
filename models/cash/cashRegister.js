
const mongoose = require("mongoose");

const cashRegisterSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },

    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// O código do terminal deve ser único dentro de cada loja.
cashRegisterSchema.index(
  { store: 1, code: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "CashRegister",
  cashRegisterSchema
);

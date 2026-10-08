
const mongoose = require("mongoose");

const denominationSchema = new mongoose.Schema(
  {
    value: {
      type: Number,
      required: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "A quantidade deve ser um número inteiro"
      }
    }
  },
  { _id: false }
);

const cashRegisterSettingsSchema = new mongoose.Schema(
  {
    cashRegister: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CashRegister",
      required: true,
      unique: true
    },

    defaultBanknotes: {
        type: [denominationSchema],
        default: () => [
            { value: 50, quantity: 0 },
            { value: 20, quantity: 0 },
            { value: 10, quantity: 0 },
            { value: 5, quantity: 0 },
            { value: 2, quantity: 0 }
        ]
    },

    coinOpeningMode: {
      type: String,
      enum: ["previous_closing", "zero"],
      default: "previous_closing"
    },

    allowOpeningAdjustments: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "CashRegisterSettings",
  cashRegisterSettingsSchema
);

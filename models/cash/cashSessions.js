const mongoose = require("mongoose");

const DENOMINATIONS = [
  5000, // R$ 50,00
  2000, // R$ 20,00
  1000, // R$ 10,00
  500,  // R$ 5,00
  200,  // R$ 2,00
  100,  // R$ 1,00
  50,   // R$ 0,50
  25,   // R$ 0,25
  10,   // R$ 0,10
  5     // R$ 0,05
];

// Valores monetários armazenados em centavos.
// Exemplo: 2000 = R$ 20,00.

const denominationSchema = new mongoose.Schema(
  {
    value: {
      type: Number,
      required: true,
      enum: DENOMINATIONS
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "A quantidade deve ser inteira"
      }
    }
  },
  { _id: false }
);

const cashCountSchema = new mongoose.Schema(
  {
    denominations: {
      type: [denominationSchema],
      default: []
    },

    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const cashSessionSchema = new mongoose.Schema(
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
      required: true,
      index: true
    },

    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
      required: true
    },

    // ABERTURA

    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    openedAt: {
      type: Date,
      default: Date.now
    },

    openingCount: {
      type: cashCountSchema,
      required: true
    },

    // FECHAMENTO

    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    closedAt: {
      type: Date,
      default: null
    },

    closingCount: {
      type: cashCountSchema,
      default: null
    },

    // VALORES DO FECHAMENTO
    // Todos os valores monetários em centavos.

    expectedCash: {
      type: Number,
      default: null
    },

    cashDifference: {
      type: Number,
      default: null
    },

    differenceReason: {
      type: String,
      trim: true,
      default: ""
    },

    closingNotes: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

// Somente uma sessão aberta por terminal.
cashSessionSchema.index(
  { cashRegister: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "open"
    }
  }
);

cashSessionSchema.index({
  store: 1,
  openedAt: -1
});

module.exports = mongoose.model(
  "CashSession",
  cashSessionSchema
);
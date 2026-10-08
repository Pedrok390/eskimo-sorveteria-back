const mongoose = require("mongoose");

const stockMovementSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true
    },

    storeProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreProduct",
      required: true
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    type: {
      type: String,
      enum: [
        "purchase",
        "sale",
        "adjustment",
        "loss",
        "return"
      ],
      required: true
    },

    direction: {
      type: String,
      enum: ["in", "out"],
      required: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.001
    },

    stockBefore: {
      type: Number,
      required: true,
      min: 0
    },

    stockAfter: {
      type: Number,
      required: true,
      min: 0
    },

    reason: {
      type: String,
      default: ""
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null
    },

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    factoryOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FactoryOrder",
        default: null
    }
  },
  {
    timestamps: true
  }
);

stockMovementSchema.index({
  store: 1,
  createdAt: -1
});

stockMovementSchema.index({
  storeProduct: 1,
  createdAt: -1
});

stockMovementSchema.index({
  product: 1,
  createdAt: -1
});

stockMovementSchema.index({
  order: 1
});

module.exports = mongoose.model(
  "StockMovement",
  stockMovementSchema
);
const mongoose = require("mongoose");

const storeProductSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    costPrice: {
      type: Number,
      default: 0,
      min: 0
    },

    stock: {
      type: Number,
      default: 0,
      min: 0
    },

    minimumStock: {
      type: Number,
      default: 0,
      min: 0
    },

    available: {
      type: Boolean,
      default: true
    },
    
    availableOnline: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

storeProductSchema.index(
  {
    store: 1,
    product: 1
  },
  {
    unique: true
  }
);

module.exports = mongoose.model(
  "StoreProduct",
  storeProductSchema
);
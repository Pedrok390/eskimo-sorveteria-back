const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    // Onde a promoção será aplicada
    scope: {
      type: String,
      enum: [
        "product",
        "category"
      ],
      required: true
    },

    // Usado quando scope = product
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null
    },

    // Temporariamente String.
    // Depois poderemos criar o model Category.
    category: {
      type: String,
      default: null
    },

    minimumQuantity: {
      type: Number,
      default: 1,
      min: 1
    },

    discountType: {
      type: String,
      enum: [
        "fixed_price",
        "percentage"
      ],
      required: true
    },

    // Ex.: cada picolé passa a custar R$ 2,50
    promotionalPrice: {
      type: Number,
      default: null,
      min: 0
    },

    // Ex.: 10% de desconto
    percentage: {
      type: Number,
      default: null,
      min: 0,
      max: 100
    },

    startsAt: {
      type: Date,
      default: null
    },

    endsAt: {
      type: Date,
      default: null
    },

    active: {
      type: Boolean,
      default: true
    },

    // Define onde a promoção funciona
    channels: {
      store: {
        type: Boolean,
        default: true
      },

      online: {
        type: Boolean,
        default: true
      }
    }
  },
  {
    timestamps: true
  }
);

promotionSchema.index({
  store: 1,
  active: 1
});

promotionSchema.index({
  store: 1,
  product: 1
});

promotionSchema.index({
  store: 1,
  category: 1
});

module.exports = mongoose.model(
  "Promotion",
  promotionSchema
);
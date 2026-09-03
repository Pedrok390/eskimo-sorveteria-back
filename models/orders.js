const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema(
  {
    customer: {
      name: {
        type: String,
        required: true
      },

      phone: {
        type: String,
        required: true
      },

      address: {
        street: String,
        number: String,
        complement: String,
        neighborhood: String,
        city: String,
        state: String,
        zipCode: String
      }
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },

        name: {
          type: String,
          required: true
        },

        quantity: {
          type: Number,
          required: true,
          min: 1
        },

        unitPrice: {
          type: Number,
          required: true
        },

        subtotal: {
          type: Number,
          required: true
        },

        saleApplied: {
          type: Boolean,
          default: false
        }
      }
    ],

    subtotal: Number,

    deliveryFee: {
      type: Number,
      default: 0
    },

    total: Number,

    paymentMethod: {
      type: String,
      enum: ["pix"]
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "out_for_delivery",
        "completed",
        "cancelled"
      ],
      default: "pending"
    },

    notes: String
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Order",orderSchema)
const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },

    active: {
      type: Boolean,
      default: true
    },

    address: {
      street: {
        type: String,
        default: ""
      },

      number: {
        type: String,
        default: ""
      },

      complement: {
        type: String,
        default: ""
      },

      neighborhood: {
        type: String,
        default: ""
      },

      city: {
        type: String,
        default: ""
      },

      state: {
        type: String,
        default: ""
      },

      zipCode: {
        type: String,
        default: ""
      }
    },
    onlineOrderSettings: {
      serviceFee: {
        enabled: {
          type: Boolean,
          default: false
        },

        type: {
          type: String,
          enum: [
            "percentage",
            "fixed"
          ],
          default: "percentage"
        },

        value: {
          type: Number,
          default: 0,
          min: 0
        }
      }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Store", storeSchema);
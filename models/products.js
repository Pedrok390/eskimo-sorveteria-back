const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    category: {
      type: String,
      required: true
    },

    price: {
      type: Number,
      required: true
    },

    sale: {
      promotionalPrice: {
        type: Number,
        default: null,
        min: 0
      },

      quantity: {
        type: Number,
        default: 0,
        min: 0
      }
    },

    description: {
      type: String,
      default: ""
    },

    image: {
      url: {
        type: String,
        default: null,
      },

      publicId: {
        type: String,
        default: null,
      }
    },

    available: {
      type: Boolean,
      default: true
    },

    ingredients: {
      type: String,
      default: ""
    },

    allergy: {
      type: [String],
      default: []
    },

    gluten: {
      type: String,
      enum: [
        "CONTÉM GLÚTEN",
        "NÃO CONTÉM GLÚTEN",
        "PODE CONTER GLÚTEN"
      ],
      default: "NÃO CONTÉM GLÚTEN"
    },

    nutrition: {
      portion: {
        amount: Number,
        unit: String,
        description: String
      },

      values: {
        energy: {
          per100g: Number,
          perPortion: Number,
          dailyValue: Number
        },

        carbohydrates: {
          per100g: Number,
          perPortion: Number,
          dailyValue: Number
        },

        totalSugars: {
          per100g: Number,
          perPortion: Number,
          dailyValue: Number
        },

        addedSugars: {
          per100g: Number,
          perPortion: Number,
          dailyValue: Number
        },

        proteins: {
          per100g: Number,
          perPortion: Number,
          dailyValue: Number
        },

        totalFat: {
          per100g: Number,
          perPortion: Number,
          dailyValue: Number
        },

        saturatedFat: {
          per100g: Number,
          perPortion: Number,
          dailyValue: Number
        },

        transFat: {
          per100g: Number,
          perPortion: Number,
          dailyValue: Number
        },

        fiber: {
          per100g: Number,
          perPortion: Number,
          dailyValue: Number
        },

        sodium: {
          per100g: Number,
          perPortion: Number,
          dailyValue: Number
        }
      }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Product", productSchema);
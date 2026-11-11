const mongoose = require("mongoose");

const storeWebsiteSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      unique: true
    },

    enabled: {
      type: Boolean,
      default: false
    },

    domain: {
      type: String,
      trim: true,
      lowercase: true
    },

    title: {
      type: String,
      trim: true
    },

    theme: {
      primaryColor: String,
      secondaryColor: String,
      logoUrl: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "StoreWebsite",
  storeWebsiteSchema
);
const mongoose = require("mongoose");

const loginCodeSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true
  },

  type: {
    type: String,
    enum: ["email", "sms"],
    required: true
  },

  codeHash: {
    type: String,
    required: true
  },

  expiresAt: {
    type: Date,
    required: true
  },
  
  attempts: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model("LoginCode", loginCodeSchema);
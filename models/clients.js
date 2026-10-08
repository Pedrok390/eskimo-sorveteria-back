const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const addressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      default: "Casa"
    },

    street: {
      type: String,
      required: true
    },

    number: {
      type: String,
      required: true
    },

    complement: {
      type: String,
      default: ""
    },

    neighborhood: {
      type: String,
      required: true
    },

    city: {
      type: String,
      required: true
    },

    state: {
      type: String,
      required: true
    },

    zipCode: {
      type: String,
      required: true
    },

    reference: {
      type: String,
      default: ""
    }
  },
  {
    _id: true
  }
);

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    phone: {
      type: String,
      required: true
    },

    addresses: {
      type: [addressSchema],
      default: []
    },

    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

clientSchema.statics.findUserByCredentials = function (email, password) {
  return this.findOne({ email }).select('+password')
    .then((user) => {
      if (!user) {
        return Promise.reject(new Error('Senha ou e-mail incorreto'));
      }

      return bcrypt.compare(password, user.password)
        .then((matched) => {
          if (!matched) {
            return Promise.reject(new Error('Senha ou e-mail incorreto'));
          }

          return user;
        });
    });
};
module.exports = mongoose.model("Client", clientSchema);
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("../models/users");

async function createOwner() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const hashedPassword = await bcrypt.hash(
      "pedro123",
      10
    );

    const owner = await User.create({
      name: "Pedro Henrique da Costa",
      email: "pedrocostamelo.henrique91@gmail.com",
      password: hashedPassword,
      role: "owner",
      active: true
    });

    console.log("Owner criado:");
    console.log(owner.email);

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

createOwner();
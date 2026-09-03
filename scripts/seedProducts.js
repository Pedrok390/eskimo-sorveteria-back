require("dotenv").config();

const mongoose = require("mongoose");
const Product = require("../models/products");
const products = require("../data/products_seed");

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    await Product.insertMany(products);

    console.log("Produtos importados!");

    await mongoose.disconnect();
  })
  .catch(console.error);
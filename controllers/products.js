const Product = require("../models/products");
const uploadImage = require("../utils/uploadImage");
const cloudinary = require("../utils/cloudinary.js");

module.exports.getProducts = (req, res, next) => {
  Product.find({})
    .then((products) => {
      res.send(products);
    })
    .catch(next);
};

module.exports.getProductById = (req, res, next) => {
  Product.findById(req.params.productId)
    .then((product) => {
      if (!product) {
        return res.status(404).send({
          message: "Produto não encontrado"
        });
      }

      return res.send(product);
    })
    .catch(next);
};

module.exports.createProduct = async (req, res, next) => {
  try {
    const {
      name,
      category,
      price,
      description,
      available,
      ingredients,
      gluten
    } = req.body;

    const sale = req.body.sale
      ? JSON.parse(req.body.sale)
      :{
          promotionalPrice: null,
          quantity: 0
        };

    // =========================
    // ALÉRGENOS
    // =========================

    const allergy = req.body.allergy
      ? JSON.parse(req.body.allergy)
      : [];


    // =========================
    // TABELA NUTRICIONAL
    // =========================

    const nutrition = req.body.nutrition
      ? JSON.parse(req.body.nutrition)
      : null;


    // =========================
    // IMAGEM
    // =========================

    if (!req.file) {
      return res.status(400).send({
        message: "Imagem do produto é obrigatória"
      });
    }

    const cloudinaryResult = await uploadImage(
      req.file.buffer
    );


    // =========================
    // CRIAR PRODUTO
    // =========================

    const product = await Product.create({
      name,

      category,

      price: Number(price),

      description,

      available: available === "true",

      ingredients,

      allergy,

      gluten,

      nutrition,

      sale,

      image: {
        url: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id
      }

    });


    return res.status(201).send(product);

  } catch (error) {
    return next(error);
  }
};

module.exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(
      req.params.productId
    );

    if (!product) {
      return res.status(404).send({
        message: "Produto não encontrado"
      });
    }

    const {
      name,
      category,
      price,
      description,
      available,
      ingredients,
      gluten
    } = req.body;

    const sale = req.body.sale
      ? JSON.parse(req.body.sale)
      : product.sale;

    const allergy = req.body.allergy
      ? JSON.parse(req.body.allergy)
      : product.allergy;

    const nutrition = req.body.nutrition
      ? JSON.parse(req.body.nutrition)
      : product.nutrition;

    let image = product.image;

    // Se veio uma nova imagem
    if (req.file) {
      const cloudinaryResult = await uploadImage(
        req.file.buffer
      );

      image = {
        url: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id
      };

      // apaga a antiga
      if (product.image?.publicId) {
        await cloudinary.uploader.destroy(
          product.image.publicId
        );
      }
    }

    const updatedProduct =
      await Product.findByIdAndUpdate(
        req.params.productId,
        {
          name,
          category,
          price: Number(price),

          sale,

          description,

          available: available === "true",

          ingredients,

          allergy,

          gluten,

          nutrition,

          image
        },
        {
          returnDocument: "after",
          runValidators: true
        }
      );

    return res.send(updatedProduct);

  } catch (error) {
    console.error(
      "ERRO UPDATE PRODUCT:",
      error
    );

    return next(error);
  }
};
module.exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(
      req.params.productId
    );

    if (!product) {
      return res.status(404).send({
        message: "Produto não encontrado"
      });
    }

    if (product.image?.publicId) {
      await cloudinary.uploader.destroy(
        product.image.publicId
      );
    }

    await Product.findByIdAndDelete(
      req.params.productId
    );

    return res.send({
      message: "Produto excluído com sucesso"
    });

  } catch (error) {
    return next(error);
  }
  
};

module.exports.updateAvailability = (req, res, next) => {
  const { available } = req.body;

  Product.findByIdAndUpdate(
    req.params.productId,
    {
      available
    },
    {
      new: true,
      runValidators: true
    }
  )
    .then((product) => {
      if (!product) {
        return res.status(404).send({
          message: "Produto não encontrado"
        });
      }

      return res.send(product);
    })
    .catch(next);
};
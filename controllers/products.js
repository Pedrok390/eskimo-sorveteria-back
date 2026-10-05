const Product = require("../models/products");
const uploadImage = require("../utils/uploadImage");
const cloudinary = require("../utils/cloudinary.js");
const StoreProduct = require("../models/storeProducts");

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
  let cloudinaryResult = null;
  let product = null;

  try {
    const {
      name,
      category,
      price,
      costPrice,
      stock,
      minimumStock,
      storeId,
      description,
      available,
      availableOnline,
      ingredients,
      gluten
    } = req.body;

    // =========================
    // VALIDAR LOJA
    // =========================

    if (!storeId) {
      return res.status(400).send({
        message: "A loja é obrigatória"
      });
    }

    // =========================
    // PROMOÇÃO ANTIGA
    // Temporariamente mantida
    // =========================

    const sale = req.body.sale
      ? JSON.parse(req.body.sale)
      : {
          promotionalPrice: null,
          quantity: 0
        };

    // =========================
    // ALÉRGENOS
    // Temporariamente mantido
    // =========================

    const allergy = req.body.allergy
      ? JSON.parse(req.body.allergy)
      : [];

    // =========================
    // IMAGEM
    // =========================

    if (!req.file) {
      return res.status(400).send({
        message: "Imagem do produto é obrigatória"
      });
    }

    cloudinaryResult = await uploadImage(
      req.file.buffer
    );

    // =========================
    // CRIAR PRODUCT
    // =========================

    product = await Product.create({
      name,

      category,

      // Mantido temporariamente
      price: Number(price),

      description,

      // Mantido temporariamente
      available: available === "true",

      ingredients,

      allergy,

      gluten,

      // Mantido temporariamente
      sale,

      image: {
        url: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id
      }
    });

    // =========================
    // CRIAR STORE PRODUCT
    // =========================

    const storeProduct = await StoreProduct.create({
      store: storeId,

      product: product._id,

      price: Number(price),

      costPrice:
        costPrice !== undefined && costPrice !== ""
          ? Number(costPrice)
          : 0,

      stock:
        stock !== undefined && stock !== ""
          ? Number(stock)
          : 0,

      minimumStock:
        minimumStock !== undefined &&
        minimumStock !== ""
          ? Number(minimumStock)
          : 0,

      available:
        available === undefined
          ? true
          : available === "true",

      availableOnline:
        availableOnline === undefined
          ? true
          : availableOnline === "true"
    });

    return res.status(201).send({
      product,
      storeProduct
    });

  } catch (error) {

    // =========================
    // ROLLBACK
    // =========================

    // Se Product foi criado mas
    // StoreProduct falhou
    if (product?._id) {
      try {
        await Product.findByIdAndDelete(
          product._id
        );
      } catch (rollbackError) {
        console.error(
          "Erro ao remover Product durante rollback:",
          rollbackError
        );
      }
    }

    // Se imagem foi enviada para Cloudinary
    // mas o cadastro falhou
    if (cloudinaryResult?.public_id) {
      try {
        await cloudinary.uploader.destroy(
          cloudinaryResult.public_id
        );
      } catch (rollbackError) {
        console.error(
          "Erro ao remover imagem durante rollback:",
          rollbackError
        );
      }
    }

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
      costPrice,
      stock,
      minimumStock,
      storeId,
      description,
      available,
      availableOnline,
      ingredients,
      gluten
    } = req.body;

    // =========================
    // VALIDAR LOJA
    // =========================

    if (!storeId) {
      return res.status(400).send({
        message: "A loja é obrigatória"
      });
    }

    // =========================
    // LOCALIZAR STORE PRODUCT
    // =========================

    const storeProduct = await StoreProduct.findOne({
      store: storeId,
      product: product._id
    });

    if (!storeProduct) {
      return res.status(404).send({
        message: "Produto não encontrado nesta loja"
      });
    }

    // =========================
    // CAMPOS ANTIGOS
    // =========================

    const sale = req.body.sale
      ? JSON.parse(req.body.sale)
      : product.sale;

    const allergy = req.body.allergy
      ? JSON.parse(req.body.allergy)
      : product.allergy;

    // =========================
    // IMAGEM
    // =========================

    let image = product.image;
    let oldImagePublicId = null;

    if (req.file) {
      const cloudinaryResult = await uploadImage(
        req.file.buffer
      );

      image = {
        url: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id
      };

      oldImagePublicId = product.image?.publicId;
    }

    // =========================
    // ATUALIZAR PRODUCT
    // =========================

    const productUpdate = {
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(description !== undefined && { description }),
      ...(ingredients !== undefined && { ingredients }),
      ...(gluten !== undefined && { gluten }),

      allergy,
      sale,
      image
    };

    // TRANSIÇÃO:
    // Product ainda mantém price e available
    if (price !== undefined && price !== "") {
      productUpdate.price = Number(price);
    }

    if (available !== undefined) {
      productUpdate.available =
        available === true ||
        available === "true";
    }

    const updatedProduct =
      await Product.findByIdAndUpdate(
        product._id,
        {
          $set: productUpdate
        },
        {
          new: true,
          runValidators: true
        }
      );

    // =========================
    // ATUALIZAR STORE PRODUCT
    // =========================

    const storeProductUpdate = {};

    if (price !== undefined && price !== "") {
      storeProductUpdate.price = Number(price);
    }

    if (
      costPrice !== undefined &&
      costPrice !== ""
    ) {
      storeProductUpdate.costPrice =
        Number(costPrice);
    }

    if (
      stock !== undefined &&
      stock !== ""
    ) {
      storeProductUpdate.stock =
        Number(stock);
    }

    if (
      minimumStock !== undefined &&
      minimumStock !== ""
    ) {
      storeProductUpdate.minimumStock =
        Number(minimumStock);
    }

    if (available !== undefined) {
      storeProductUpdate.available =
        available === true ||
        available === "true";
    }

    if (availableOnline !== undefined) {
      storeProductUpdate.availableOnline =
        availableOnline === true ||
        availableOnline === "true";
    }

    const updatedStoreProduct =
      await StoreProduct.findByIdAndUpdate(
        storeProduct._id,
        {
          $set: storeProductUpdate
        },
        {
          new: true,
          runValidators: true
        }
      ).populate("product");

    // =========================
    // APAGAR IMAGEM ANTIGA
    // =========================

    // Só apagamos depois que as atualizações
    // do banco terminaram corretamente.
    if (oldImagePublicId) {
      try {
        await cloudinary.uploader.destroy(
          oldImagePublicId
        );
      } catch (cloudinaryError) {
        console.error(
          "Erro ao apagar imagem antiga:",
          cloudinaryError
        );
      }
    }

    return res.send({
      product: updatedProduct,
      storeProduct: updatedStoreProduct
    });

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

    // =========================
    // REMOVER STORE PRODUCTS
    // =========================

    const storeProductsResult =
      await StoreProduct.deleteMany({
        product: product._id
      });

    // =========================
    // REMOVER PRODUCT
    // =========================

    await Product.findByIdAndDelete(
      product._id
    );

    // =========================
    // REMOVER IMAGEM
    // =========================

    if (product.image?.publicId) {
      try {
        await cloudinary.uploader.destroy(
          product.image.publicId
        );
      } catch (cloudinaryError) {
        console.error(
          "Erro ao remover imagem do Cloudinary:",
          cloudinaryError
        );
      }
    }

    return res.send({
      message: "Produto excluído com sucesso",
      storeProductsRemoved:
        storeProductsResult.deletedCount
    });

  } catch (error) {
    return next(error);
  }
};

module.exports.updateAvailability = async (req, res, next) => {
  try {
    const {
      available,
      availableOnline,
      storeId
    } = req.body;

    // =========================
    // VALIDAR LOJA
    // =========================

    if (!storeId) {
      return res.status(400).send({
        message: "A loja é obrigatória"
      });
    }

    // =========================
    // LOCALIZAR STORE PRODUCT
    // =========================

    const storeProduct = await StoreProduct.findOne({
      store: storeId,
      product: req.params.productId
    });

    if (!storeProduct) {
      return res.status(404).send({
        message: "Produto não encontrado nesta loja"
      });
    }

    // =========================
    // ATUALIZAR STORE PRODUCT
    // =========================

    if (available !== undefined) {
      storeProduct.available =
        available === true ||
        available === "true";
    }

    if (availableOnline !== undefined) {
      storeProduct.availableOnline =
        availableOnline === true ||
        availableOnline === "true";
    }

    await storeProduct.save();

    // =========================
    // COMPATIBILIDADE TEMPORÁRIA
    // =========================

    if (available !== undefined) {
      await Product.findByIdAndUpdate(
        req.params.productId,
        {
          available:
            available === true ||
            available === "true"
        }
      );
    }

    return res.send(storeProduct);

  } catch (error) {
    return next(error);
  }
};
const StoreProduct = require("../models/storeProducts");

// Lista os produtos de uma loja
module.exports.getStoreProducts = (req, res, next) => {
  const { storeId } = req.params;

  StoreProduct.find({
    store: storeId
  })
    .populate("product")
    .then((storeProducts) => {
      res.send(storeProducts);
    })
    .catch(next);
};

// Busca um produto específico de uma loja
module.exports.getStoreProductById = (req, res, next) => {
  const { storeProductId } = req.params;

  StoreProduct.findById(storeProductId)
    .populate("product")
    .then((storeProduct) => {
      if (!storeProduct) {
        return res.status(404).send({
          message: "Produto da loja não encontrado"
        });
      }

      return res.send(storeProduct);
    })
    .catch(next);
};

// Atualiza informações comerciais do produto
module.exports.updateStoreProduct = (req, res, next) => {
  const { storeProductId } = req.params;

  const {
    price,
    costPrice,
    stock,
    minimumStock,
    available,
    availableOnline
  } = req.body;

  StoreProduct.findByIdAndUpdate(
    storeProductId,
    {
      $set: {
        ...(price !== undefined && { price }),
        ...(costPrice !== undefined && { costPrice }),
        ...(stock !== undefined && { stock }),
        ...(minimumStock !== undefined && { minimumStock }),
        ...(available !== undefined && { available }),
        ...(availableOnline !== undefined && { availableOnline })
      }
    },
    {
      new: true,
      runValidators: true
    }
  )
    .populate("product")
    .then((storeProduct) => {
      if (!storeProduct) {
        return res.status(404).send({
          message: "Produto da loja não encontrado"
        });
      }

      return res.send(storeProduct);
    })
    .catch(next);
};
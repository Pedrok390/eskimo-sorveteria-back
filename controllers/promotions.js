const Promotion = require("../models/promotions");
const Store = require("../models/stores");
const Product = require("../models/products");

module.exports.getPromotions = async (req, res, next) => {
  try {
    const { storeId } = req.params;

    const promotions = await Promotion.find({
      store: storeId
    })
      .populate("product")
      .sort({
        createdAt: -1
      });

    return res.send(promotions);

  } catch (error) {
    return next(error);
  }
};


module.exports.getPromotionById = async (req, res, next) => {
  try {
    const promotion = await Promotion.findById(
      req.params.promotionId
    ).populate("product");

    if (!promotion) {
      return res.status(404).send({
        message: "Promoção não encontrada"
      });
    }

    return res.send(promotion);

  } catch (error) {
    return next(error);
  }
};


module.exports.createPromotion = async (req, res, next) => {
  try {
    const {
      storeId,
      name,
      scope,
      product,
      category,
      minimumQuantity,
      discountType,
      promotionalPrice,
      percentage,
      startsAt,
      endsAt,
      active,
      channels
    } = req.body;

    // =========================
    // VALIDAR LOJA
    // =========================

    const store = await Store.findById(storeId);

    if (!store) {
      return res.status(404).send({
        message: "Loja não encontrada"
      });
    }

    // =========================
    // VALIDAR ESCOPO
    // =========================

    if (scope === "product") {
      if (!product) {
        return res.status(400).send({
          message:
            "Produto é obrigatório para promoção por produto"
        });
      }

      const existingProduct =
        await Product.findById(product);

      if (!existingProduct) {
        return res.status(404).send({
          message: "Produto não encontrado"
        });
      }
    }

    if (scope === "category" && !category) {
      return res.status(400).send({
        message:
          "Categoria é obrigatória para promoção por categoria"
      });
    }

    // =========================
    // VALIDAR DESCONTO
    // =========================

    if (
      discountType === "fixed_price" &&
      (
        promotionalPrice === undefined ||
        promotionalPrice === null
      )
    ) {
      return res.status(400).send({
        message:
          "Preço promocional é obrigatório"
      });
    }

    if (
      discountType === "percentage" &&
      (
        percentage === undefined ||
        percentage === null
      )
    ) {
      return res.status(400).send({
        message:
          "Percentual é obrigatório"
      });
    }

    // =========================
    // VALIDAR DATAS
    // =========================

    if (
      startsAt &&
      endsAt &&
      new Date(endsAt) < new Date(startsAt)
    ) {
      return res.status(400).send({
        message:
          "A data final não pode ser anterior à data inicial"
      });
    }

    // =========================
    // CRIAR PROMOÇÃO
    // =========================

    const promotion = await Promotion.create({
      store: storeId,

      name,

      scope,

      product:
        scope === "product"
          ? product
          : null,

      category:
        scope === "category"
          ? category
          : null,

      minimumQuantity:
        minimumQuantity !== undefined
          ? Number(minimumQuantity)
          : 1,

      discountType,

      promotionalPrice:
        discountType === "fixed_price"
          ? Number(promotionalPrice)
          : null,

      percentage:
        discountType === "percentage"
          ? Number(percentage)
          : null,

      startsAt:
        startsAt || null,

      endsAt:
        endsAt || null,

      active:
        active !== undefined
          ? active
          : true,

      channels: channels || {
        store: true,
        online: true
      }
    });

    return res.status(201).send(promotion);

  } catch (error) {
    return next(error);
  }
};

module.exports.updatePromotion = async (
  req,
  res,
  next
) => {
  try {
    const promotion =
      await Promotion.findById(
        req.params.promotionId
      );

    if (!promotion) {
      return res.status(404).send({
        message: "Promoção não encontrada"
      });
    }

    const {
      name,
      minimumQuantity,
      promotionalPrice,
      percentage,
      startsAt,
      endsAt,
      active,
      channels
    } = req.body;

    if (name !== undefined) {
      promotion.name = name;
    }

    if (minimumQuantity !== undefined) {
      promotion.minimumQuantity =
        Number(minimumQuantity);
    }

    if (
      promotion.discountType ===
        "fixed_price" &&
      promotionalPrice !== undefined
    ) {
      promotion.promotionalPrice =
        Number(promotionalPrice);
    }

    if (
      promotion.discountType ===
        "percentage" &&
      percentage !== undefined
    ) {
      promotion.percentage =
        Number(percentage);
    }

    if (startsAt !== undefined) {
      promotion.startsAt =
        startsAt || null;
    }

    if (endsAt !== undefined) {
      promotion.endsAt =
        endsAt || null;
    }

    if (
      promotion.startsAt &&
      promotion.endsAt &&
      promotion.endsAt <
        promotion.startsAt
    ) {
      return res.status(400).send({
        message:
          "A data final não pode ser anterior à data inicial"
      });
    }

    if (active !== undefined) {
      promotion.active = active;
    }

    if (channels !== undefined) {
      promotion.channels = {
        ...promotion.channels.toObject(),
        ...channels
      };
    }

    await promotion.save();

    return res.send(promotion);

  } catch (error) {
    return next(error);
  }
};
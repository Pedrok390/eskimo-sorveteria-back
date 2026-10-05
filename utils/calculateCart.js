const StoreProduct = require("../models/storeProducts");
const Promotion = require("../models/promotions");
const Store = require("../models/stores");

async function calculateCart({
  storeId,
  items,
  channel,
  discount = null,
  surcharge = null,
  deliveryFee = 0
}) {
  // =========================
  // VALIDAÇÕES
  // =========================

  if (!storeId) {
    throw new Error("Loja é obrigatória");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Carrinho vazio");
  }

  if (!["store", "online"].includes(channel)) {
    throw new Error("Canal de venda inválido");
  }

  const store = await Store.findById(storeId);

  if (!store || !store.active) {
    throw new Error("Loja não encontrada ou inativa");
  }

  // Ajustes manuais não podem vir do site
  if (
    channel === "online" &&
    (discount || surcharge)
  ) {
    throw new Error(
      "Pedidos online não permitem desconto ou acréscimo manual"
    );
  }

  // =========================
  // NORMALIZAR ITENS
  // =========================

  const normalizedItems = items.map((item) => {
    const quantity = Number(item.quantity);

    if (
      !item.productId ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      throw new Error("Item do carrinho inválido");
    }

    return {
      productId: item.productId.toString(),
      quantity
    };
  });

  /*
   * Evita o mesmo produto chegar duas vezes:
   *
   * [
   *   { productId: "A", quantity: 2 },
   *   { productId: "A", quantity: 3 }
   * ]
   *
   * vira:
   *
   * A = 5
   */

  const groupedItems = new Map();

  for (const item of normalizedItems) {
    const current =
      groupedItems.get(item.productId) || 0;

    groupedItems.set(
      item.productId,
      current + item.quantity
    );
  }

  const finalItems = Array.from(
    groupedItems.entries()
  ).map(([productId, quantity]) => ({
    productId,
    quantity
  }));

  const productIds = finalItems.map(
    (item) => item.productId
  );

  // =========================
  // STORE PRODUCTS
  // =========================

  const storeProducts = await StoreProduct.find({
    store: storeId,

    product: {
      $in: productIds
    }
  }).populate("product");

  if (
    storeProducts.length !==
    productIds.length
  ) {
    throw new Error(
      "Um ou mais produtos não pertencem a esta loja"
    );
  }

  // =========================
  // MONTAR ITENS
  // =========================

  const calculatedItems = finalItems.map(
    (item) => {
      const storeProduct =
        storeProducts.find(
          (sp) =>
            sp.product._id.toString() ===
            item.productId
        );

      if (!storeProduct.available) {
        throw new Error(
          `${storeProduct.product.name} não está disponível`
        );
      }

      if (
        channel === "online" &&
        !storeProduct.availableOnline
      ) {
        throw new Error(
          `${storeProduct.product.name} não está disponível no site`
        );
      }

      /*
       * Por enquanto validamos estoque aqui.
       * Depois o PDV offline terá tratamento próprio.
       */
      if (
        storeProduct.stock <
        item.quantity
      ) {
        throw new Error(
          `Estoque insuficiente para ${storeProduct.product.name}`
        );
      }

      return {
        product:
          storeProduct.product._id,

        name:
          storeProduct.product.name,

        category:
          storeProduct.product.category,

        quantity:
          item.quantity,

        originalUnitPrice:
          Number(storeProduct.price),

        unitPrice:
          Number(storeProduct.price),

        promotion:
          null
      };
    }
  );

  // =========================
  // PROMOÇÕES VÁLIDAS
  // =========================

  const now = new Date();

  const promotions = await Promotion.find({
    store: storeId,

    active: true,

    [`channels.${channel}`]: true,

    $and: [
      {
        $or: [
          { startsAt: null },
          {
            startsAt: {
              $lte: now
            }
          }
        ]
      },

      {
        $or: [
          { endsAt: null },
          {
            endsAt: {
              $gte: now
            }
          }
        ]
      }
    ]
  });

  // =========================
  // ENCONTRAR MELHOR PROMOÇÃO
  // =========================

  for (const item of calculatedItems) {
    const eligiblePromotions = [];

    for (const promotion of promotions) {
      // -------------------------
      // PROMOÇÃO POR PRODUTO
      // -------------------------

      if (
        promotion.scope === "product" &&
        promotion.product &&
        promotion.product.toString() ===
          item.product.toString() &&
        item.quantity >=
          promotion.minimumQuantity
      ) {
        eligiblePromotions.push(promotion);
      }

      // -------------------------
      // PROMOÇÃO POR CATEGORIA
      // -------------------------

      if (
        promotion.scope === "category" &&
        promotion.category ===
          item.category
      ) {
        const categoryQuantity =
          calculatedItems
            .filter(
              (cartItem) =>
                cartItem.category ===
                promotion.category
            )
            .reduce(
              (total, cartItem) =>
                total +
                cartItem.quantity,
              0
            );

        if (
          categoryQuantity >=
          promotion.minimumQuantity
        ) {
          eligiblePromotions.push(
            promotion
          );
        }
      }
    }

    // =========================
    // CALCULAR MELHOR PREÇO
    // =========================

    let bestPrice =
      item.originalUnitPrice;

    let bestPromotion = null;

    for (
      const promotion
      of eligiblePromotions
    ) {
      const promotionalPrice =
        calculatePromotionPrice(
          item.originalUnitPrice,
          promotion
        );

      if (
        promotionalPrice < bestPrice
      ) {
        bestPrice =
          promotionalPrice;

        bestPromotion =
          promotion;
      }
    }

    item.unitPrice =
      roundMoney(bestPrice);

    if (bestPromotion) {
      item.promotion = {
        promotionId:
          bestPromotion._id,

        name:
          bestPromotion.name,

        discountType:
          bestPromotion.discountType,

        promotionalPrice:
          bestPromotion.promotionalPrice,

        percentage:
          bestPromotion.percentage
      };
    }

    item.subtotal =
      roundMoney(
        item.unitPrice *
        item.quantity
      );
  }

  // =========================
  // TOTAIS DOS PRODUTOS
  // =========================

  const originalSubtotal =
    roundMoney(
      calculatedItems.reduce(
        (total, item) =>
          total +
          (
            item.originalUnitPrice *
            item.quantity
          ),
        0
      )
    );

  const subtotal =
    roundMoney(
      calculatedItems.reduce(
        (total, item) =>
          total + item.subtotal,
        0
      )
    );

  const promotionDiscount =
    roundMoney(
      originalSubtotal -
      subtotal
    );

  // =========================
  // AJUSTES MANUAIS DO PDV
  // =========================

  let manualDiscount = 0;
  let manualSurcharge = 0;

  if (channel === "store") {
    manualDiscount =
      calculateAdjustment(
        subtotal,
        discount,
        "discount"
      );

    manualSurcharge =
      calculateAdjustment(
        subtotal,
        surcharge,
        "surcharge"
      );
  }

  // Não permitir desconto maior
  // que o subtotal.
  if (manualDiscount > subtotal) {
    manualDiscount = subtotal;
  }

  const adjustedSubtotal =
    roundMoney(
      subtotal -
      manualDiscount +
      manualSurcharge
    );

  // =========================
  // TAXA DE SERVIÇO
  // =========================

  let serviceFee = 0;

  if (
    channel === "online" &&
    store.onlineOrderSettings
      ?.serviceFee
      ?.enabled
  ) {
    const config =
      store.onlineOrderSettings
        .serviceFee;

    if (
      config.type ===
      "percentage"
    ) {
      serviceFee =
        roundMoney(
          subtotal *
          (config.value / 100)
        );
    }

    if (
      config.type === "fixed"
    ) {
      serviceFee =
        roundMoney(config.value);
    }
  }

  // =========================
  // ENTREGA
  // =========================

  let calculatedDeliveryFee = 0;

  if (channel === "online") {
    calculatedDeliveryFee =
      Number(deliveryFee);

    if (
      !Number.isFinite(
        calculatedDeliveryFee
      ) ||
      calculatedDeliveryFee < 0
    ) {
      throw new Error(
        "Taxa de entrega inválida"
      );
    }

    calculatedDeliveryFee =
      roundMoney(
        calculatedDeliveryFee
      );
  }

  // =========================
  // TOTAL FINAL
  // =========================

  const total =
    roundMoney(
      adjustedSubtotal +
      serviceFee +
      calculatedDeliveryFee
    );

  return {
    store: storeId,

    channel,

    items:
      calculatedItems,

    originalSubtotal,

    promotionDiscount,

    subtotal,

    manualDiscount,

    manualSurcharge,

    adjustedSubtotal,

    serviceFee,

    deliveryFee:
      calculatedDeliveryFee,

    total
  };
}


// ===================================
// PREÇO DE UMA PROMOÇÃO
// ===================================

function calculatePromotionPrice(
  originalPrice,
  promotion
) {
  if (
    promotion.discountType ===
    "fixed_price"
  ) {
    return roundMoney(
      promotion.promotionalPrice
    );
  }

  if (
    promotion.discountType ===
    "percentage"
  ) {
    return roundMoney(
      originalPrice *
      (
        1 -
        promotion.percentage / 100
      )
    );
  }

  return originalPrice;
}


// ===================================
// DESCONTO / ACRÉSCIMO MANUAL
// ===================================

function calculateAdjustment(
  subtotal,
  adjustment,
  adjustmentName
) {
  if (!adjustment) {
    return 0;
  }

  const {
    type,
    value
  } = adjustment;

  const numericValue =
    Number(value);

  if (
    !Number.isFinite(numericValue) ||
    numericValue < 0
  ) {
    throw new Error(
      `${adjustmentName} inválido`
    );
  }

  if (
    ![
      "fixed",
      "percentage"
    ].includes(type)
  ) {
    throw new Error(
      `Tipo de ${adjustmentName} inválido`
    );
  }

  if (
    type === "percentage"
  ) {
    if (numericValue > 100) {
      throw new Error(
        `Percentual de ${adjustmentName} inválido`
      );
    }

    return roundMoney(
      subtotal *
      (numericValue / 100)
    );
  }

  return roundMoney(
    numericValue
  );
}


// ===================================
// DINHEIRO
// ===================================

function roundMoney(value) {
  return Number(
    Number(value).toFixed(2)
  );
}

module.exports = calculateCart;
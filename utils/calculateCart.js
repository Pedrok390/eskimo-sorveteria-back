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

  // =====================================
  // VALIDAÇÕES BÁSICAS
  // =====================================

  if (!storeId) {
    throw new Error(
      "Loja é obrigatória"
    );
  }

  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw new Error(
      "Carrinho vazio"
    );
  }

  if (
    !["store", "online"].includes(channel)
  ) {
    throw new Error(
      "Canal de venda inválido"
    );
  }


  // =====================================
  // LOJA
  // =====================================

  const store =
    await Store.findById(storeId);

  if (
    !store ||
    !store.active
  ) {
    throw new Error(
      "Loja não encontrada ou inativa"
    );
  }


  // =====================================
  // SEGURANÇA DO CANAL ONLINE
  // =====================================

  /*
   * Desconto e acréscimo manual
   * pertencem exclusivamente ao PDV.
   */

  if (
    channel === "online" &&
    (discount || surcharge)
  ) {
    throw new Error(
      "Pedidos online não permitem desconto ou acréscimo manual"
    );
  }


  // =====================================
  // NORMALIZAR ITENS
  // =====================================

  const normalizedItems =
    items.map((item) => {

      const quantity =
        Number(item.quantity);

      if (
        !item.productId ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        throw new Error(
          "Item do carrinho inválido"
        );
      }

      return {
        productId:
          item.productId.toString(),

        quantity
      };
    });


  // =====================================
  // AGRUPAR PRODUTOS REPETIDOS
  // =====================================

  /*
   * Exemplo:
   *
   * Produto A = 2
   * Produto A = 3
   *
   * passa a ser:
   *
   * Produto A = 5
   */

  const groupedItems =
    new Map();

  for (
    const item
    of normalizedItems
  ) {

    const current =
      groupedItems.get(
        item.productId
      ) || 0;

    groupedItems.set(
      item.productId,
      current + item.quantity
    );
  }


  const finalItems =
    Array.from(
      groupedItems.entries()
    ).map(
      ([productId, quantity]) => ({
        productId,
        quantity
      })
    );


  const productIds =
    finalItems.map(
      (item) =>
        item.productId
    );


  // =====================================
  // PRODUTOS DA LOJA
  // =====================================

  const storeProducts =
    await StoreProduct.find({
      store: storeId,

      product: {
        $in: productIds
      }
    })
      .populate("product");


  /*
   * Se mandamos 3 produtos e só
   * encontramos 2 StoreProducts,
   * significa que algum produto não
   * pertence àquela loja.
   */

  if (
    storeProducts.length !==
    productIds.length
  ) {
    throw new Error(
      "Um ou mais produtos não pertencem a esta loja"
    );
  }


  // =====================================
  // MONTAR ITENS
  // =====================================

  const calculatedItems =
    finalItems.map(
      (item) => {

        const storeProduct =
          storeProducts.find(
            (sp) =>
              sp.product._id
                .toString() ===
              item.productId
          );


        // -----------------------------
        // PRODUTO DISPONÍVEL NA LOJA
        // -----------------------------

        if (
          !storeProduct.available
        ) {
          throw new Error(
            `${storeProduct.product.name} não está disponível`
          );
        }


        // -----------------------------
        // PRODUTO DISPONÍVEL ONLINE
        // -----------------------------

        if (
          channel === "online" &&
          !storeProduct.availableOnline
        ) {
          throw new Error(
            `${storeProduct.product.name} não está disponível no site`
          );
        }


        // -----------------------------
        // ESTOQUE
        // -----------------------------

        /*
         * Por enquanto apenas validamos.
         *
         * A baixa real será feita posteriormente
         * pelo sistema de StockMovement.
         */

        if (
          storeProduct.stock <
          item.quantity
        ) {
          throw new Error(
            `Estoque insuficiente para ${storeProduct.product.name}`
          );
        }


        // -----------------------------
        // ITEM
        // -----------------------------

        return {
          product:
            storeProduct.product._id,
          storeProduct:
            storeProduct._id,
          name:
            storeProduct.product.name,

          category:
            storeProduct.product.category,

          quantity:
            item.quantity,

          originalUnitPrice:
            Number(
              storeProduct.price
            ),

          unitPrice:
            Number(
              storeProduct.price
            ),

          promotion: null,

          subtotal: 0
        };
      }
    );


  // =====================================
  // PROMOÇÕES VÁLIDAS
  // =====================================

  const now =
    new Date();


  const promotions =
    await Promotion.find({

      store: storeId,

      active: true,

      [`channels.${channel}`]:
        true,

      $and: [

        // Data inicial
        {
          $or: [
            {
              startsAt: null
            },
            {
              startsAt: {
                $lte: now
              }
            }
          ]
        },

        // Data final
        {
          $or: [
            {
              endsAt: null
            },
            {
              endsAt: {
                $gte: now
              }
            }
          ]
        }
      ]
    });


  // =====================================
  // CALCULAR MELHOR PROMOÇÃO
  // =====================================

  /*
   * Promoções NÃO acumulam.
   *
   * Se mais de uma promoção puder ser
   * aplicada ao produto, usamos aquela
   * que produzir o menor preço unitário.
   */

  for (
    const item
    of calculatedItems
  ) {

    const eligiblePromotions = [];


    for (
      const promotion
      of promotions
    ) {

      // =================================
      // PROMOÇÃO POR PRODUTO
      // =================================

      if (
        promotion.scope ===
          "product" &&

        promotion.product &&

        promotion.product
          .toString() ===
          item.product.toString() &&

        item.quantity >=
          promotion.minimumQuantity
      ) {

        eligiblePromotions.push(
          promotion
        );
      }


      // =================================
      // PROMOÇÃO POR CATEGORIA
      // =================================

      if (
        promotion.scope ===
          "category" &&

        promotion.category ===
          item.category
      ) {

        /*
         * Soma a quantidade de todos
         * os produtos daquela categoria.
         */

        const categoryQuantity =
          calculatedItems

            .filter(
              (cartItem) =>
                cartItem.category ===
                promotion.category
            )

            .reduce(
              (
                total,
                cartItem
              ) =>
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


    // =================================
    // MELHOR PREÇO
    // =================================

    let bestPrice =
      item.originalUnitPrice;

    let bestPromotion =
      null;


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
        promotionalPrice <
        bestPrice
      ) {

        bestPrice =
          promotionalPrice;

        bestPromotion =
          promotion;
      }
    }


    // =================================
    // PREÇO FINAL DO ITEM
    // =================================

    item.unitPrice =
      roundMoney(
        bestPrice
      );


    // =================================
    // SNAPSHOT DA PROMOÇÃO
    // =================================

    if (bestPromotion) {

      item.promotion = {

        promotionId:
          bestPromotion._id,

        name:
          bestPromotion.name,

        discountType:
          bestPromotion.discountType,

        promotionalPrice:
          bestPromotion
            .promotionalPrice,

        percentage:
          bestPromotion.percentage
      };
    }


    // =================================
    // SUBTOTAL DO ITEM
    // =================================

    item.subtotal =
      roundMoney(
        item.unitPrice *
        item.quantity
      );
  }


  // =====================================
  // SUBTOTAL ORIGINAL
  // =====================================

  const originalSubtotal =
    roundMoney(

      calculatedItems.reduce(
        (
          total,
          item
        ) =>
          total +
          (
            item.originalUnitPrice *
            item.quantity
          ),

        0
      )
    );


  // =====================================
  // SUBTOTAL APÓS PROMOÇÕES
  // =====================================

  const subtotal =
    roundMoney(

      calculatedItems.reduce(
        (
          total,
          item
        ) =>
          total +
          item.subtotal,

        0
      )
    );


  // =====================================
  // DESCONTO DAS PROMOÇÕES
  // =====================================

  const promotionDiscount =
    roundMoney(
      originalSubtotal -
      subtotal
    );


  // =====================================
  // AJUSTES MANUAIS DO PDV
  // =====================================

  let manualDiscount = 0;

  let manualSurcharge = 0;


  if (
    channel === "store"
  ) {

    manualDiscount =
      calculateAdjustment(
        subtotal,
        discount,
        "desconto"
      );


    manualSurcharge =
      calculateAdjustment(
        subtotal,
        surcharge,
        "acréscimo"
      );
  }


  // =====================================
  // LIMITE DO DESCONTO
  // =====================================

  /*
   * Não permitimos que o desconto
   * deixe o subtotal negativo.
   */

  if (
    manualDiscount >
    subtotal
  ) {
    manualDiscount =
      subtotal;
  }


  // =====================================
  // SUBTOTAL AJUSTADO
  // =====================================

  const adjustedSubtotal =
    roundMoney(

      subtotal -

      manualDiscount +

      manualSurcharge
    );


  // =====================================
  // TAXA DE SERVIÇO ONLINE
  // =====================================

  let serviceFee = 0;


  /*
   * Além do valor calculado, guardamos
   * como a taxa foi calculada.
   *
   * Isso será usado para criar o
   * snapshot dentro do Order.
   */

  let serviceFeeDetails = {

    type: "fixed",

    value: 0,

    amount: 0
  };


  if (
    channel === "online" &&

    store.onlineOrderSettings
      ?.serviceFee
      ?.enabled
  ) {

    const config =
      store.onlineOrderSettings
        .serviceFee;


    const configValue =
      Number(
        config.value
      );


    // -----------------------------
    // TAXA PERCENTUAL
    // -----------------------------

    if (
      config.type ===
      "percentage"
    ) {

      serviceFee =
        roundMoney(

          subtotal *

          (
            configValue /
            100
          )
        );
    }


    // -----------------------------
    // TAXA FIXA
    // -----------------------------

    if (
      config.type ===
      "fixed"
    ) {

      serviceFee =
        roundMoney(
          configValue
        );
    }


    serviceFeeDetails = {

      type:
        config.type,

      value:
        configValue,

      amount:
        serviceFee
    };
  }


  // =====================================
  // TAXA DE ENTREGA
  // =====================================

  let calculatedDeliveryFee =
    0;


  if (
    channel === "online"
  ) {

    calculatedDeliveryFee =
      Number(
        deliveryFee
      );


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


  // =====================================
  // TOTAL FINAL
  // =====================================

  const total =
    roundMoney(

      adjustedSubtotal +

      serviceFee +

      calculatedDeliveryFee
    );


  // =====================================
  // RETORNO
  // =====================================

  return {

    store:
      storeId,

    channel,

    items:
      calculatedItems,

    originalSubtotal,

    promotionDiscount,

    subtotal,

    manualDiscount,

    manualSurcharge,

    adjustedSubtotal,

    /*
     * Mantemos serviceFee como número
     * por compatibilidade.
     */
    serviceFee,

    /*
     * Snapshot completo da configuração
     * utilizada no cálculo.
     */
    serviceFeeDetails,

    deliveryFee:
      calculatedDeliveryFee,

    total
  };
}


// =====================================
// CALCULAR PREÇO DE UMA PROMOÇÃO
// =====================================

function calculatePromotionPrice(
  originalPrice,
  promotion
) {

  // =====================================
  // PREÇO FIXO PROMOCIONAL
  // =====================================

  if (
    promotion.discountType ===
    "fixed_price"
  ) {

    const promotionalPrice =
      Number(
        promotion.promotionalPrice
      );


    if (
      !Number.isFinite(
        promotionalPrice
      ) ||

      promotionalPrice < 0
    ) {

      return originalPrice;
    }


    return roundMoney(
      promotionalPrice
    );
  }


  // =====================================
  // DESCONTO PERCENTUAL
  // =====================================

  if (
    promotion.discountType ===
    "percentage"
  ) {

    const percentage =
      Number(
        promotion.percentage
      );


    if (
      !Number.isFinite(
        percentage
      ) ||

      percentage < 0 ||

      percentage > 100
    ) {

      return originalPrice;
    }


    return roundMoney(

      originalPrice *

      (
        1 -
        percentage / 100
      )
    );
  }


  return originalPrice;
}


// =====================================
// DESCONTO / ACRÉSCIMO MANUAL
// =====================================

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


  // =====================================
  // VALIDAR VALOR
  // =====================================

  if (
    !Number.isFinite(
      numericValue
    ) ||

    numericValue < 0
  ) {

    throw new Error(
      `${adjustmentName} inválido`
    );
  }


  // =====================================
  // VALIDAR TIPO
  // =====================================

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


  // =====================================
  // PERCENTUAL
  // =====================================

  if (
    type ===
    "percentage"
  ) {

    if (
      numericValue >
      100
    ) {

      throw new Error(
        `Percentual de ${adjustmentName} inválido`
      );
    }


    return roundMoney(

      subtotal *

      (
        numericValue /
        100
      )
    );
  }


  // =====================================
  // VALOR FIXO
  // =====================================

  return roundMoney(
    numericValue
  );
}


// =====================================
// ARREDONDAMENTO MONETÁRIO
// =====================================

function roundMoney(
  value
) {

  return Number(
    Number(value)
      .toFixed(2)
  );
}


module.exports =
  calculateCart;
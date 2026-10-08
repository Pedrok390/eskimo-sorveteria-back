const StoreProduct = require("../models/storeProducts");

const StockMovement = require("../models/stockMovements");


const ALLOWED_TYPES = [
  "purchase",
  "sale",
  "adjustment",
  "loss",
  "return"
];

async function moveStock({
  storeProductId,
  type,
  direction,
  quantity,
  reason = "",
  order = null,
  employee = null,
  session = null
}) {

  // =====================================
  // VALIDAÇÕES
  // =====================================

  if (!storeProductId) {
    throw new Error(
      "Produto da loja é obrigatório"
    );
  }


  if (!ALLOWED_TYPES.includes(type)) {
    throw new Error(
      "Tipo de movimentação inválido"
    );
  }


  if (
    !["in", "out"].includes(direction)
  ) {
    throw new Error(
      "Direção da movimentação inválida"
    );
  }


  const numericQuantity =
    Number(quantity);


  if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
    throw new Error(
      "Quantidade de estoque inválida"
    );
  }


  // =====================================
  // FILTRO PARA ALTERAÇÃO ATÔMICA
  // =====================================

  const filter = {_id: storeProductId};


  if (direction === "out") {
    filter.stock = {
      $gte: numericQuantity
    };
  }


  // =====================================
  // ALTERAÇÃO DO ESTOQUE
  // =====================================

  const stockChange =
    direction === "in"
      ? numericQuantity
      : -numericQuantity;


  const options = {
    new: false
  };


  if (session) {
    options.session = session;
  }


  /*
   * new: false faz o Mongo retornar
   * o documento ANTES da alteração.
   *
   * Dessa forma conseguimos descobrir:
   *
   * stockBefore
   * stockAfter
   */

  const storeProductBefore =
    await StoreProduct.findOneAndUpdate(
      filter,
      {
        $inc: {
          stock: stockChange
        }
      },
      options
    );


  // =====================================
  // PRODUTO NÃO ALTERADO
  // =====================================

  if (!storeProductBefore) {

    /*
     * Precisamos diferenciar:
     *
     * produto inexistente
     *
     * de
     *
     * estoque insuficiente
     */

    let query =
      StoreProduct.findById(
        storeProductId
      );


    if (session) {
      query =
        query.session(session);
    }


    const existingStoreProduct =
      await query;


    if (!existingStoreProduct) {
      throw new Error(
        "Produto da loja não encontrado"
      );
    }


    if (direction === "out") {
      throw new Error(
        `Estoque insuficiente para o produto. Estoque atual: ${existingStoreProduct.stock}`
      );
    }


    throw new Error(
      "Não foi possível alterar o estoque"
    );
  }


  // =====================================
  // ESTOQUE ANTES / DEPOIS
  // =====================================

  const stockBefore =
    Number(
      storeProductBefore.stock
    );


  const stockAfter =
    stockBefore +
    stockChange;


  // =====================================
  // CRIAR MOVIMENTAÇÃO
  // =====================================

  const movementData = {
    store:
      storeProductBefore.store,

    storeProduct:
      storeProductBefore._id,

    product:
      storeProductBefore.product,

    type,

    direction,

    quantity:
      numericQuantity,

    stockBefore,

    stockAfter,

    reason,

    order,

    employee
  };


  let movement;


  /*
   * Quando existe session,
   * StockMovement também participa
   * da mesma transação.
   */

  if (session) {

    const movements =
      await StockMovement.create(
        [movementData],
        {
          session
        }
      );


    movement =
      movements[0];

  } else {

    movement =
      await StockMovement.create(
        movementData
      );
  }


  // =====================================
  // RETORNO
  // =====================================

  return {
    movement,

    stockBefore,

    stockAfter
  };
}


module.exports =
  moveStock;
const mongoose = require("mongoose");

const Order = require("../models/orders");

const StoreProduct =
  require("../models/storeProducts");

const calculateCart =
  require("../utils/calculateCart");

const moveStock =
  require("../utils/moveStock");


// =====================================
// LISTAR PEDIDOS
// =====================================

module.exports.getOrders = async (
  req,
  res,
  next
) => {
  try {
    const {
      storeId,
      channel,
      status
    } = req.query;

    const filter = {};

    if (storeId) {
      filter.store = storeId;
    }

    if (channel) {
      filter.channel = channel;
    }

    if (status) {
      filter.status = status;
    }

    const orders =
      await Order.find(filter)
        .populate("store")
        .populate("client")
        .populate(
          "employee",
          "name email"
        )
        .sort({
          createdAt: -1
        });

    return res.send(orders);

  } catch (error) {
    return next(error);
  }
};


// =====================================
// BUSCAR PEDIDO
// =====================================

module.exports.getOrderById = async (
  req,
  res,
  next
) => {
  try {
    const order =
      await Order.findById(
        req.params.orderId
      )
        .populate("store")
        .populate("client")
        .populate(
          "employee",
          "name email"
        );

    if (!order) {
      return res.status(404).send({
        message:
          "Pedido não encontrado"
      });
    }

    return res.send(order);

  } catch (error) {
    return next(error);
  }
};


// =====================================
// CRIAR PEDIDO / VENDA
// =====================================

module.exports.createOrder = async (
  req,
  res,
  next
) => {
  try {
    const {
      storeId,
      channel,

      customer = {},

      items,

      discount = null,
      surcharge = null,

      deliveryFee = 0,

      payments = [],

      fiscalDocument = {},

      notes = ""
    } = req.body;


    // =====================================
    // VALIDAÇÕES BÁSICAS
    // =====================================

    if (!storeId) {
      return res.status(400).send({
        message:
          "A loja é obrigatória"
      });
    }

    if (
      !["store", "online"].includes(
        channel
      )
    ) {
      return res.status(400).send({
        message:
          "Canal de venda inválido"
      });
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).send({
        message:
          "O pedido precisa ter pelo menos um produto"
      });
    }


    // =====================================
    // CLIENTE
    // =====================================

    let clientId = null;

    /*
     * Pedido online:
     *
     * O cliente vem obrigatoriamente
     * do JWT validado pelo customerAuth.
     *
     * Nunca confiamos em clientId
     * enviado pelo frontend.
     */

    if (channel === "online") {
      if (!req.client) {
        return res.status(401).send({
          message:
            "Cliente autenticado é obrigatório"
        });
      }

      clientId =
        req.client._id;
    }

    /*
     * No PDV o cliente cadastrado
     * continua opcional.
     *
     * Por enquanto não vinculamos
     * um Client.
     */


    // =====================================
    // NORMALIZAR ITENS
    // =====================================

    /*
     * Durante a migração aceitamos:
     *
     * productId
     *
     * ou:
     *
     * product
     */

    const cartItems =
      items.map((item) => ({
        productId:
          item.productId ||
          item.product,

        quantity:
          item.quantity
      }));


    // =====================================
    // REGRAS DO SITE
    // =====================================

    if (
      channel === "online" &&
      (discount || surcharge)
    ) {
      return res.status(400).send({
        message:
          "Pedidos online não permitem desconto ou acréscimo manual"
      });
    }


    // =====================================
    // CALCULAR CARRINHO
    // =====================================

    /*
     * O backend recalcula:
     *
     * preço
     * promoção
     * desconto
     * acréscimo
     * taxa
     * entrega
     * total
     */

    const calculated =
      await calculateCart({
        storeId,
        items:
          cartItems,
        channel,
        discount,
        surcharge,
        deliveryFee
      });


    // =====================================
    // PAGAMENTOS
    // =====================================

    validatePayments(
      payments,
      calculated.total,
      channel
    );

    // =====================================
    // NORMALIZAR PAGAMENTOS
    // =====================================

    /*
    * PDV:
    *
    * Ao clicar em "Finalizar Venda",
    * consideramos que os pagamentos
    * já foram realizados.
    *
    * ONLINE:
    *
    * O pagamento começa pendente
    * e será confirmado posteriormente
    * pelo provedor de pagamento.
    */

    const normalizedPayments =
      payments.map((payment) => ({
        ...payment,

        status:
          channel === "store"
            ? "approved"
            : "pending"
      }));
    // =====================================
    // CLIENTE - SNAPSHOT
    // =====================================

    let customerData =
      customer;

    if (channel === "online") {
      customerData = {
        ...customer,

        name:
          req.client.name ||
          customer.name ||
          "",

        phone:
          req.client.phone ||
          customer.phone ||
          "",

        cpf:
          req.client.cpf ||
          customer.cpf ||
          null
      };
    }

    const normalizedCustomer =
      normalizeCustomer(
        customerData
      );


    // =====================================
    // NOTA FISCAL
    // =====================================

    const normalizedFiscalDocument =
      normalizeFiscalDocument(
        fiscalDocument,
        normalizedCustomer
      );


    // =====================================
    // FUNCIONÁRIO
    // =====================================

    /*
     * PDV:
     * funcionário vem do JWT.
     *
     * Online:
     * employee fica null.
     */

    const employee =
      channel === "store"
        ? (
            req.user?._id ||
            req.user?.id ||
            null
          )
        : null;


    // =====================================
    // ITENS DO ORDER
    // =====================================

    const orderItems =
      calculated.items.map(
        (item) => ({
          product:
            item.product,

          name:
            item.name,

          category:
            item.category,

          quantity:
            item.quantity,

          originalUnitPrice:
            item.originalUnitPrice,

          unitPrice:
            item.unitPrice,

          subtotal:
            item.subtotal,

          promotion:
            item.promotion
              ? {
                  promotionId:
                    item.promotion
                      .promotionId,

                  name:
                    item.promotion
                      .name,

                  discountType:
                    item.promotion
                      .discountType,

                  promotionalPrice:
                    item.promotion
                      .promotionalPrice,

                  percentage:
                    item.promotion
                      .percentage
                }
              : undefined
        })
      );


    // =====================================
    // DESCONTO MANUAL
    // =====================================

    const manualDiscount = {
      type:
        discount?.type ||
        "fixed",

      value:
        Number(
          discount?.value || 0
        ),

      amount:
        calculated.manualDiscount,

      reason:
        discount?.reason || ""
    };


    // =====================================
    // ACRÉSCIMO MANUAL
    // =====================================

    const manualSurcharge = {
      type:
        surcharge?.type ||
        "fixed",

      value:
        Number(
          surcharge?.value || 0
        ),

      amount:
        calculated.manualSurcharge,

      reason:
        surcharge?.reason || ""
    };


    // =====================================
    // TAXA DE SERVIÇO
    // =====================================

    const serviceFee = {
      type:
        calculated
          .serviceFeeDetails
          ?.type ||
        "fixed",

      value:
        calculated
          .serviceFeeDetails
          ?.value ||
        0,

      amount:
        calculated
          .serviceFeeDetails
          ?.amount ||
        0
    };


    // =====================================
    // DADOS DO ORDER
    // =====================================

    /*
     * Primeiro montamos os dados.
     *
     * A criação no MongoDB acontecerá
     * dentro da transaction.
     */

    const orderData = {
      store:
        storeId,

      channel,

      client:
        clientId,

      customer:
        normalizedCustomer,

      items:
        orderItems,

      originalSubtotal:
        calculated.originalSubtotal,

      promotionDiscount:
        calculated.promotionDiscount,

      subtotal:
        calculated.subtotal,

      manualDiscount,

      manualSurcharge,

      adjustedSubtotal:
        calculated.adjustedSubtotal,

      serviceFee,

      deliveryFee:
        calculated.deliveryFee,

      total:
        calculated.total,

      payments: normalizedPayments,

      fiscalDocument:
        normalizedFiscalDocument,

      employee,

      notes,

      /*
       * Online:
       * começa pendente.
       *
       * PDV:
       * começa confirmado.
       */

      status:
        channel === "online"
          ? "pending"
          : "confirmed"
    };


    // =====================================
    // TRANSAÇÃO
    // =====================================

    const session =
      await mongoose.startSession();

    let order;

    try {
      await session.withTransaction(
        async () => {

          // =================================
          // CRIAR ORDER
          // =================================

          const createdOrders =
            await Order.create(
              [orderData],
              {
                session
              }
            );

          order =
            createdOrders[0];


          // =================================
          // PDV - BAIXAR ESTOQUE
          // =================================

          /*
           * Por enquanto:
           *
           * STORE:
           * baixa estoque imediatamente.
           *
           * ONLINE:
           * NÃO baixa estoque aqui.
           *
           * Online será baixado quando
           * o pagamento for confirmado.
           */

          if (channel === "store") {

            for (
              const item
              of calculated.items
            ) {

              /*
               * calculateCart precisa
               * retornar o ID do
               * StoreProduct.
               */

              if (!item.storeProduct) {
                throw new Error(
                  `StoreProduct não encontrado para ${item.name}`
                );
              }

              await moveStock({
                storeProductId:
                  item.storeProduct,

                type:
                  "sale",

                direction:
                  "out",

                quantity:
                  item.quantity,

                reason:
                  `Venda ${order._id}`,

                order:
                  order._id,

                employee,

                session
              });
            }
          }
        }
      );

    } finally {
      await session.endSession();
    }


    // =====================================
    // RETORNAR ORDER
    // =====================================

    return res
      .status(201)
      .send(order);


  } catch (error) {
    return next(error);
  }
};


// =====================================
// ATUALIZAR STATUS
// =====================================

module.exports.updateOrderStatus = async (
  req,
  res,
  next
) => {
  try {
    const {
      status
    } = req.body;

    const allowedStatuses = [
      "pending",
      "confirmed",
      "preparing",
      "out_for_delivery",
      "completed",
    ];

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      return res.status(400).send({
        message:
          "Status do pedido inválido"
      });
    }

    const order =
      await Order.findByIdAndUpdate(
        req.params.orderId,

        {
          status
        },

        {
          new: true,
          runValidators: true
        }
      );

    if (!order) {
      return res.status(404).send({
        message:
          "Pedido não encontrado"
      });
    }

    return res.send(order);

  } catch (error) {
    return next(error);
  }
};


// =====================================
// CANCELAR PEDIDO
// =====================================

module.exports.cancelOrder = async (
  req,
  res,
  next
) => {

  const session =
    await mongoose.startSession();

  try {

    let cancelledOrder;


    // =====================================
    // TRANSAÇÃO
    // =====================================

    await session.withTransaction(
      async () => {

        // =================================
        // BUSCAR PEDIDO
        // =================================

        const order =
          await Order.findById(
            req.params.orderId
          ).session(session);


        if (!order) {
          const error =
            new Error(
              "Pedido não encontrado"
            );

          error.statusCode = 404;

          throw error;
        }


        // =================================
        // JÁ CANCELADO
        // =================================

        if (
          order.status ===
          "cancelled"
        ) {

          const error =
            new Error(
              "Pedido já está cancelado"
            );

          error.statusCode = 400;

          throw error;
        }


        // =================================
        // VENDA PRESENCIAL
        // =================================

        if (
          order.channel === "store"
        ) {

          /*
           * Para cada produto vendido,
           * devolvemos a quantidade
           * ao estoque.
           */

          for (
            const item
            of order.items
          ) {

            /*
             * O Order guarda Product,
             * mas moveStock precisa do
             * StoreProduct.
             *
             * Portanto precisamos localizar
             * a relação:
             *
             * loja + produto
             */

            const storeProduct =
              await StoreProduct.findOne({
                store:
                  order.store,

                product:
                  item.product
              }).session(session);


            if (!storeProduct) {

              const error =
                new Error(
                  `Produto ${item.name} não encontrado no estoque da loja`
                );

              error.statusCode = 400;

              throw error;
            }


            // =============================
            // DEVOLVER ESTOQUE
            // =============================

            await moveStock({

              storeProductId:
                storeProduct._id,

              type:
                "return",

              direction:
                "in",

              quantity:
                item.quantity,

              reason:
                `Cancelamento da venda ${order._id}`,

              order:
                order._id,

              employee:
                req.user?._id ||
                req.user?.id ||
                null,

              session
            });
          }
        }


        // =================================
        // CANCELAR ORDER
        // =================================

        order.status =
          "cancelled";


        await order.save({
          session
        });


        cancelledOrder =
          order;
      }
    );


    // =====================================
    // RESPOSTA
    // =====================================

    return res.send(
      cancelledOrder
    );


  } catch (error) {

    return next(error);

  } finally {

    await session.endSession();
  }
};


// =====================================
// NORMALIZAR CLIENTE
// =====================================

function normalizeCustomer(
  customer = {}
) {
  const cpf =
    customer.cpf
      ? String(customer.cpf)
          .replace(
            /\D/g,
            ""
          )
      : null;

  return {
    identified:
      Boolean(cpf),

    name:
      customer.name || "",

    cpf,

    phone:
      customer.phone || "",

    address: {
      street:
        customer.address
          ?.street ||
        "",

      number:
        customer.address
          ?.number ||
        "",

      complement:
        customer.address
          ?.complement ||
        "",

      neighborhood:
        customer.address
          ?.neighborhood ||
        "",

      city:
        customer.address
          ?.city ||
        "",

      state:
        customer.address
          ?.state ||
        "",

      zipCode:
        customer.address
          ?.zipCode ||
        ""
    }
  };
}


// =====================================
// NORMALIZAR NOTA FISCAL
// =====================================

function normalizeFiscalDocument(
  fiscalDocument = {},
  customer
) {
  const includeCpf =
    fiscalDocument.includeCpf ===
      true ||
    fiscalDocument.includeCpf ===
      "true";

  if (
    includeCpf &&
    !customer.cpf
  ) {
    throw new Error(
      "Informe o CPF para incluir na nota fiscal"
    );
  }

  return {
    requested:
      fiscalDocument.requested ===
        true ||
      fiscalDocument.requested ===
        "true",

    includeCpf,

    cpf:
      includeCpf
        ? customer.cpf
        : null,

    issued:
      false,

    number:
      null
  };
}


// =====================================
// VALIDAR PAGAMENTOS
// =====================================

function validatePayments(
  payments,
  total,
  channel
) {
  if (!Array.isArray(payments)) {
    throw new Error(
      "Pagamentos inválidos"
    );
  }

  /*
   * Pedido online poderá ser criado
   * antes da confirmação do pagamento.
   *
   * Por isso permitimos payments vazio
   * neste momento.
   */

  if (payments.length === 0) {
    if (channel === "store") {
      throw new Error(
        "Uma venda presencial precisa ter pelo menos um pagamento"
      );
    }

    return;
  }
  const allowedMethods = [
    "cash",
    "pix",
    "credit",
    "debit",
    "voucher"
  ];

  let paymentTotal = 0;

  for (
    const payment
    of payments
  ) {
    if (
      !allowedMethods.includes(
        payment.method
      )
    ) {
      throw new Error(
        "Forma de pagamento inválida"
      );
    }

    const amount =
      Number(
        payment.amount
      );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new Error(
        "Valor de pagamento inválido"
      );
    }

    paymentTotal +=
      amount;
  }

  paymentTotal =
    roundMoney(
      paymentTotal
    );

  if (
    Math.abs(
      paymentTotal - total
    ) > 0.01
  ) {
    throw new Error(
      `A soma dos pagamentos (${paymentTotal}) deve ser igual ao total da venda (${total})`
    );
  }
}


function roundMoney(value) {
  return Number(
    Number(value)
      .toFixed(2)
  );
}
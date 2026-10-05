const Order = require("../models/orders");
const calculateCart = require("../utils/calculateCart");


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

    const orders = await Order.find(filter)
      .populate("store")
      .populate("client")
      .populate("employee", "name email")
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
    const order = await Order.findById(
      req.params.orderId
    )
      .populate("store")
      .populate("client")
      .populate("employee", "name email");

    if (!order) {
      return res.status(404).send({
        message: "Pedido não encontrado"
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
        message: "A loja é obrigatória"
      });
    }

    if (
      !["store", "online"].includes(channel)
    ) {
      return res.status(400).send({
        message: "Canal de venda inválido"
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

      clientId = req.client._id;
    }

    /*
     * No PDV o cliente cadastrado
     * continua opcional.
     *
     * Por enquanto não vinculamos um Client.
     * CPF poderá ser informado normalmente
     * para a nota fiscal.
     */

    // =====================================
    // NORMALIZAR ITENS
    // =====================================

    /*
     * Durante a migração aceitamos:
     *
     * productId
     *
     * ou o formato antigo:
     *
     * product
     */

    const cartItems = items.map(
      (item) => ({
        productId:
          item.productId ||
          item.product,

        quantity:
          item.quantity
      })
    );

    // =====================================
    // REGRAS DO SITE
    // =====================================

    /*
     * Cliente online não pode enviar
     * desconto ou acréscimo manual.
     */

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
     * O backend calcula novamente:
     *
     * preço
     * promoção
     * desconto
     * acréscimo
     * taxa de serviço
     * entrega
     * total
     *
     * Portanto não confiamos em valores
     * calculados pelo frontend.
     */

    const calculated =
      await calculateCart({
        storeId,
        items: cartItems,
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
      calculated.total
    );

    // =====================================
    // CLIENTE - SNAPSHOT
    // =====================================

    /*
     * Para pedido online usamos os dados
     * da conta autenticada sempre que
     * estiverem disponíveis.
     *
     * O endereço continua vindo do checkout,
     * pois pode ser um endereço específico
     * daquela entrega.
     */

    let customerData = customer;

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
      normalizeCustomer(customerData);

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
     * Venda presencial:
     * funcionário vem do JWT.
     *
     * Pedido online:
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
                    item.promotion.name,

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

    /*
     * Por enquanto guardamos o valor
     * calculado.
     *
     * Depois faremos calculateCart retornar
     * também a configuração original
     * (ex.: 5%) para salvar o snapshot.
     */

    const serviceFee = {
      type: "fixed",
      value: 0,
      amount:
        calculated.serviceFee
    };

    // =====================================
    // CRIAR ORDER
    // =====================================

    const order =
      await Order.create({
        store:
          storeId,

        channel,

        /*
         * Online:
         * ID obtido exclusivamente do JWT.
         *
         * Store:
         * null por enquanto.
         */
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

        payments,

        fiscalDocument:
          normalizedFiscalDocument,

        employee,

        notes,

        /*
         * Online começa pendente.
         *
         * PDV começa confirmado.
         */
        status:
          channel === "online"
            ? "pending"
            : "confirmed"
      });

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
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "confirmed",
      "preparing",
      "out_for_delivery",
      "completed",
      "cancelled"
    ];

    if (
      !allowedStatuses.includes(status)
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
  try {
    const order =
      await Order.findById(
        req.params.orderId
      );

    if (!order) {
      return res.status(404).send({
        message:
          "Pedido não encontrado"
      });
    }

    if (
      order.status === "cancelled"
    ) {
      return res.status(400).send({
        message:
          "Pedido já está cancelado"
      });
    }

    order.status =
      "cancelled";

    await order.save();

    return res.send(order);

  } catch (error) {
    return next(error);
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
          .replace(/\D/g, "")
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
        customer.address?.street ||
        "",

      number:
        customer.address?.number ||
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
        customer.address?.city ||
        "",

      state:
        customer.address?.state ||
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

    issued: false,

    number: null
  };
}


// =====================================
// VALIDAR PAGAMENTOS
// =====================================

function validatePayments(
  payments,
  total
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

  for (const payment of payments) {
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
      Number(payment.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new Error(
        "Valor de pagamento inválido"
      );
    }

    paymentTotal += amount;
  }

  paymentTotal =
    roundMoney(paymentTotal);

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
    Number(value).toFixed(2)
  );
}
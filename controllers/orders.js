const Order = require("../models/orders");
const Product = require("../models/products");

module.exports.getOrders = (req, res, next) => {
  Order.find({})
    .sort({ createdAt: -1 })
    .then((orders) => {
      res.send(orders);
    })
    .catch(next);
};

module.exports.getOrderById = (req, res, next) => {
  Order.findById(req.params.orderId)
    .then((order) => {
      if (!order) {
        return res.status(404).send({
          message: "Pedido não encontrado"
        });
      }

      return res.send(order);
    })
    .catch(next);
};

module.exports.createOrder = async (req, res, next) => {
  try {
    const {
      customer,
      items,
      deliveryFee = 0,
      paymentMethod,
      notes
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).send({
        message: "O pedido precisa ter pelo menos um produto"
      });
    }

    const productIds = items.map(
      (item) => item.product
    );

    const products = await Product.find({
      _id: {
        $in: productIds
      }
    });

    if (products.length !== productIds.length) {
      return res.status(400).send({
        message: "Um ou mais produtos não foram encontrados"
      });
    }

    const orderItems = items.map((item) => {
      const product = products.find(
        (product) =>
          product._id.toString() === item.product
      );

      const quantity = Number(item.quantity);

      const hasSale =
        product.sale?.quantity >= 1 &&
        product.sale?.promotionalPrice != null;

      const saleApplied =
        hasSale &&
        quantity >= product.sale.quantity;

      const unitPrice = saleApplied
        ? product.sale.promotionalPrice
        : product.price;

      return {
        product: product._id,

        name: product.name,

        quantity,

        unitPrice,

        subtotal: unitPrice * quantity,

        saleApplied
      };
    });

    const subtotal = orderItems.reduce(
      (total, item) =>
        total + item.subtotal,
      0
    );

    const total =
      subtotal + Number(deliveryFee);

    const order = await Order.create({
      customer,
      items: orderItems,
      subtotal,
      deliveryFee: Number(deliveryFee),
      total,
      paymentMethod,
      notes,
      status: "pending"
    });

    return res.status(201).send(order);

  } catch (error) {
    return next(error);
  }
};

module.exports.updateOrderStatus = (req, res, next) => {
  const { status } = req.body;

  Order.findByIdAndUpdate(
    req.params.orderId,
    {
      status
    },
    {
      new: true,
      runValidators: true
    }
  )
    .then((order) => {
      if (!order) {
        return res.status(404).send({
          message: "Pedido não encontrado"
        });
      }

      return res.send(order);
    })
    .catch(next);
};

module.exports.cancelOrder = (req, res, next) => {
  Order.findByIdAndUpdate(
    req.params.orderId,
    {
      status: "cancelled"
    },
    {
      new: true,
      runValidators: true
    }
  )
    .then((order) => {
      if (!order) {
        return res.status(404).send({
          message: "Pedido não encontrado"
        });
      }

      return res.send(order);
    })
    .catch(next);
};
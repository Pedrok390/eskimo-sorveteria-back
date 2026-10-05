const Store = require("../models/stores");

module.exports.getStores = (req, res, next) => {
  Store.find({})
    .then((stores) => {
      res.send(stores);
    })
    .catch(next);
};

module.exports.getStoreById = (req, res, next) => {
  Store.findById(req.params.storeId)
    .then((store) => {
      if (!store) {
        return res.status(404).send({
          message: "Loja não encontrada"
        });
      }

      return res.send(store);
    })
    .catch(next);
};

module.exports.createStore = (req, res, next) => {
  const {
    name,
    code,
    address
  } = req.body;

  Store.create({
    name,
    code,
    address
  })
    .then((store) => {
      res.status(201).send(store);
    })
    .catch(next);
};

module.exports.updateOnlineOrderSettings = async (
  req,
  res,
  next
) => {
  try {
    const { serviceFee } = req.body;

    const store = await Store.findById(
      req.params.storeId
    );

    if (!store) {
      return res.status(404).send({
        message: "Loja não encontrada"
      });
    }

    if (serviceFee) {
      if (
        serviceFee.type &&
        !["percentage", "fixed"].includes(
          serviceFee.type
        )
      ) {
        return res.status(400).send({
          message:
            "Tipo de taxa de serviço inválido"
        });
      }

      if (
        serviceFee.value !== undefined &&
        Number(serviceFee.value) < 0
      ) {
        return res.status(400).send({
          message:
            "A taxa de serviço não pode ser negativa"
        });
      }

      if (
        serviceFee.type === "percentage" &&
        Number(serviceFee.value) > 100
      ) {
        return res.status(400).send({
          message:
            "A taxa percentual não pode ser maior que 100%"
        });
      }

      if (serviceFee.enabled !== undefined) {
        store.onlineOrderSettings.serviceFee.enabled =
          serviceFee.enabled === true ||
          serviceFee.enabled === "true";
      }

      if (serviceFee.type !== undefined) {
        store.onlineOrderSettings.serviceFee.type =
          serviceFee.type;
      }

      if (serviceFee.value !== undefined) {
        store.onlineOrderSettings.serviceFee.value =
          Number(serviceFee.value);
      }
    }

    await store.save();

    return res.send(store);

  } catch (error) {
    return next(error);
  }
};
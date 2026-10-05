const calculateCart =
  require("../utils/calculateCart");

module.exports.calculateCart = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await calculateCart({
        storeId:
          req.body.storeId,

        items:
          req.body.items,

        channel:
          req.body.channel,

        discount:
          req.body.discount,

        surcharge:
          req.body.surcharge,

        deliveryFee:
          req.body.deliveryFee
      });

    return res.send(result);

  } catch (error) {
    error.statusCode = 400;
    return next(error);
  }
};
const router = require("express").Router();

const auth =
  require("../middlewares/auth");

const customerAuth =
  require("../middlewares/customerAuth");

const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder
} = require("../controllers/orders");


// SITE
router.post(
  "/online",
  customerAuth,
  (req, res, next) => {
    req.body.channel = "online";
    next();
  },
  createOrder
);


// PDV
router.post(
  "/store",
  auth,
  (req, res, next) => {
    req.body.channel = "store";
    next();
  },
  createOrder
);


// ADMIN / FUNCIONÁRIOS
router.get(
  "/",
  auth,
  getOrders
);

router.get(
  "/:orderId",
  auth,
  getOrderById
);

router.patch(
  "/:orderId/status",
  auth,
  updateOrderStatus
);

router.patch(
  "/:orderId/cancel",
  auth,
  cancelOrder
);


module.exports = router;
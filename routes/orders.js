const router = require("express").Router();

const auth = require("../middlewares/auth");

const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder
} = require("../controllers/orders");

// Público
router.post(
  "/",
  createOrder
);

// Funcionário ou owner
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
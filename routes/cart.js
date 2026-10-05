const router =
  require("express").Router();

const {
  calculateCart
} = require("../controllers/cart");

const auth =
  require("../middlewares/auth");

router.post(
  "/calculate",
  auth,
  calculateCart
);

module.exports = router;
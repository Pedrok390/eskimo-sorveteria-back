const router =
  require("express").Router();

const {
  calculateCart
} = require("../controllers/cart");

const auth = require("../middlewares/auth");
const customerAuth = require("../middlewares/customerAuth");

router.post(
  "/store/calculate",
  auth,
  (req, res, next) => {
    req.body.channel = "store";
    next();
  },
  calculateCart
);

router.post(
  "/online/calculate",
  customerAuth,
  (req, res, next) => {
    req.body.channel = "online";
    next();
  },
  calculateCart
);
module.exports = router;
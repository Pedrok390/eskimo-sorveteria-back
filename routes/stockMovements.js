const router = require("express").Router();

const auth = require("../middlewares/auth");

const {
  createStockMovement,
  getStockMovements
} = require("../controllers/stockMovements");


router.get(
  "/",
  auth,
  getStockMovements
);


router.post(
  "/",
  auth,
  createStockMovement
);


module.exports = router;
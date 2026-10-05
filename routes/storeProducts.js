const router = require("express").Router();

const {
  getStoreProducts,
  getStoreProductById,
  updateStoreProduct
} = require("../controllers/storeProducts");

const auth = require("../middlewares/auth");

router.get(
  "/store/:storeId",
  auth,
  getStoreProducts
);

router.get(
  "/:storeProductId",
  auth,
  getStoreProductById
);

router.patch(
  "/:storeProductId",
  auth,
  updateStoreProduct
);

module.exports = router;
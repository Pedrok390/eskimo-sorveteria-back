const router = require("express").Router();

const auth = require("../middlewares/auth");
const owner = require("../middlewares/owner");
const upload = require("../middlewares/upload");

const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateAvailability
} = require("../controllers/products");

router.get("/", getProducts);

router.get("/:productId", getProductById);

router.post(
  "/",
  auth,
  owner,
  upload.single("image"),
  createProduct
);

router.patch(
  "/:productId",
  auth,
  owner,
  upload.single("image"),
  updateProduct
);

router.patch(
  "/:productId",
  auth,
  owner,
  updateProduct
);

router.delete(
  "/:productId",
  auth,
  owner,
  deleteProduct
);

module.exports = router;
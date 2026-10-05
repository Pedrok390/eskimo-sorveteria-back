const router = require("express").Router();

const {
  getPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion
} = require("../controllers/promotions");

const auth = require("../middlewares/auth");
const owner = require("../middlewares/owner");

router.get(
  "/store/:storeId",
  auth,
  getPromotions
);

router.get(
  "/:promotionId",
  auth,
  getPromotionById
);

router.post(
  "/",
  auth,
  owner,
  createPromotion
);

router.patch(
  "/:promotionId",
  auth,
  owner,
  updatePromotion
);

module.exports = router;
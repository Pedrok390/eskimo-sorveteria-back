const router = require("express").Router();

const {
  getStores,
  getStoreById,
  createStore,
  updateOnlineOrderSettings
} = require("../controllers/stores");

const auth = require("../middlewares/auth");
const owner = require("../middlewares/owner");

router.get("/", auth, getStores);

router.get("/:storeId", auth, getStoreById);

router.post("/", auth, owner, createStore);

router.patch(
  "/:storeId/online-settings",
  auth,
  owner,
  updateOnlineOrderSettings
);

module.exports = router;
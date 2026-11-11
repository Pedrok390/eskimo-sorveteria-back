const express = require("express");
const router = express.Router();
const storeAccess = require("../../middlewares/cash/storeAccess");

const auth = require("../../middlewares/auth");

const {
  createCashRegister,
  listCashRegisters
} = require("../../controllers/cash/cashRegister");

// Cadastrar um novo terminal de caixa
router.post(
  "/",
  auth,
  createCashRegister
);

router.get(
  "/store/:storeId",
  auth,
  storeAccess,
  listCashRegisters
);
module.exports = router;
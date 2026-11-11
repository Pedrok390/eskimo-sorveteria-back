const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth");
const cashRegisterAccess = require("../../middlewares/cash/cashRegisterAccess");

const {
  getOpeningPreview,
  openCashSession
} = require("../../controllers/cash/cashSessions");

// Consultar sugestão de contagem inicial
router.get(
  "/registers/:cashRegisterId/opening-preview",
  auth,
  cashRegisterAccess,
  getOpeningPreview
);

// Abrir sessão de caixa
router.post(
  "/sessions/open",
  auth,
  cashRegisterAccess,
  openCashSession
);

module.exports = router;
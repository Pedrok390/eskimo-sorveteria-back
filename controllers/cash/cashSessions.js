const CashRegister = require("../../models/cash/cashRegisters");
const CashRegisterSettings = require("../../models/cash/cashRegisterSettings");
const CashSession = require("../../models/cash/cashSessions");
const calculateCashCount = require("../../utils/cash/calculateCashCount");
// Os valores abaixo estão em centavos.
const BANKNOTES = [5000, 2000, 1000, 500, 200];
const COINS = [100, 50, 25, 10, 5];

const getOpeningPreview = async (req, res, next) => {
  try {
    const { cashRegisterId } = req.params;

    const cashRegister = await CashRegister.findOne({
      _id: cashRegisterId,
      active: true
    });

    if (!cashRegister) {
      return res.status(404).json({
        message: "Terminal de caixa não encontrado ou inativo"
      });
    }

    // Depois integraremos a autorização por loja e funcionário.

    const openSession = await CashSession.findOne({
      cashRegister: cashRegister._id,
      status: "open"
    });

    if (openSession) {
      return res.status(409).json({
        message: "Este terminal já possui um caixa aberto"
      });
    }

    const settings = await CashRegisterSettings.findOne({
      cashRegister: cashRegister._id
    });

    // As configurações atuais guardam valores em reais.
    // Convertendo para centavos para manter o padrão das sessões.
    const defaultBanknotes = new Map(
      (settings?.defaultBanknotes || []).map((item) => [
        Math.round(item.value * 100),
        item.quantity
      ])
    );

    const banknotes = BANKNOTES.map((value) => ({
      value,
      quantity: defaultBanknotes.get(value) ?? 0
    }));

    let previousCoins = new Map();

    if (settings?.coinOpeningMode !== "zero") {
      const lastClosedSession = await CashSession.findOne({
        cashRegister: cashRegister._id,
        status: "closed"
      }).sort({
        closedAt: -1
      });

      if (lastClosedSession?.closingCount?.denominations) {
        previousCoins = new Map(
          lastClosedSession.closingCount.denominations
            .filter((item) => COINS.includes(item.value))
            .map((item) => [item.value, item.quantity])
        );
      }
    }

    const coins = COINS.map((value) => ({
      value,
      quantity: previousCoins.get(value) ?? 0
    }));

    return res.status(200).json({
      cashRegister: {
        id: cashRegister._id,
        name: cashRegister.name,
        store: cashRegister.store
      },
      denominations: [...banknotes, ...coins]
    });
  } catch (error) {
    next(error);
  }
};

const openCashSession = async (req, res, next) => {
  try {
    const { cashRegisterId, denominations } = req.body;

    // O funcionário deve estar autenticado.
    if (!req.user?._id) {
      return res.status(401).json({
        message: "Funcionário não autenticado"
      });
    }

    if (!cashRegisterId) {
      return res.status(400).json({
        message: "Informe o terminal de caixa"
      });
    }

    // Calcula e valida a contagem enviada.
    let openingAmount;

    try {
      openingAmount = calculateCashCount(denominations);
    } catch (error) {
      return res.status(400).json({
        message: error.message
      });
    }

    // Busca o terminal e sua loja.
    const cashRegister = await CashRegister.findOne({
      _id: cashRegisterId,
      active: true
    });

    if (!cashRegister) {
      return res.status(404).json({
        message: "Terminal não encontrado ou inativo"
      });
    }

    // IMPORTANTE:
    // Aqui ainda precisamos integrar a verificação de
    // permissão do funcionário para esta loja.
    // Não exponha a rota antes dessa integração.

    const existingSession = await CashSession.findOne({
      cashRegister: cashRegister._id,
      status: "open"
    });

    if (existingSession) {
      return res.status(409).json({
        message: "Este terminal já possui um caixa aberto"
      });
    }

    const cashSession = await CashSession.create({
      store: cashRegister.store,
      cashRegister: cashRegister._id,

      status: "open",

      openedBy: req.user._id,
      openedAt: new Date(),

      openingCount: {
        denominations,
        total: openingAmount
      }
    });

    return res.status(201).json({
      message: "Caixa aberto com sucesso",
      cashSession
    });
  } catch (error) {
    // O índice único do MongoDB protege contra
    // duas aberturas simultâneas do mesmo terminal.
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Este terminal já possui um caixa aberto"
      });
    }

    // ID inválido do terminal.
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "ID do terminal inválido"
      });
    }

    next(error);
  }
};

module.exports = {
  getOpeningPreview,
  openCashSession
};
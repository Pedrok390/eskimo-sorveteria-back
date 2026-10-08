const DENOMINATIONS = [
  5000, // R$ 50,00
  2000, // R$ 20,00
  1000, // R$ 10,00
  500,  // R$ 5,00
  200,  // R$ 2,00
  100,  // R$ 1,00
  50,   // R$ 0,50
  25,   // R$ 0,25
  10,   // R$ 0,10
  5     // R$ 0,05
];

const calculateCashCount = (denominations) => {
  if (!Array.isArray(denominations)) {
    throw new Error("Informe as denominações do caixa");
  }

  if (denominations.length !== DENOMINATIONS.length) {
    throw new Error(
      "Informe todas as denominações de notas e moedas"
    );
  }

  const values = new Set();
  let total = 0;

  for (const item of denominations) {
    const { value, quantity } = item;

    if (!DENOMINATIONS.includes(value)) {
      throw new Error("Denominação inválida");
    }

    if (values.has(value)) {
      throw new Error("Denominação duplicada");
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new Error(
        "A quantidade deve ser um inteiro maior ou igual a zero"
      );
    }

    values.add(value);
    total += value * quantity;
  }

  if (!Number.isSafeInteger(total)) {
    throw new Error("Valor total do caixa inválido");
  }

  return total;
};

module.exports = calculateCashCount;
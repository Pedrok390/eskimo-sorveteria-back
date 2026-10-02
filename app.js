const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");
const usersRouter = require("./routes/users");
const clientsRouter = require("./routes/clients");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
    ].filter(Boolean)
  })
);

app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB conectado");
  })
  .catch((error) => {
    console.error("Erro ao conectar ao MongoDB:", error);
  });

app.get("/", (req, res) => {
  res.send({
    message: "API do catálogo funcionando"
  });
});

app.use("/products", productsRouter);
app.use("/orders", ordersRouter);
app.use("/users", usersRouter);
app.use("/clients", clientsRouter);

app.use((req, res) => {
  res.status(404).send({
    message: "Rota não encontrada"
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.statusCode || 500).send({
    message: err.message || "Erro interno do servidor"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
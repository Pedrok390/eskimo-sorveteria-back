const mongoose = require("mongoose");
require("dotenv").config();

const StoreProduct = require("../models/storeProducts");

async function addAvailableOnline() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB conectado");

    const result = await StoreProduct.updateMany(
      {
        availableOnline: {
          $exists: false
        }
      },
      {
        $set: {
          availableOnline: true
        }
      }
    );

    console.log("Atualização concluída");
    console.log(`Encontrados: ${result.matchedCount}`);
    console.log(`Atualizados: ${result.modifiedCount}`);

  } catch (error) {
    console.error("Erro ao atualizar StoreProducts:");
    console.error(error);
  } finally {
    await mongoose.connection.close();

    console.log("Conexão com MongoDB encerrada");
  }
}

addAvailableOnline();
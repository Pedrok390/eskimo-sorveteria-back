require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/users");
const Store = require("../models/stores");

const STORE_CODE = "CAMPINHO";

const OWNER_IDS = [
  "6a98e28a7c220ccebd7bd3af", // José
  "6a98e2b7ea5ddf116bea7dfb"  // Pedro
];

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const owners = await User.find({
      _id: { $in: OWNER_IDS },
      role: "owner",
      active: true
    });

    if (owners.length !== OWNER_IDS.length) {
      throw new Error(
        "Um ou mais proprietários não foram encontrados ou estão inativos."
      );
    }

    const store = await Store.findOne({
      code: STORE_CODE
    });

    if (!store) {
      throw new Error("Loja CAMPINHO não encontrada.");
    }

    console.log("Loja:", store.name);
    console.log(
      "Proprietários:",
      owners.map((owner) => owner.name)
    );

    if (!process.argv.includes("--apply")) {
      console.log(
        "Simulação concluída. Nenhum dado foi alterado."
      );
      console.log(
        "Execute novamente com --apply para confirmar."
      );
      return;
    }

    await Store.updateOne(
      { _id: store._id },
      {
        $addToSet: {
          owners: { $each: OWNER_IDS }
        }
      }
    );

    const updatedStore = await Store.findById(
      store._id
    ).populate("owners", "name email");

    console.log("\nProprietários vinculados:");

    updatedStore.owners.forEach((owner) => {
      console.log(`- ${owner.name}`);
    });

    console.log("\nMigração concluída!");
  } catch (error) {
    console.error("Erro:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

migrate();
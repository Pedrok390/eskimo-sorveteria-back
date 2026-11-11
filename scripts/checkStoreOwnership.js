require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/users");
const Store = require("../models/stores");

const checkStoreOwnership = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("\n=== PROPRIETÁRIOS ===");

    const owners = await User.find({
      role: "owner"
    }).select("_id name email active");

    console.table(
      owners.map((owner) => ({
        id: owner._id.toString(),
        name: owner.name,
        email: owner.email,
        active: owner.active
      }))
    );

    console.log("\n=== LOJAS ===");

    const stores = await Store.find()
    .select("_id name code owners active");

    console.table(
      stores.map((store) => ({
        id: store._id.toString(),
        name: store.name,
        code: store.code,
        owners: store.owners?.length
  ? store.owners.map((id) => id.toString()).join(", ")
  : "SEM DONO",
        active: store.active
      }))
    );

    console.log("\n=== FUNCIONÁRIOS ===");

    const employees = await User.find({
      role: "employee"
    }).select("_id name owner store active");

    console.table(
      employees.map((employee) => ({
        id: employee._id.toString(),
        name: employee.name,
        owner: employee.owner?.toString() || "SEM DONO",
        store: employee.store?.toString() || "SEM LOJA",
        active: employee.active
      }))
    );
  } catch (error) {
    console.error("Erro na consulta:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

checkStoreOwnership();
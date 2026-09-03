const router = require("express").Router();

const auth = require("../middlewares/auth");
const owner = require("../middlewares/owner");

const {
  login,
  getCurrentUser,
  createEmployee,
  getEmployees,
  disableEmployee,
  enableEmployee
} = require("../controllers/users");

router.post("/signin", login);

router.get(
  "/me",
  auth,
  getCurrentUser
);

router.get(
  "/employees",
  auth,
  owner,
  getEmployees
);

router.post(
  "/employees",
  auth,
  owner,
  createEmployee
);

router.patch(
  "/employees/:userId/disable",
  auth,
  owner,
  disableEmployee
);

router.patch(
  "/employees/:userId/enable",
  auth,
  owner,
  enableEmployee
);

module.exports = router;
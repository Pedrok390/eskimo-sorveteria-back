const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/users");

module.exports.createEmployee = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password
    } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).send({
        message: "Já existe um usuário com esse e-mail"
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hash,

      // Importantíssimo:
      // não aceitamos role enviado pelo frontend.
      role: "employee"
    });

    res.status(201).send({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active
    });

  } catch (error) {
    next(error);
  }
};
module.exports.login = async (req, res, next) => {
  try {
    const {
      email,
      password
    } = req.body;

    console.log("EMAIL RECEBIDO:", email);
    console.log("SENHA RECEBIDA:", password);

    const user = await User.findOne({ email })
      .select("+password");

    console.log("USUÁRIO ENCONTRADO:", user);

    if (!user) {
      console.log("ERRO: usuário não encontrado");

      return res.status(401).send({
        message: "E-mail ou senha incorretos"
      });
    }

    if (!user.active) {
      return res.status(403).send({
        message: "Usuário desativado"
      });
    }

    console.log("HASH NO BANCO:", user.password);

    const matched = await bcrypt.compare(
      password,
      user.password
    );

    console.log("SENHA CORRESPONDE:", matched);

    if (!matched) {
      console.log("ERRO: senha incorreta");

      return res.status(401).send({
        message: "E-mail ou senha incorretos"
      });
    }

    const token = jwt.sign(
      {
        _id: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    res.send({
      token
    });

  } catch (error) {
    next(error);
  }
};
module.exports.getCurrentUser = (req, res, next) => {
  User.findById(req.user._id)
    .then((user) => {
      if (!user) {
        return res.status(404).send({
          message: "Usuário não encontrado"
        });
      }

      return res.send(user);
    })
    .catch(next);
};
module.exports.getEmployees = (req, res, next) => {
  User.find({
    role: "employee"
  })
    .then((employees) => {
      res.send(employees);
    })
    .catch(next);
};
module.exports.disableEmployee = (req, res, next) => {
  User.findOneAndUpdate(
    {
      _id: req.params.userId,
      role: "employee"
    },
    {
      active: false
    },
    {
      new: true
    }
  )
    .then((user) => {
      if (!user) {
        return res.status(404).send({
          message: "Funcionário não encontrado"
        });
      }

      return res.send(user);
    })
    .catch(next);
};
module.exports.enableEmployee = (req, res, next) => {
  User.findOneAndUpdate(
    {
      _id: req.params.userId,
      role: "employee"
    },
    {
      active: true
    },
    {
      new: true
    }
  )
    .then((user) => {
      if (!user) {
        return res.status(404).send({
          message: "Funcionário não encontrado"
        });
      }

      return res.send(user);
    })
    .catch(next);
};
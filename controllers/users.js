const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/users");
const Client = require('../models/clients');
const LoginCode = require("../models/loginCode");
const resend = require('../utils/resend')

const { generateCode, hashCode } = require("../utils/loginCode");

const { maskEmail, maskPhone } = require('../utils/masks')

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
    const { email, password } = req.body;

    return User.findUserByCredentials(email, password)
      .then((user) => {
        const token = jwt.sign(
        { _id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.send({token});
    })
    .catch((e) => {
      const err = new Error("Credenciais inválidas");
      err.statusCode = 401;
      return next(err);
    });
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

      return res.status(201).send(user);
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

//Clientes

module.exports.checkClient = (req, res, next) => {
  const { email } = req.body;

  Client.findOne({ email })
    .then((client) => {
      if(!client){
        const exists = false
        res.send(exists);
      }
      else{
        res.send({
          exists: true,

          customer : {
            email: maskEmail(client.email),
            phone: maskPhone(client.phone)
          }
        });
      }
    })
}

module.exports.createClient = (req, res, next) => {
  const {
    name,
    email,
    password,
    phone,
  } = req.body

  console.log(name)
  bcrypt.hash(password, 10)
    .then((hash) => Client.create({name, email, password: hash, phone}))
    .then((user) => res.status(201).send({ _id: user._id, email: user.email, name: user.name }))
    .catch(next);
}

function createCustomerToken(customer) {
  return jwt.sign(
    {
      _id: customer._id,
      type: "customer"
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}

module.exports.sendEmailCode = async (
  req,
  res,
  next
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).send({
        message: "E-mail é obrigatório"
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const customer = await Client.findOne({
      email: normalizedEmail
    });

    if (!customer) {
      return res.status(404).send({
        message: "Cliente não encontrado"
      });
    }

    if (!customer.active) {
      return res.status(403).send({
        message: "Conta desativada"
      });
    }

    // 583291, por exemplo
    const code = generateCode();

    // transforma o código em hash
    const codeHash = hashCode(code);

    // remove código anterior
    await LoginCode.deleteMany({
      customer: customer._id,
      type: "email"
    });

    // salva o novo código
    await LoginCode.create({
      customer: customer._id,
      type: "email",
      codeHash,

      // 5 minutos
      expiresAt: new Date(
        Date.now() + 5 * 60 * 1000
      )
    });

    // envia o código
    const { error } = await resend.emails.send({
      from: `Eskimó Sorveteria <${process.env.EMAIL_FROM}>`,
      to: customer.email,
      subject: "Seu código de acesso",
      html: `
        <div
          style="
            font-family: Arial, sans-serif;
            max-width: 500px;
            margin: auto;
          "
        >
          <h2>
            Seu código de acesso
          </h2>

          <p>
            Use o código abaixo para entrar
            na sua conta:
          </p>

          <div
            style="
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              margin: 30px 0;
            "
          >
            ${code}
          </div>

          <p>
            O código expira em 5 minutos.
          </p>

          <p>
            Se você não solicitou este código,
            ignore este e-mail.
          </p>
        </div>
      `
    });

    if (error) {
      // se o envio falhou, não deixa código válido no banco
      await LoginCode.deleteMany({
        customer: customer._id,
        type: "email"
      });

      return res.status(500).send({
        message: "Não foi possível enviar o código"
      });
    }

    return res.send({
      message: "Código enviado por e-mail"
    });

  } catch (error) {
    next(error);
  }
};
module.exports.verifyEmailCode = async (
  req,
  res,
  next
) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).send({
        message: "E-mail e código são obrigatórios"
      });
    }

    // exatamente 6 números
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).send({
        message: "O código deve conter 6 números"
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const customer = await Client.findOne({
      email: normalizedEmail
    });

    if (!customer) {
      return res.status(401).send({
        message: "Código inválido"
      });
    }

    const loginCode = await LoginCode.findOne({
      customer: customer._id,
      type: "email"
    });

    if (!loginCode) {
      return res.status(401).send({
        message: "Código inválido ou expirado"
      });
    }

    // verifica se expirou
    if (loginCode.expiresAt < new Date()) {
      await loginCode.deleteOne();

      return res.status(401).send({
        message: "Código expirado"
      });
    }

    // máximo de 5 tentativas
    if (loginCode.attempts >= 5) {
      await loginCode.deleteOne();

      return res.status(429).send({
        message: "Limite de tentativas atingido"
      });
    }

    const receivedCodeHash = hashCode(code);

    // código errado
    if (
      receivedCodeHash !== loginCode.codeHash
    ) {
      loginCode.attempts += 1;

      await loginCode.save();

      return res.status(401).send({
        message: "Código incorreto"
      });
    }

    await loginCode.deleteOne();

    const token = createCustomerToken(customer);

    return res.send({
      token
    });

  } catch (error) {
    next(error);
  }
};
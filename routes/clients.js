const router = require("express").Router();

const auth = require("../middlewares/auth");

const { checkClient, createClient, sendEmailCode, verifyEmailCode } = require('../controllers/users')

router.post('/', checkClient)
router.post('/signup', createClient)
router.post("/login/email/send-code", sendEmailCode);
router.post("/login/email/verify-code", verifyEmailCode);

module.exports = router
module.exports.maskEmail = (email) => {
  const [name, domain] = email.split("@");

  if (!name || !domain) {
    return email;
  }

  const maskedName =
    name.length <= 2
      ? `${name[0]}*`
      : `${name[0]}${"*".repeat(name.length - 2)}${name.at(-1)}`;

  return `${maskedName}@${domain}`;
}

module.exports.maskPhone = (phone) => {
  if (!phone) {
    return "";
  }

  return `(**) *****-${phone.slice(-4)}`;
}
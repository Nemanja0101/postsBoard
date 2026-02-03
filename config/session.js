const session = require("express-session");
const storePg = require("connect-pg-simple")(session);
const pool = require("./dbConnection");
require("dotenv").config();

module.exports = session({
  store: new storePg({
    pool: pool,
    tableName: "user_sessions",
    createTableIfMissing: true,
  }),
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
});

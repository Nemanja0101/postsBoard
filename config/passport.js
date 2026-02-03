const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const db = require("./dbConnection");
const bcrypt = require("bcrypt");

passport.use(
  new LocalStrategy(async (username, password, cb) => {
    try {
      const { rows } = await db.query(
        "SELECT * FROM users WHERE username =$1",
        [username],
      );
      const user = rows[0];

      if (!user) {
        return cb(null, false, { message: "Incorrect credentials" });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return cb(null, false, { message: "Incorrect credentials" });
      }

      return cb(null, user);
    } catch (err) {
      return cb(err);
    }
  }),
);

passport.serializeUser((user, cb) => {
  cb(null, user.id);
});

passport.deserializeUser(async (id, cb) => {
  try {
    const { rows } = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    const user = rows[0];

    cb(null, user);
  } catch (err) {
    cb(err);
  }
});

module.exports = passport;

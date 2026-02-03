const db = require("../config/dbConnection");

async function createNewUser(username, firstName, lastName, hashedPassword) {
  const { rowCount } = await db.query(
    "INSERT INTO users (username, first_name, last_name, password) VALUES ($1,$2,$3,$4)",
    [username, firstName, lastName, hashedPassword],
  );

  if (rowCount < 1) {
    throw new Error("Signup failed");
  }
}

async function checkUsernameExists(username) {
  const result = await db.query(
    "SELECT EXISTS( SELECT 1 FROM users WHERE username = $1);",
    [username],
  );
  return result.rows[0].exists;
}

module.exports = { createNewUser, checkUsernameExists };

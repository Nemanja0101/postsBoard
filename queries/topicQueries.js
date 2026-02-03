const db = require("../config/dbConnection");

async function createNewTopic(name, type, adminId) {
  const client = await db.connect();

  const topicCreateQuery =
    "INSERT INTO topics (name,type) VALUES ($1, $2) RETURNING id";
  const insertAdmin =
    "INSERT INTO topics_users (user_id, topic_id, user_status) VALUES ($1, $2, $3)";

  try {
    await client.query("BEGIN");
    const data = await client.query(topicCreateQuery, [name, type]);
    const topicId = data.rows[0].id;
    console.log(topicId);

    await client.query(insertAdmin, [adminId, topicId, "admin"]);

    await client.query("COMMIT");

    return topicId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { createNewTopic };

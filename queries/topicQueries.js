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

async function getAllPublicTopics() {
  const { rows } = await db.query(`
    SELECT *
    FROM topics
    WHERE type = 'public'
    ORDER BY name ASC
  `);
  return rows;
}

async function getAllPrivateTopics() {
  const { rows } = await db.query(
    "SELECT id, name, type FROM topics WHERE type='private'",
  );
  return rows;
}

async function fetchPostsForTopics(idsToFetchPosts) {
  const { rows } = await db.query(
    "SELECT * FROM posts WHERE topic_id = ANY($1::uuid[]) ORDER BY created_at DESC",
    [idsToFetchPosts],
  );

  return rows;
}

module.exports = {
  createNewTopic,
  getAllPublicTopics,
  getAllPrivateTopics,
  fetchPostsForTopics,
};

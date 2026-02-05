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

async function searchPublicTopics(name) {
  const { rows } = await db.query(
    `
    SELECT *
    FROM topics
    WHERE name ILIKE '%' || $1 || '%'
      AND type = 'public'
    `,
    [name],
  );

  return rows;
}

async function searchPrivateTopics(name) {
  const { rows } = await db.query(
    `SELECT * 
    FROM topics 
    WHERE name ILIKE '%' || $1 || '%'
       AND type = 'private'`,
    [name],
  );

  return rows;
}

async function getSingleTopicWithData(topicId, userId) {
  const { rows } = await db.query(
    `SELECT 
      t.id,
      t.name, 
      t.type,
      tu.user_status,

      p.id AS post_id,
      p.title AS post_title,
      p.content AS post_content,
      p.created_at AS post_created_at,
      p.author_id AS post_author_id,

      member_u.id AS member_id,
      member_u.username AS member_username,
      member_tu.user_status AS member_status

    FROM topics t 
    LEFT JOIN topics_users tu 
      ON t.id = tu.topic_id AND tu.user_id = $2
    LEFT JOIN posts p 
      ON t.id = p.topic_id
    LEFT JOIN topics_users member_tu 
      ON t.id = member_tu.topic_id
    LEFT JOIN users member_u 
      ON member_tu.user_id = member_u.id
    WHERE t.id = $1`,
    [topicId, userId],
  );

  // console.log("Public fetch (raw rows):", rows.length);
  // console.log(rows);

  return rows;
}

async function getPrivateSingleTopic(topicId, userId) {
  const { rows } = await db.query(
    `
    SELECT
      t.id,
      t.name,
      t.type,
      tu.user_status, 

      CASE WHEN tu.user_id IS NOT NULL THEN p.id ELSE NULL END AS post_id,
      CASE WHEN tu.user_id IS NOT NULL THEN p.title ELSE NULL END AS post_title,
      CASE WHEN tu.user_id IS NOT NULL THEN p.content ELSE NULL END AS post_content,
      CASE WHEN tu.user_id IS NOT NULL THEN p.created_at ELSE NULL END AS post_created_at,
      CASE WHEN tu.user_id IS NOT NULL THEN p.author_id ELSE NULL END AS post_author_id,

      CASE WHEN tu.user_id IS NOT NULL THEN member_u.id ELSE NULL END AS member_id,
      CASE WHEN tu.user_id IS NOT NULL THEN member_u.username ELSE NULL END AS member_username,
      CASE WHEN tu.user_id IS NOT NULL THEN member_tu.user_status ELSE NULL END AS member_status

    FROM topics t

    LEFT JOIN topics_users tu
      ON tu.topic_id = t.id
      AND tu.user_id = $2    

    LEFT JOIN posts p
      ON p.topic_id = t.id

    LEFT JOIN topics_users member_tu
      ON member_tu.topic_id = t.id
    
    LEFT JOIN users member_u
      ON member_u.id = member_tu.user_id

    WHERE t.id = $1;
    `,
    [topicId, userId],
  );

  // console.log("private fetch (raw rows):", rows.length);
  // console.log(rows);
  return rows;
}
module.exports = {
  createNewTopic,
  getAllPublicTopics,
  getAllPrivateTopics,
  fetchPostsForTopics,
  searchPublicTopics,
  searchPrivateTopics,
  getSingleTopicWithData,
  getPrivateSingleTopic,
};

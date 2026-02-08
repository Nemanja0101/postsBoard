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
    `
    WITH topic_posts AS (
      SELECT 
        posts.topic_id, 
        json_agg(json_build_object(
          'id', posts.id,
          'title', posts.title,
          'content', posts.content,
          'created_at', posts.created_at,
          'author_id', posts.author_id,
          'author_username', u.username
        ) ORDER BY posts.created_at DESC) AS posts
      FROM posts
      JOIN users u ON posts.author_id = u.id 
      WHERE posts.topic_id = $1
      GROUP BY posts.topic_id
    ),
    topic_members AS (
      SELECT 
        tu.topic_id, 
        json_agg(json_build_object(
          'id', u.id,
          'username', u.username,
          'status', tu.user_status
        )) AS members
      FROM topics_users tu
      JOIN users u ON u.id = tu.user_id
      WHERE tu.topic_id = $1
      GROUP BY tu.topic_id
    )
    SELECT
      t.id,
      t.name,
      t.type,
      tu.user_status AS current_user_status,
      COALESCE(tp.posts, '[]'::json) AS posts,
      COALESCE(tm.members, '[]'::json) AS members
    FROM topics t
    -- Get the status for the specific user requesting the page
    LEFT JOIN topics_users tu 
      ON t.id = tu.topic_id AND tu.user_id = $2
    -- Join the aggregated JSON data
    LEFT JOIN topic_posts tp ON tp.topic_id = t.id
    LEFT JOIN topic_members tm ON tm.topic_id = t.id
    WHERE t.id = $1;
    `,
    [topicId, userId],
  );

  // Since we are getting a single topic, we return rows[0]
  // If the topic doesn't exist, rows[0] will be undefined
  return rows[0];
}
async function getPrivateSingleTopic(topicId, userId) {
  const { rows } = await db.query(
    `
  WITH topic_posts AS (
      SELECT 
        posts.topic_id, 
        json_agg(json_build_object(
          'id', posts.id,
          'title', posts.title,
          'content', posts.content,
          'created_at', posts.created_at,
          'author_id', posts.author_id,
          'author_username', u.username
        ) ORDER BY posts.created_at DESC) AS posts
      FROM posts
      JOIN users u ON posts.author_id = u.id 
      WHERE posts.topic_id = $1
      GROUP BY posts.topic_id
    ),
    topic_members AS (
      SELECT 
        tu.topic_id, 
        json_agg(json_build_object(
          'id', u.id,
          'username', u.username,
          'status', tu.user_status
        )) AS members
      FROM topics_users tu
      JOIN users u ON u.id = tu.user_id
      WHERE tu.topic_id = $1
      GROUP BY tu.topic_id
    )
    SELECT
      t.id,
      t.name,
      t.type,
      tu.user_status AS current_user_status,
      
      -- If tu.user_id is NULL, the user isn't a member, so we return an empty arrsay []
      -- Otherwise, we return the aggregated posts (or [] if no posts exist)
      CASE 
        WHEN tu.user_id IS NOT NULL THEN COALESCE(tp.posts, '[]'::json)
        ELSE '[]'::json 
      END AS posts,

      CASE 
        WHEN tu.user_id IS NOT NULL THEN COALESCE(tm.members, '[]'::json)
        ELSE '[]'::json 
      END AS members

    FROM topics t
    -- We check if the requesting user ($2) is a member
    LEFT JOIN topics_users tu 
      ON t.id = tu.topic_id AND tu.user_id = $2
    LEFT JOIN topic_posts tp ON tp.topic_id = t.id
    LEFT JOIN topic_members tm ON tm.topic_id = t.id
    WHERE t.id = $1;
    `,
    [topicId, userId],
  );

  return rows[0];
}

async function userIsAdmin(tid, uid) {
  const { rows } = await db.query(
    ` SELECT EXISTS( 
    SELECT 1 FROM topics_users 
    WHERE topic_id = $1 
      AND user_id = $2
      AND user_status = 'admin'
    )`,
    [tid, uid],
  );

  //better version  ?
  return rows[0]?.exists ?? false;
}

// id | topic_id | requesting_user_id

//3 approaches,
// 1. do a massive join query which will produce a cartesian explosion
// 2. use a json_agg function of postgres to group it on postgres side
// 3. or make 3-4 round trips to the database
// for the sake of learning i'll just re-implement this in agg query

async function getSingleTopicWithDataAdmin(topicId, userId) {
  const data = await db.query(
    `
    WITH topic_posts AS (
      SELECT 
        posts.topic_id, 
        json_agg(json_build_object(
          'id', posts.id,
          'title', posts.title,
          'content', posts.content,
          'created_at', posts.created_at,
          'author_id', posts.author_id,
          'author_username', u.username
        ) ORDER BY posts.created_at DESC) AS posts
      FROM posts
      JOIN users u ON posts.author_id = u.id 
      WHERE posts.topic_id = $1
      GROUP BY posts.topic_id
    ),
    topic_members AS (
      SELECT tu.topic_id, json_agg(json_build_object(
        'id', u.id,
        'username', u.username,
        'status', tu.user_status
      )) AS members
      FROM topics_users tu
      JOIN users u ON u.id = tu.user_id
      WHERE tu.topic_id = $1
      GROUP BY tu.topic_id
    ),
    topic_requests AS (
      SELECT ter.topic_id, json_agg(json_build_object(
        'request_id', ter.id,
        'user_id', u.id,
        'username', u.username
      )) AS requests
      FROM topic_entry_request ter
      JOIN users u ON u.id = ter.requesting_user_id
      WHERE ter.topic_id = $1
      GROUP BY ter.topic_id
    )
    SELECT
      t.id,
      t.name,
      t.type,
      COALESCE(tp.posts, '[]'::json) AS posts,
      COALESCE(tm.members, '[]'::json) AS members,
      COALESCE(tr.requests, '[]'::json) AS requests
    FROM topics t
    LEFT JOIN topic_posts tp ON tp.topic_id = t.id
    LEFT JOIN topic_members tm ON tm.topic_id = t.id
    LEFT JOIN topic_requests tr ON tr.topic_id = t.id
    WHERE t.id = $1
    AND EXISTS (
      SELECT 1 FROM topics_users
      WHERE topic_id = t.id AND user_id = $2 AND user_status = 'admin'
    );
    `,
    [topicId, userId],
  );

  console.log(JSON.stringify(data.rows[0], null, 2));

  return data.rows[0];
}

async function insertJoinReq(topicId, currentUserId) {
  const data = await db.query(
    `

      INSERT INTO topic_entry_request (topic_id, requesting_user_id)
      VALUES ($1,$2);

    `,
    [topicId, currentUserId],
  );

  console.log(data);

  if (data.rowCount === 1) {
    return true;
  } else {
    return false;
  }
}
async function approveReq(requestId, topicId) {
  const client = await db.connect();

  const addUserToTopic = `
    INSERT INTO topics_users (user_id, topic_id, user_status)
    SELECT requesting_user_id, $2, 'member'
    FROM topic_entry_request
    WHERE id = $1
    ON CONFLICT (user_id, topic_id) DO NOTHING
    RETURNING user_id;
  `;

  const removeUserFromRequests = `
    DELETE FROM topic_entry_request
    WHERE id = $1;
  `;

  try {
    await client.query("BEGIN");

    const addData = await client.query(addUserToTopic, [requestId, topicId]);

    // Only delete request if approval actually happened
    if (addData.rowCount === 1) {
      await client.query(removeUserFromRequests, [requestId]);
    }

    await client.query("COMMIT");

    return addData.rowCount === 1;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function denyReq(requestId) {
  const query = `
    DELETE FROM topic_entry_request
    WHERE id = $1
    RETURNING id;
  `;

  const { rowCount } = await db.query(query, [requestId]);
  return rowCount === 1;
}

async function joinTopic(uid, tid) {
  const query = `
  INSERT INTO topics_users(user_id, topic_id)
  VALUES ($1, $2)
  `;

  const { rowCount } = await db.query(query, [uid, tid]);
  return rowCount === 1;
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
  userIsAdmin,
  getSingleTopicWithDataAdmin,
  insertJoinReq,
  approveReq,
  denyReq,
  joinTopic,
};

// SELECT
//       t.id,
//       t.name,
//       t.type,

//       p.id AS post_id,
//       p.title AS post_title,
//       p.content AS post_content,
//       p.created_at AS post_created_at,

//       member_u.id AS member_id,
//       member_u.username AS member_username,
//       member_tu.user_status AS member_status,

//       req_u.id AS request_user_id,
//       req_u.username AS request_username

//     FROM topics t

//     LEFT JOIN posts p
//       ON p.topic_id = t.id

//     LEFT JOIN topics_users member_tu
//       ON member_tu.topic_id = t.id
//     LEFT JOIN users member_u
//       ON member_u.id = member_tu.user_id

//     LEFT JOIN topic_entry_request teq
//       ON teq.topic_id = t.id
//     LEFT JOIN users req_u
//       ON req_u.id = teq.requesting_user_id

//     WHERE t.id = $1
//       AND EXISTS (
//         SELECT 1
//         FROM topics_users
//         WHERE topic_id = t.id
//           AND user_id = $2
//           AND user_status = 'admin'

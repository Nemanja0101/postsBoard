const db = require("../config/dbConnection");

async function userIsMember(tid, uid) {
  const { rows } = await db.query(
    `SELECT EXISTS( 
    SELECT 1 FROM topics_users 
    WHERE topic_id = $1 
      AND user_id = $2
    )`,
    [tid, uid],
  );

  return rows[0]?.exists ?? false;
}

async function createPost(uid, tid, title, content) {
  const { rows } = await db.query(
    `INSERT INTO posts (author_id, topic_id, title, content) 
     VALUES ($1, $2, $3, $4) 
     RETURNING *`,
    [uid, tid, title, content],
  );

  return rows[0];
}

async function deletePost(pid, tid) {
  const SQL = `DELETE FROM posts WHERE id = $1 AND topic_id = $2`;

  db.query(SQL, [pid, tid]);
}

module.exports = { userIsMember, createPost, deletePost };

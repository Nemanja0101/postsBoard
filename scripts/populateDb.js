require("dotenv").config();

const { Client } = require("pg");

const SQL = `
    
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";   

    DROP TABLE IF EXISTS topics_users;
    DROP TABLE IF EXISTS posts;
    DROP TABLE IF EXISTS topics;
    DROP TABLE IF EXISTS users;

    DROP TYPE IF EXISTS member_status;
    DROP TYPE IF EXISTS topic_type;

    CREATE TYPE member_status AS ENUM ('admin', 'member');
    CREATE TYPE topic_type AS ENUM ('public', 'private');

    CREATE TABLE IF NOT EXISTS users(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR ( 255 ) UNIQUE NOT NULL,
        first_name VARCHAR ( 255 ) NOT NULL,
        last_name VARCHAR ( 255 ) NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topics(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR ( 50 ) UNIQUE NOT NULL,
        type topic_type NOT NULL DEFAULT 'public',
        password TEXT,
        CHECK ((type = 'private' AND password IS NOT NULL) OR type='public')
    );

    CREATE TABLE IF NOT EXISTS posts(

        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        author_id UUID REFERENCES users(id),
        topic_id UUID REFERENCES topics(id),
        title VARCHAR ( 100 ) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        
    );

    CREATE TABLE IF NOT EXISTS topics_users(
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
        user_status member_status NOT NULL DEFAULT 'member',
        PRIMARY KEY(user_id, topic_id)
    );
        
    CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
    CREATE INDEX IF NOT EXISTS idx_posts_topic ON posts(topic_id);


`;

async function main() {
  console.log("seeding..");

  console.log({
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.PORT,
  });

  const client = new Client({
    connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.PORT}/messageboard`,
  });

  await client.connect();
  await client.query(SQL);
  await client.end();

  console.log("Done seeding");
}

main();

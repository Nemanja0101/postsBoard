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

    CREATE TABLE IF NOT EXISTS topic_entry_request(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id UUID REFERENCES topics(id),
        requesting_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (topic_id, requesting_user_id)
    );
        
    CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
    CREATE INDEX IF NOT EXISTS idx_posts_topic ON posts(topic_id);


`;

const insertSQL = `

   -- 1. Insert Users
-- We create 5 users. Passwords are hashed using pgcrypto for realism.
INSERT INTO users (id, username, first_name, last_name, password) VALUES
('11111111-1111-1111-1111-111111111111', 'alice_admin', 'Alice', 'Adminson', crypt('password123', gen_salt('bf'))),
('22222222-2222-2222-2222-222222222222', 'bob_builder', 'Bob', 'Builder', crypt('canwefixit', gen_salt('bf'))),
('33333333-3333-3333-3333-333333333333', 'charlie_dev', 'Charlie', 'Codes', crypt('devpass', gen_salt('bf'))),
('44444444-4444-4444-4444-444444444444', 'dave_designer', 'Dave', 'Draws', crypt('artislife', gen_salt('bf'))),
('55555555-5555-5555-5555-555555555555', 'eve_enthusiast', 'Eve', 'Everywhere', crypt('securepass', gen_salt('bf')));

-- 2. Insert Topics
-- 4 Public Topics and 4 Private Topics
INSERT INTO topics (id, name, type, password) VALUES
-- Public
('10000000-0000-0000-0000-000000000001', 'General Chat', 'public', NULL),
('10000000-0000-0000-0000-000000000002', 'React Developers', 'public', NULL),
('10000000-0000-0000-0000-000000000003', 'SQL Help', 'public', NULL),
('10000000-0000-0000-0000-000000000004', 'Random Memes', 'public', NULL),
-- Private (Must have passwords)
('20000000-0000-0000-0000-000000000001', 'Admin Staff', 'private', 'supersecret'),
('20000000-0000-0000-0000-000000000002', 'Project Alpha', 'private', 'launch2024'),
('20000000-0000-0000-0000-000000000003', 'Secret Surprise', 'private', 'shhhhh'),
('20000000-0000-0000-0000-000000000004', 'Investors Board', 'private', 'moneytalks');

-- 3. Insert Topic Memberships (topics_users)
-- We need to assign users to topics so they have permission to post (especially in private ones).
INSERT INTO topics_users (topic_id, user_id, user_status) VALUES
-- Alice is admin of General and Admin Staff
('10000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'admin'),
('20000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'admin'),

-- Bob, Charlie, Dave are members of React Developers
('10000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'member'),
('10000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'admin'),
('10000000-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', 'member'),

-- Alice, Bob, and Dave are in Project Alpha (Private)
('20000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'admin'),
('20000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'member'),
('20000000-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', 'member'),

-- Everyone is in General Chat
('10000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'member'),
('10000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'member'),
('10000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'member'),
('10000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'member');

-- 4. Insert Posts

-- CONVERSATION 1: React Developers (Public) - 8 Posts
-- Focusing on a technical question
INSERT INTO posts (topic_id, author_id, title, content, created_at) VALUES
('10000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'useEffect dependency array help', 'I keep getting an infinite loop in my useEffect. Can anyone help?', NOW() - INTERVAL '2 days'),
('10000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Re: useEffect dependency array help', 'Post your code snippet please, otherwise we can''t see what''s wrong.', NOW() - INTERVAL '1 day 23 hours'),
('10000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Code Snippet', 'useEffect(() => { setState(state + 1) }, [state]); This is what I have.', NOW() - INTERVAL '1 day 22 hours'),
('10000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Found the issue', 'You are updating the state inside the effect, and the state is also in the dependency array. It triggers itself endlessly.', NOW() - INTERVAL '1 day 20 hours'),
('10000000-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', 'Another solution', 'You might want to use a functional update: setState(s => s + 1) and remove state from the array.', NOW() - INTERVAL '1 day 18 hours'),
('10000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Thanks!', 'That worked perfectly, thanks Charlie and Dave!', NOW() - INTERVAL '1 day 17 hours'),
('10000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'No problem', 'Happy to help. React hooks can be tricky at first.', NOW() - INTERVAL '1 day 16 hours'),
('10000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Mod Note', 'Great to see helpful responses here. Keep it up!', NOW() - INTERVAL '1 day 10 hours');

-- CONVERSATION 2: Project Alpha (Private) - 7 Posts
-- Focusing on a work project update
INSERT INTO posts (topic_id, author_id, title, content, created_at) VALUES
('20000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Weekly Sync', 'What is the status on the backend API?', NOW() - INTERVAL '5 hours'),
('20000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Backend Update', 'The API is 90% done. Just need to finish the authentication middleware.', NOW() - INTERVAL '4 hours 30 minutes'),
('20000000-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', 'Frontend Update', 'I have finished the dashboard UI. Waiting on the API to hook up the data.', NOW() - INTERVAL '4 hours 15 minutes'),
('20000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Timeline', 'Can we deploy to staging by Friday?', NOW() - INTERVAL '4 hours'),
('20000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Deployment', 'Friday might be tight if we encounter bugs, but I think we can make it.', NOW() - INTERVAL '3 hours'),
('20000000-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', 'Blockers', 'I need the API documentation updated, Bob.', NOW() - INTERVAL '2 hours'),
('20000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'On it', 'Updating the swagger docs now.', NOW() - INTERVAL '1 hour');

-- CONVERSATION 3: General Chat (Public) - 6 Posts
-- Casual introduction
INSERT INTO posts (topic_id, author_id, title, content, created_at) VALUES
('10000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'Hello World!', 'Just joined the forum. What is this place about?', NOW() - INTERVAL '5 days'),
('10000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Welcome!', 'Welcome Eve! This is a place to discuss tech, life, and everything in between.', NOW() - INTERVAL '4 days 23 hours'),
('10000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'Nice to meet you', 'Thanks Alice. I am really into databases.', NOW() - INTERVAL '4 days 20 hours'),
('10000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Databases', 'You should check out the SQL Help topic then, lots of activity there.', NOW() - INTERVAL '4 days 15 hours'),
('10000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Hi Eve', 'Welcome to the community.', NOW() - INTERVAL '4 days 10 hours'),
('10000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'Design?', 'Do you do any UI work or just backend?', NOW() - INTERVAL '3 days');



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
  await client.query(insertSQL);
  await client.end();

  console.log("Done seeding");
}

main();

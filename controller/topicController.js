const topicQuery = require("../queries/topicQueries");
const { body, matchedData, validationResult } = require("express-validator");

const topicValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("You must provide a topic name!")
    .isLength({ min: 2, max: 40 })
    .withMessage("Topic name must be between 2 and 40 characters"),
  body("type")
    .isIn(["public", "private"])
    .withMessage("Type must be either 'open' or 'private'"),
];

function renderCreateTopicForm(req, res) {
  res.render("createTopic", { errors: [] });
}

const createTopic = [
  topicValidation,
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.render("createTopic", {
        errors: errors.array(),
      });
    }

    const { name, type } = matchedData(req);

    try {
      await topicQuery.createNewTopic(name, type, req.user.id);
    } catch (err) {
      return res.render("createTopic", {
        errors: [
          {
            msg: "Internal server error when creating a topic, please try again",
          },
        ],
      });
    }

    res.redirect("/");
  },
];

async function renderMainTopicsPage(req, res) {
  // get all public topics
  const publicRows = await topicQuery.getAllPublicTopics();

  const idsToFetchPosts = [
    publicRows[0].id,
    publicRows[1].id,
    publicRows[2].id,
    publicRows[3].id,
  ];

  const postsForTopics = await topicQuery.fetchPostsForTopics(idsToFetchPosts);

  const postsByTopicId = {};

  for (const post of postsForTopics) {
    if (!postsByTopicId[post.topic_id]) {
      postsByTopicId[post.topic_id] = [];
    }
    postsByTopicId[post.topic_id].push(post);
  }

  //ensures topics that don't have posts get their id passed onto to template
  const displayTopics = {};
  for (const topic of publicRows.slice(0, 4)) {
    displayTopics[topic.id] = postsByTopicId[topic.id] ?? [];
  }

  const privateRows = await topicQuery.getAllPrivateTopics();

  res.render("posts", {
    publicTopics: publicRows,
    privateTopics: privateRows,
    displayTopics: displayTopics,
  });
}

function renderTopicsSearchPage(req, res) {
  const privateMode = req.params.private === "private";
  const mode = privateMode ? true : false;

  res.render("searchTopic", { errors: [], mode: mode });
}

// function createTopic(req, res) {};

async function searchTopics(req, res) {
  const { name, private: privateParam } = req.query;

  const isPrivate = privateParam === "true";

  const results = isPrivate
    ? await topicQuery.searchPrivateTopics(name)
    : await topicQuery.searchPublicTopics(name);

  res.render("searchTopic", {
    errors: [],
    mode: isPrivate,
    searchResults: results,
  });
}

async function renderSingleTopic(req, res) {
  try {
    const { topicId, topicType } = req.params;
    const currentUserId = req.user?.id;

    let data;
    let topic;
    let userIsMember;

    const posts = [];
    const members = [];

    if (topicType === "private" && !currentUserId) {
      return res.status(401).render("topic", { errors: ["Login required"] });
    }

    if (topicType === "public") {
      data = await topicQuery.getSingleTopicWithData(topicId);

      if (!data || data.length === 0) {
        return res.status(404).render("topic", { errors: ["Topic not found"] });
      }

      for (const obj of data) {
        if (obj.post_id && !posts[obj.post_id]) {
          posts[obj.post_id] = {
            id: obj.post_id,
            title: obj.post_title,
            content: obj.post_content,
            post_created_at: obj.post_created_at,
          };
        }

        if (obj.member_id && !members[obj.member_id]) {
          members[obj.member_id] = {
            id: obj.member_id,
            username: obj.member_username,
            status: obj.member_status,
          };
        }
      }

      topic = {
        id: data[0].id,
        name: data[0].name,
        type: data[0].type,
        posts: Object.values(posts),
        members: Object.values(members),
        userMembership: data[0].user_status,
        topicType: data[0].type,
      };
    } else if (topicType === "private") {
      data = await topicQuery.getPrivateSingleTopic(topicId, currentUserId);

      if (!data || data.length === 0) {
        return res.status(404).render("topic", { errors: ["Topic not found"] });
      }

      if (data[0].user_status) {
        // user is a member

        for (const obj of data) {
          if (obj.post_id && !posts[obj.post_id]) {
            posts[obj.post_id] = {
              id: obj.post_id,
              title: obj.post_title,
              content: obj.post_content,
              post_created_at: obj.post_created_at,
            };
          }

          if (obj.member_id && !members[obj.member_id]) {
            members[obj.member_id] = {
              id: obj.member_id,
              username: obj.member_username,
              status: obj.member_status,
            };
          }
        }

        topic = {
          id: data[0].id,
          name: data[0].name,
          type: data[0].type,
          posts: Object.values(posts),
          members: Object.values(members),
          userMembership: data[0].user_status,
          topicType: data[0].type,
        };
      } else {
        topic = {
          id: data[0].id,
          name: data[0].name,
          type: data[0].type,
          posts: [],
          members: [],
          userMembership: data[0].user_status,
          topicType: data[0].type,
        };
      }
    }

    console.log(topic);

    res.render("topic", {
      topic: topic,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render("topic", { errors: ["Server error"] });
  }
}

module.exports = {
  renderCreateTopicForm,
  createTopic,
  renderMainTopicsPage,
  renderTopicsSearchPage,
  searchTopics,
  renderSingleTopic,
};

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

    if (topicType === "private" && !currentUserId) {
      return res.status(401).render("topic", { errors: ["Login required"] });
    }

    if (topicType === "public") {
      data = await topicQuery.getSingleTopicWithData(topicId, currentUserId);

      if (!data || data.length === 0) {
        return res.status(404).render("topic", { errors: ["Topic not found"] });
      }

      topic = {
        id: data.id,
        name: data.name,
        type: data.type,
        posts: data.posts,
        members: data.members,
        userMembership: data.current_user_status,
      };
    } else if (topicType === "private") {
      data = await topicQuery.getPrivateSingleTopic(topicId, currentUserId);

      if (!data || data.length === 0) {
        return res.status(404).render("topic", { errors: ["Topic not found"] });
      }

      if (data.current_user_status) {
        // user is a member
        topic = {
          id: data.id,
          name: data.name,
          type: data.type,
          posts: data.posts,
          members: data.members,
          userMembership: data.current_user_status,
        };
      } else {
        topic = {
          id: data.id,
          name: data.name,
          type: data.type,
          posts: [],
          members: [],
          userMembership: data.current_user_status,
        };
      }
    }

    res.render("topic", {
      topic: topic,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render("topic", { errors: ["Server error"] });
  }
}

async function renderAdminPanel(req, res) {
  const topicId = req.params.topicId;
  const currentUserId = req.user?.id;

  if (!currentUserId) {
    return res.status(401).render("adminPanel", {
      errors: ["Log in required"],
    });
  }

  const isAdmin = await topicQuery.userIsAdmin(topicId, currentUserId);

  if (!isAdmin) {
    return res.status(403).render("adminPanel", {
      errors: ["You are not an admin for this topic!"],
    });
  }

  // const posts = {};
  // const members = {};
  // const requests = {};

  const data = await topicQuery.getSingleTopicWithDataAdmin(
    topicId,
    currentUserId,
  );

  if (!data || data.length === 0) {
    return res
      .status(404)
      .render("adminPanel", { errors: ["Topic not found"] });
  }

  const topic = {
    id: data.id,
    name: data.name,
    type: data.type,
    posts: data.posts,
    members: data.members,
    requests: data.requests,
  };

  res.render("adminPanel", { topic: topic, errors: [] });
}

async function requestJoin(req, res) {
  const topicId = req.params.topicId;
  const currentUserId = req.user?.id;

  try {
    await topicQuery.insertJoinReq(topicId, currentUserId);
    return res.redirect(`/topics`);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).render("topic.ejs", {
        topic: null,
        errors: [
          "You have already sent a request to join this topic. Please wait for admin approval.",
        ],
      });
    }

    console.error("Unexpected error occured:", error);
    res.status(500).render("adminPanel", {
      topic: null,
      errors: ["Something went wrong. Please try again later."],
    });
  }
}

async function approveRequest(req, res) {
  const requestId = req.body.requestId;
  const topicId = req.body.topicId;
  const currentUserId = req.user?.id;

  if (!currentUserId) {
    return res.status(401).render("adminPanel", {
      errors: ["Log in required"],
    });
  }

  try {
    const userIsAdmin = await topicQuery.userIsAdmin(topicId, currentUserId);

    if (!userIsAdmin) {
      return res.status(403).render("adminPanel", {
        errors: ["You are not an admin for this topic!"],
      });
    }

    const isInserted = await topicQuery.approveReq(
      requestId,
      topicId,
      currentUserId,
    );

    if (isInserted) {
      const data = await topicQuery.getSingleTopicWithDataAdmin(
        topicId,
        currentUserId,
      );

      if (!data || data.length === 0) {
        return res
          .status(404)
          .render("adminPanel", { errors: ["Topic not found"] });
      }

      const topic = {
        id: data.id,
        tname: data.name,
        ttype: data.type,
        posts: data.posts,
        members: data.members,
        requests: data.requests,
      };
      res.render("adminPanel", { topic: topic, errors: [] });
    }
  } catch (error) {
    console.error("Unexpected error occured:", err);
    res.status(500).render("adminPanel", {
      topic: null,
      errors: ["Something went wrong. Please try again later."],
    });
  }
}

async function denyRequest(req, res) {
  const requestId = req.body.requestId;
  const topicId = req.body.topicId;
  const currentUserId = req.user?.id;

  if (!currentUserId) {
    return res.status(401).render("adminPanel", {
      errors: ["Log in required"],
    });
  }

  try {
    const userIsAdmin = await topicQuery.userIsAdmin(topicId, currentUserId);

    if (!userIsAdmin) {
      return res.status(403).render("adminPanel", {
        errors: ["You are not an admin for this topic!"],
      });
    }

    const wasDeleted = await topicQuery.denyReq(requestId);

    if (!wasDeleted) {
      return res.status(404).render("adminPanel", {
        errors: ["Request not found or already handled"],
      });
    }

    const data = await topicQuery.getSingleTopicWithDataAdmin(
      topicId,
      currentUserId,
    );

    if (!data || data.length === 0) {
      return res
        .status(404)
        .render("adminPanel", { errors: ["Topic not found"] });
    }

    const topic = {
      id: data.id,
      tname: data.name,
      ttype: data.type,
      posts: data.posts,
      members: data.members,
      requests: data.requests,
    };

    res.render("adminPanel", { topic, errors: [] });
  } catch (err) {
    console.error("Unexpected error occurred:", err);
    res.status(500).render("adminPanel", {
      topic: null,
      errors: ["Something went wrong. Please try again later."],
    });
  }
}

async function joinTopic(req, res) {
  const uid = req.user?.id;
  const tid = req.body.topicId;

  try {
    const entry = await topicQuery.joinTopic(uid, tid);

    return res.redirect(`/topic/${tid}/public`);
  } catch (error) {
    if (error.code === "23505") {
      return res.redirect(`/topic/${tid}/public`);
    }

    console.error("Error joining topic:", error);
    return res.render("error", {
      message: "Could not join topic. Please try again.",
    });
  }
}

async function promoteMemberToAdmin(req, res) {
  const { targetUserId, topicId } = req.body;
  const currentUserId = req.user.id;

  try {
    const requesterIsAdmin = await topicQuery.userIsAdmin(
      topicId,
      currentUserId,
    );

    if (!requesterIsAdmin) {
      return res
        .status(403)
        .send("Unauthorized: Only admins can promote members.");
    }

    const data = await topicQuery.promoteMember(topicId, targetUserId);

    res.redirect(`/topic/admin/${topicId}`);
  } catch (error) {
    console.error("Promotion Error:", error);
    res.status(500).send("Internal Server Error");
  }
}

module.exports = {
  renderCreateTopicForm,
  createTopic,
  renderMainTopicsPage,
  renderTopicsSearchPage,
  searchTopics,
  renderSingleTopic,
  renderAdminPanel,
  requestJoin,
  approveRequest,
  denyRequest,
  joinTopic,
  promoteMemberToAdmin,
};

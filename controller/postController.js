const { body, matchedData, validationResult } = require("express-validator");
const postQuery = require("../queries/postQueries");
const topicQuery = require("../queries/topicQueries");
const { post } = require("../routes/postRouter");

const postValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("You must provide a post title!")
    .isLength({ min: 2, max: 30 })
    .withMessage("Post name must be between 2 and 40 characters"),
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Post must not be empty!")
    .isLength({ max: 1024 })
    .withMessage("Post exceeds the maximum length"),
];

async function renderCreatePost(req, res) {
  const { topicId, topicType } = req.params;

  res.render("createPost", { topicId: topicId, topicType: topicType });
}

createPost = [
  postValidation,
  async (req, res) => {
    const errors = validationResult(req);

    const tid = req.body.topicId;
    const type = req.body.type;

    if (!errors.isEmpty()) {
      return res.render("createPost", {
        errors: errors.array(),
        topicId: tid,
        topicType: type,
      });
    }

    const { title, content } = matchedData(req);
    const uid = req.user?.id;

    try {
      // check if user is a member of the current topic
      const isMember = await postQuery.userIsMember(tid, uid);

      if (isMember) {
        //create a post
        await postQuery.createPost(uid, tid, title, content);

        return res.redirect(`/topic/${tid}/${type}`);
      } else {
        return res.render("createPost", {
          errors: [{ msg: "You must be a member of this topic to post." }],
          topicId: tid,
          topicType: type,
        });
      }
    } catch (error) {
      return res.render("createPost", {
        errors: [{ msg: "Database error. Please try again later." }],
        topicId: tid,
        topicType: type,
      });
    }
  },
];

async function deletePostAdmin(req, res) {
  const { postId, topicId } = req.body;
  const currentUserId = req.user.id;

  if (!currentUserId) {
    return res.status(401).render("adminPanel", {
      errors: ["Log in required"],
    });
  }

  try {
    const isAdmin = await topicQuery.userIsAdmin(topicId, currentUserId);

    if (!isAdmin) {
      return res.status(403).render("adminPanel", {
        topic: null,
        errors: ["You are not an admin for this topic!"],
      });
    }

    await postQuery.deletePost(postId, topicId);

    const data = await topicQuery.getSingleTopicWithDataAdmin(
      topicId,
      currentUserId,
    );

    if (!data) {
      return res.status(404).render("adminPanel", {
        topic: null,
        errors: ["Topic not found"],
      });
    }

    const topic = {
      id: data.id,
      name: data.name,
      type: data.type,
      posts: data.posts,
      members: data.members,
      requests: data.requests,
    };
    console.log("HELLO");
    console.log(topic);

    res.render("adminPanel", { topic: topic, errors: [] });
  } catch (error) {
    return res.status(403).render("adminPanel", {
      topic: null,
      errors: ["Internal server error!"],
    });
  }
}

module.exports = { renderCreatePost, createPost, deletePostAdmin };

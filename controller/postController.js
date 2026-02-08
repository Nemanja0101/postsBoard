const { body, matchedData, validationResult } = require("express-validator");
const postQuery = require("../queries/postQueries");

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

    console.log("creating a post with:");
    console.log(title, content, tid, uid, type);

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
      console.log(error);

      return res.render("createPost", {
        errors: [{ msg: "Database error. Please try again later." }],
        topicId: tid,
        topicType: type,
      });
    }
  },
];

module.exports = { renderCreatePost, createPost };

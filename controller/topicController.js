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

// function createTopic(req, res) {};

module.exports = { renderCreateTopicForm, createTopic };

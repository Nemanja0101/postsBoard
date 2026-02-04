const bcrypt = require("bcrypt");
const userQuery = require("../queries/userQueries");
const { body, matchedData, validationResult } = require("express-validator");
const passport = require("../config/passport");

const registerValidation = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isAlpha("en-US", { ignore: " -" })
    .withMessage("First name may contain only letters, spaces or hyphens")
    .isLength({ min: 2, max: 30 })
    .withMessage("First name must be between 2 and 30 characters"),

  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isAlpha("en-US", { ignore: " -" })
    .withMessage("Last name may contain only letters, spaces or hyphens")
    .isLength({ min: 2, max: 40 })
    .withMessage("Last name must be between 2 and 40 characters"),

  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isAlphanumeric()
    .withMessage("Username must be alphanumeric")
    .isLength({ min: 4, max: 14 })
    .withMessage("Username must be between 4 and 14 characters")
    .custom(async (value) => {
      const exists = await userQuery.checkUsernameExists(value);
      if (exists) {
        throw new Error("Username already exists");
      }
      return true;
    }),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6, max: 20 })
    .withMessage("Password must be between 6 and 20 characters"),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Please confirm your password")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
];

function renderSignUpForm(req, res) {
  res.render("signUpForm", { errors: [] });
}

function renderHomePage(req, res) {
  res.render("homepage");
}

const createNewUser = [
  registerValidation,
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.render("signUpForm", {
        errors: errors.array(),
      });
    }

    const { firstName, lastName, username, password } = matchedData(req);

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      await userQuery.createNewUser(
        username,
        firstName,
        lastName,
        hashedPassword,
      );
    } catch (err) {
      res.render("signUpForm", {
        errors: [{ msg: err.message || "Something went wrong" }],
      });
    }

    res.redirect("/");
  },
];

function loginUser(req, res, next) {
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
  })(req, res, next);
}

function renderLogin(req, res) {
  res.render("loginPage", { errors: [] });
}

function userLogout(req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
}

module.exports = {
  renderSignUpForm,
  renderHomePage,
  createNewUser,
  loginUser,
  renderLogin,
  userLogout,
};

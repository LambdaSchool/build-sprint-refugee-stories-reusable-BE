const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const User = require("../models/User");

const router = express.Router();

const protected = require('./protected');

// Returns user data if token is valid
router.post('/', protected, (req, res) => {
  return res.status(200).json(req.headers.user);
})

router.post("/register", async (req, res) => {
  console.log("req recieved");
  if (
    req.body.email &&
    req.body.email.trim() &&
    req.body.firstName &&
    req.body.firstName.trim() &&
    req.body.lastName &&
    req.body.lastName.trim() &&
    req.body.password &&
    req.body.password.trim()
  ) {
    try {
      console.log("begin check");
      const exists = await User.exists({ email: req.body.email });
      console.log(exists);
      if (exists) {
        return res.status(401).json({
          message:
            "The email you've provided is already in use by another account"
        });
      }
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: err });
    }

    const info = {
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 15),
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      country: req.body.country ? req.body.country : ""
    };

    const user = new User({ ...info });

    try {
      const saved = await user.save();

      // Assign a token to the response object
      const response = { ...saved._doc };

      response.token = generateToken(saved);

      delete response.password;
      delete response.__v;

      console.log(response);

      res.status(201).json(response);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: err });
    }
  } else {
    return res.status(400).json({
      message:
        "Please provide a valid email, password, first and last name. Specifying your country is optional."
    });
  }
});

router.post("/login", async (req, res) => {
  console.log(req.body);
  if (
    req.body.email &&
    req.body.email.trim() !== "" &&
    req.body.password &&
    req.body.password.trim() !== ""
  ) {
    let user = await User.find({ email: req.body.email });

    user = user[0];

    if (!user || !user.email) {
      return res.status(404).json({
        message:
          "No user with that email address exists, please check your credentials."
      });
    } else {
      if (bcrypt.compareSync(req.body.password, user.password)) {
        const response = { ...user._doc };

        // Add a token property to the response object
        response.token = generateToken(user);

        delete response.password;

        delete response.__v;

        return res.status(200).json(response);
      } else {
        return res
          .status(401)
          .json({ message: "Incorrect password. Try again." });
      }
    }
  } else {
    return res
      .status(400)
      .json({ message: "Please provide an email and a password to log in." });
  }
});

const generateToken = user => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email
    },
    process.env.JWT_SECRET
  );
};

module.exports = router;

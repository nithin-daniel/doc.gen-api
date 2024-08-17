require("dotenv").config();
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const { Users } = require("../models/users");
const jwt = require("jsonwebtoken");

/**
 * @route   POST /auth/register
 * @desc    Register a new user
 * @access  Public
 * @return  message
 * @error   400, { error }
 * @status  200, 400
 *
 * @example /auth/register
 **/

router.post("/register", async (req, res) => {
  try {
    let { full_name, email, phone_number, password, designation } = req.body;
    let user = await Users.findOne({ email: email });

    if (password.length < 8) {
      return res.status(400).json({
        status: 400,
        message: "Password should be atleast 8 characters long",
      });
    } else if (password.search(/[a-z]/i) < 0) {
      return res.status(400).json({
        status: 400,
        message: "Password should contain atleast one letter",
      });
    } else if (password.search(/[0-9]/) < 0) {
      return res.status(400).json({
        status: 400,
        message: "Password should contain atleast one digit",
      });
    }

    if (user) {
      return res.status(400).json({
        status: 400,
        message: "This email is already registered",
      });
    } else {
      const salt = await bcrypt.genSalt(10);
      const salt_password = await bcrypt.hash(password, salt);

      const newUser = new Users({
        full_name: full_name,
        email: email,
        phone_number: phone_number,
        password: salt_password,
        designation: designation,
      });

      await newUser.save();
      return res.status(200).json({
        status: 200,
        message: "User created successfully",
      });
    }
  } catch (err) {
    console.error("Error creating user:", err);
    return res.status(400).json({
      status: 400,
      message: "Error creating user",
      error: err,
    });
  }
});

/**
 * @route   POST /auth/login
 * @desc    Login a user
 * @access  Public
 * @return  message
 * @error   400, { error }
 * @status  200, 401, 500
 *
 * @example /auth/login
 **/

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await Users.findOne({ email: email });
    if (!user) {
      return res.status(401).json({
        status: 401,
        error: "User not found",
      });
    }

    // Check if password is correct
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        status: 401,
        error: "Invalid password",
      });
    }

    // Check if user account is active
    if (user.status === "inactive") {
      return res.status(401).json({
        status: 401,
        error: "The user account is inactive. Please contact the administrator",
      });
    }

    // Create and assign a token to the user
    const token = jwt.sign({ email: email }, process.env.TOKEN_SECRET, {
      expiresIn: "24h",
    });

    // Set cookie
    // res.cookie('authcookie', token, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
    // res.header('auth-token', token).send(token);
    res.status(200).json({
      status: 200,
      message: "User logged in successfully",
      token: token,
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: "Error logging in user",
      error: error.message,
    });
  }
});

// /**
//  * @route   POST /auth/forgot-password
//  * @desc    Login a user
//  * @access  Public
//  * @return  message
//  * @error   400, { error }
//  * @status  200, 401, 500
//  *
//  * @example /auth/login
//  **/

// router.post("/forgot-password", async (req, res) => {
//   try {
//     const { email } = req.body;

//     // Check if user exists
//     const user = await User.findOne({ email: email });
//     if (!user) {
//       return res.status(401).json({
//         status: 401,
//         error: "User not found",
//       });
//     }
//     const userId = user._id;
//     async function mailSend(options) {
//       const mailOptions = {
//         from: process.env.SMPT_MAIL,
//         to: email,
//         subject: "You SheCare Password Reset Link ",
//         html: `<p>https://aura.badhusha.me/resetpassword?token=${userId}</p>`,
//       };

//       const transporter = nodeMailer.createTransport({
//         debug: true,
//         // host: process.env.SMPT_HOST,
//         // port: process.env.SMPT_PORT,
//         service: "gmail",
//         secure: true, // Use SSL
//         auth: {
//           user: process.env.SMPT_MAIL,
//           pass: process.env.SMPT_APP_PASS,
//         },
//         // tls: {
//         //     rejectUnauthorized: false
//         // },
//         // connectionTimeout: 30000, // 30 seconds
//         // greetingTimeout: 30000,   // 30 seconds
//         // socketTimeout: 30000      // 30 seconds
//       });
//       await transporter.sendMail(mailOptions);
//     }
//     mailSend();
//     res.status(200).json({
//       status: 200,
//       message: "Reset link sended successfully",
//     });
//   } catch (error) {
//     res.status(500).json({
//       status: 500,
//       message: "Error logging in user",
//       error: error.message,
//     });
//   }
// });

module.exports = router;

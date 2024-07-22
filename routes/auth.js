require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const User = require('../models/users');
const jwt = require('jsonwebtoken');



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


router.post('/register', async (req, res) => {
    try {

        let { full_name, email, phone_number, password, designation } = req.body;
        let user = await User.findOne({ email: email });


        if (password.length < 8) {
            return res.status(400).json({
                status: 400,
                message: 'Password should be atleast 8 characters long'
            })
        } else if (password.search(/[a-z]/i) < 0) {
            return res.status(400).json({
                status: 400,
                message: 'Password should contain atleast one letter'
            })
        } else if (password.search(/[0-9]/) < 0) {
            return res.status(400).json({
                status: 400,
                message: 'Password should contain atleast one digit'
            })
        }


        if (user) {
            return res.status(400).json({
                status: 400,
                message: 'This email is already registered'
            })
        } else {

            const salt = await bcrypt.genSalt(10)
            const salt_password = await bcrypt.hash(password, salt)

            const newUser = new User({
                full_name: full_name,
                email: email,
                phone_number: phone_number,
                password: salt_password,
                designation:designation
            })

            await newUser.save()
            return res.status(200).json({
                status: 200,
                message: 'User created successfully'
            })

        }
    } catch (err) {
        return res.status(400).json({
            status: 400,
            message: 'Error creating user',
            error: err
        })
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

router.post('/login', async (req, res) => {
    try {

        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(401).json({
                status: 401,
                error: 'User not found'
            });
        }

        // Check if password is correct
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({
                status: 401,
                error: 'Invalid password'
            });
        }

        // Check if user account is active
        if (user.status === 'inactive') {
            return res.status(401).json({
                status: 401,
                error: 'The user account is inactive. Please contact the administrator'
            });
        }


        // Create and assign a token to the user
        const token = jwt.sign({ email: email }, process.env.TOKEN_SECRET, {
            expiresIn: '24h'
        });


        // Set cookie
        // res.cookie('authcookie', token, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
        // res.header('auth-token', token).send(token);
        res.status(200).json({
            status: 200,
            message: 'User logged in successfully',
            token: token
        });

    } catch (error) {
        res.status(500).json({
            status: 500,
            message: 'Error logging in user',
            error: error.message
        });
    }
})



module.exports = router;
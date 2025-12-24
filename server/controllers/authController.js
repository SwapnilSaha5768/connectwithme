const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateToken = require('../config/generateToken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// @desc    Register new user & Send OTP
// @route   POST /api/user/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, pic } = req.body;

    if (!name || !email || !password) {
        res.status(400);
        throw new Error('Please Enter all the Feilds');
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    const user = await User.create({
        name,
        email,
        password,
        pic,
        otp,
        otpExpires,
    });

    if (user) {
        // Send Verification OTP
        const message = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #4F46E5;">ConnecT Verification</h1>
                <p>Your OTP for email verification is:</p>
                <h2 style="background-color: #F3F4F6; padding: 10px; text-align: center; border-radius: 5px; letter-spacing: 5px;">${otp}</h2>
                <p>This OTP is valid for 10 minutes. Do not share this code with anyone.</p>
            </div>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'ConnecT - Email Verification OTP',
                html: message,
            });

            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                pic: user.pic,
                // Do not send token yet, wait for verification
                message: 'OTP sent to email',
            });
        } catch (error) {
            // Delete user if email fails so they can try again
            await User.findByIdAndDelete(user._id);
            res.status(500);
            throw new Error('Email could not be sent. Please try again.');
        }
    } else {
        res.status(400);
        throw new Error('Failed to Create the User');
    }
});

// @desc    Verify OTP
// @route   POST /api/user/verify-otp
// @access  Public
const verifyOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        res.status(400);
        throw new Error('User not found');
    }

    if (user.isVerified) {
        const token = generateToken(user._id);
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            pic: user.pic,
            message: "User already verified"
        });
        return;
    }

    if (user.otp === otp && user.otpExpires > Date.now()) {
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        const token = generateToken(user._id);
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            pic: user.pic,
            message: "Email verified successfully"
        });
    } else {
        res.status(400);
        throw new Error('Invalid or Expired OTP');
    }
});

// @desc    Authenticate User & get token
// @route   POST /api/user/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        if (!user.isVerified) {
            // Generate new OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

            user.otp = otp;
            user.otpExpires = otpExpires;
            await user.save();

            const message = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #4F46E5;">ConnecT Verification</h1>
                    <p>Your OTP for email verification is:</p>
                    <h2 style="background-color: #F3F4F6; padding: 10px; text-align: center; border-radius: 5px; letter-spacing: 5px;">${otp}</h2>
                    <p>This OTP is valid for 10 minutes. Do not share this code with anyone.</p>
                </div>
            `;

            try {
                await sendEmail({
                    email: user.email,
                    subject: 'ConnecT - Email Verification OTP',
                    html: message,
                });

                res.status(403).json({
                    message: "Account not verified. A new OTP has been sent to your email.",
                    isVerified: false,
                    email: user.email
                });
                return;
            } catch (error) {
                // We don't delete the user here as they already exist, just fail the login/send
                res.status(500);
                throw new Error('Email could not be sent. Please try again.');
            }
        }

        const token = generateToken(user._id);
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            pic: user.pic,
        });
    } else {
        console.log(`Login failed for email: ${email}. User found: ${!!user}, Password matched: ${user ? 'No (or not checked)' : 'N/A'}`);
        res.status(401);
        throw new Error('Invalid Email or Password');
    }
});

// @desc    Get or Search all users
// @route   GET /api/user?search=phani
// @access  Public
const allUsers = asyncHandler(async (req, res) => {
    const keyword = req.query.search
        ? {
            $or: [
                { name: { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } },
            ],
        }
        : {};

    const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
    res.send(users);
});

// @desc    Update User Profile
// @route   PUT /api/user/profile
// @access  Protected
const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.pic = req.body.pic || user.pic;

        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        const token = generateToken(updatedUser._id);
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            pic: updatedUser.pic,
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Forgot Password Request
// @route   POST /api/user/forgotpassword
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save({ validateBeforeSave: false });

    const message = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">Password Reset OTP</h1>
            <p>Your OTP for password reset is:</p>
            <h2 style="background-color: #F3F4F6; padding: 10px; text-align: center; border-radius: 5px; letter-spacing: 5px;">${otp}</h2>
            <p>This OTP is valid for 10 minutes. Do not share this code with anyone.</p>
        </div>
    `;

    try {
        await sendEmail({
            email: user.email,
            subject: 'ConnecT - Password Reset OTP',
            html: message,
            text: `Your OTP is ${otp}`
        });

        res.status(200).json({ success: true, message: 'OTP sent to email' });
    } catch (error) {
        console.error("Forgot Password Email Error:", error);
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save({ validateBeforeSave: false });

        res.status(500);
        throw new Error('Email could not be sent');
    }
});

// @desc    Reset Password
// @route   PUT /api/user/resetpassword
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    if (user.otp === otp && user.otpExpires > Date.now()) {
        user.password = password;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        const token = generateToken(user._id);
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            pic: user.pic,
        });
    } else {
        res.status(400);
        throw new Error('Invalid or Expired OTP');
    }
});

// @desc    Logout user / clear cookie
// @route   POST /api/user/logout
// @access  Public
const logoutUser = asyncHandler(async (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0),
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    });
    res.status(200).json({ message: 'Logged out successfully' });
});

// @desc    Get current user
// @route   GET /api/user/me
// @access  Protected
const getMe = asyncHandler(async (req, res) => {
    if (req.user) {
        res.status(200).json({
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            pic: req.user.pic,
        });
    } else {
        res.status(200).json(null);
    }
});

module.exports = { registerUser, loginUser, allUsers, verifyOTP, updateUserProfile, forgotPassword, resetPassword, logoutUser, getMe };

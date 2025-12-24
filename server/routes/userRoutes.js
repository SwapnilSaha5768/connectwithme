const express = require('express');
const {
    registerUser,
    loginUser,
    allUsers,
    verifyOTP,
    updateUserProfile,
    forgotPassword,
    resetPassword,
    logoutUser,
    getMe
} = require('../controllers/authController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').get(protect, allUsers);
router.route('/profile').put(protect, updateUserProfile);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-otp', verifyOTP);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword', resetPassword);
router.post('/logout', logoutUser);
router.get('/me', optionalProtect, getMe);

module.exports = router;

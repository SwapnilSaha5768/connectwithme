const asyncHandler = require('express-async-handler');
const Chat = require('../models/Chat');
const User = require('../models/User');

// ... (Existing accessChat, fetchChats, createGroupChat)
// I will need to use MultiReplace to add these to the existing file or just append/rewrite.
// Since I have the content of the previous file, I will just rewrite the whole file with new functions added to be safe and clean.

const accessChat = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        console.log('UserId param not sent with request');
        return res.sendStatus(400);
    }

    var isChat = await Chat.find({
        isGroupChat: false,
        $and: [
            { users: { $elemMatch: { $eq: req.user._id } } },
            { users: { $elemMatch: { $eq: userId } } },
        ],
    })
        .populate('users', '-password')
        .populate('latestMessage');

    isChat = await User.populate(isChat, {
        path: 'latestMessage.sender',
        select: 'name pic email',
    });

    if (isChat.length > 0) {
        res.send(isChat[0]);
    } else {
        var chatData = {
            chatName: 'sender',
            isGroupChat: false,
            users: [req.user._id, userId],
        };

        try {
            const createdChat = await Chat.create(chatData);
            const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
                'users',
                '-password'
            );
            res.status(200).send(FullChat);
        } catch (error) {
            res.status(400);
            throw new Error(error.message);
        }
    }
});

const fetchChats = asyncHandler(async (req, res) => {
    try {
        let results = await Chat.find({
            users: { $in: [req.user._id] },
            hiddenFor: { $ne: req.user._id }
        })
            .populate('users', '-password')
            .populate('groupAdmin', '-password')
            .populate('latestMessage')
            .sort({ updatedAt: -1 });

        results = await User.populate(results, {
            path: 'latestMessage.sender',
            select: 'name pic email',
        });

        res.status(200).send(results);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

const createGroupChat = asyncHandler(async (req, res) => {
    if (!req.body.users || !req.body.name) {
        return res.status(400).send({ message: 'Please Fill all the feilds' });
    }

    var users = JSON.parse(req.body.users);

    if (users.length < 2) {
        return res
            .status(400)
            .send('More than 2 users are required to form a group chat');
    }

    users.push(req.user);

    try {
        const groupChat = await Chat.create({
            chatName: req.body.name,
            users: users,
            isGroupChat: true,
            groupAdmin: req.user,
        });

        const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
            .populate('users', '-password')
            .populate('groupAdmin', '-password');

        res.status(200).json(fullGroupChat);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Rename Group
// @route   PUT /api/chat/rename
// @access  Protected
const renameGroup = asyncHandler(async (req, res) => {
    const { chatId, chatName } = req.body;

    const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
            chatName,
        },
        {
            new: true,
        }
    )
        .populate('users', '-password')
        .populate('groupAdmin', '-password');

    if (!updatedChat) {
        res.status(404);
        throw new Error('Chat Not Found');
    } else {
        res.json(updatedChat);
    }
});

// @desc    Add user to Group
// @route   PUT /api/chat/groupadd
// @access  Protected
const addToGroup = asyncHandler(async (req, res) => {
    const { chatId, userId } = req.body;

    const added = await Chat.findByIdAndUpdate(
        chatId,
        {
            $push: { users: userId },
        },
        {
            new: true,
        }
    )
        .populate('users', '-password')
        .populate('groupAdmin', '-password');

    if (!added) {
        res.status(404);
        throw new Error('Chat Not Found');
    } else {
        res.json(added);
    }
});

// @desc    Remove user from Group
// @route   PUT /api/chat/groupremove
// @access  Protected
const removeFromGroup = asyncHandler(async (req, res) => {
    const { chatId, userId } = req.body;

    const removed = await Chat.findByIdAndUpdate(
        chatId,
        {
            $pull: { users: userId },
        },
        {
            new: true,
        }
    )
        .populate('users', '-password')
        .populate('groupAdmin', '-password');

    if (!removed) {
        res.status(404);
        throw new Error('Chat Not Found');
    } else {
        res.json(removed);
    }
});

// @desc    Delete Chat (For Me or Everyone)
// @route   DELETE /api/chat/:chatId
// @access  Protected
const deleteChat = asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    const { type } = req.query; // 'me' or 'everyone'

    if (type === 'everyone') {
        const chat = await Chat.findById(chatId);
        if (!chat) {
            res.status(404);
            throw new Error('Chat Not Found');
        }

        // Delete all messages in the chat
        const Message = require('../models/Message');
        await Message.deleteMany({ chat: chatId });

        // Delete the chat
        await Chat.findByIdAndDelete(chatId);

        res.json({ message: 'Chat deleted for everyone' });
    } else {
        // Delete for me (Hide it)
        const chat = await Chat.findByIdAndUpdate(
            chatId,
            {
                $addToSet: { hiddenFor: req.user._id }
            },
            { new: true }
        );
        if (!chat) {
            res.status(404);
            throw new Error('Chat Not Found');
        }
        res.json({ message: 'Chat hidden for you' });
    }
});

module.exports = {
    accessChat,
    fetchChats,
    createGroupChat,
    renameGroup,
    addToGroup,
    removeFromGroup,
    deleteChat,
    getIceServers
};

// @desc    Get ICE Servers (Metered.ca or Free Fallback)
// @route   GET /api/chat/ice-servers
// @access  Protected
const getIceServers = asyncHandler(async (req, res) => {
    try {
        // 1. Try Metered.ca if configured in SERVER .env
        if (process.env.METERED_API_KEY && process.env.METERED_DOMAIN) {
            const axios = require('axios');
            const response = await axios.get(`https://${process.env.METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${process.env.METERED_API_KEY}`);
            return res.json(response.data);
        }
    } catch (error) {
        console.error("Metered Fetch Error:", error.message);
        // Fallthrough to free servers
    }

    // 2. Fallback: Free Public STUN + OpenRelay
    const freeServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ];

    res.json(freeServers);
});

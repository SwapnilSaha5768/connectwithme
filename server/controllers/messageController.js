const asyncHandler = require('express-async-handler');
const Message = require('../models/Message');
const User = require('../models/User');
const Chat = require('../models/Chat');


const allMessages = asyncHandler(async (req, res) => {
    try {
        // First check if user is part of the chat
        const chat = await Chat.findOne({
            _id: req.params.chatId,
            users: { $elemMatch: { $eq: req.user._id } }
        });

        if (!chat) {
            res.status(403);
            throw new Error("Chat not found or access denied");
        }

        const messages = await Message.find({
            chat: req.params.chatId,
            deletedBy: { $ne: req.user._id }
        })
            .populate('sender', 'name pic email')
            .populate('chat')
            .populate('reactions.user', 'name pic email');
        res.json(messages);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Create New Message
// @route   POST /api/message
// @access  Protected
const sendMessage = asyncHandler(async (req, res) => {
    const { content, chatId, type } = req.body;

    if (!content || !chatId) {
        console.log('Invalid data passed into request');
        return res.sendStatus(400);
    }

    var newMessage = {
        sender: req.user._id,
        content: content,
        chat: chatId,
        type: type || 'text',
    };

    try {
        // Check for blocked users
        const chat = await Chat.findById(chatId).populate("users", "blockedUsers");
        if (chat && !chat.isGroupChat) {
            const otherUser = chat.users.find(u => u._id.toString() !== req.user._id.toString());
            if (otherUser) {
                // Check if I blocked them
                const me = await User.findById(req.user._id);
                if (me.blockedUsers.includes(otherUser._id)) {
                    res.status(403);
                    throw new Error("You have blocked this user");
                }
                // Check if they blocked me
                // Note: user.blockedUsers contains IDs of users they blocked
                if (otherUser.blockedUsers.includes(req.user._id)) {
                    res.status(403);
                    throw new Error("You have been blocked by this user");
                }
            }
        }

        var message = await Message.create(newMessage);

        message = await message.populate('sender', 'name pic');
        message = await message.populate('chat');
        message = await User.populate(message, {
            path: 'chat.users',
            select: 'name pic email',
        });
        message = await User.populate(message, {
            path: 'reactions.user',
            select: 'name pic email',
        });

        await Chat.findByIdAndUpdate(req.body.chatId, {
            latestMessage: message,
            hiddenFor: []
        });

        res.json(message);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Delete Message
// @route   DELETE /api/message/:id
// @access  Protected
const deleteMessage = asyncHandler(async (req, res) => {
    const { type } = req.body; // 'everyone' or 'me'
    const messageId = req.params.id;
    const userId = req.user._id;

    try {
        const message = await Message.findById(messageId);

        if (!message) {
            res.status(404);
            throw new Error("Message not found");
        }

        if (type === 'everyone') {
            // Check if user is sender
            if (message.sender.toString() !== userId.toString()) {
                res.status(401);
                throw new Error("You can only unsend your own messages");
            }
            await Message.findByIdAndDelete(messageId);
            res.json({ message: "Message unsent", id: messageId, chat: message.chat });
        } else if (type === 'me') {
            await Message.findByIdAndUpdate(
                messageId,
                { $addToSet: { deletedBy: userId } }
            );
            res.json({ message: "Message deleted for you", id: messageId });
        } else {
            res.status(400);
            throw new Error("Invalid delete type");
        }
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Clear all messages in a chat
// @route   DELETE /api/message/clear/:chatId
// @access  Protected
const clearChatMessages = asyncHandler(async (req, res) => {
    try {
        await Message.deleteMany({ chat: req.params.chatId });
        await Chat.findByIdAndUpdate(req.params.chatId, { latestMessage: null });
        res.json({ message: "Chat cleared successfully", chatId: req.params.chatId });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});


// @desc    Mark messages as read
// @route   PUT /api/message/read
// @access  Protected
const readMessage = asyncHandler(async (req, res) => {
    const { chatId } = req.body;

    if (!chatId) {
        return res.sendStatus(400);
    }

    try {
        const updatedMessages = await Message.updateMany(
            { chat: chatId, readBy: { $ne: req.user._id } },
            { $addToSet: { readBy: req.user._id } }
        );

        res.json(updatedMessages);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Mark chat as unread
// @route   PUT /api/message/unread
// @access  Protected
const markUnread = asyncHandler(async (req, res) => {
    const { chatId } = req.body;

    const chat = await Chat.findById(chatId).populate("latestMessage");

    if (chat && chat.latestMessage) {
        await Message.findByIdAndUpdate(
            chat.latestMessage._id,
            {
                $pull: { readBy: req.user._id }
            },
            {
                new: true,
            }
        );
        res.status(200).send("Marked as unread");
    } else {
        res.status(404);
        throw new Error("Chat or Message not found");
    }
});

// @desc    React to a message
// @route   PUT /api/message/react
// @access  Protected
const reactToMessage = asyncHandler(async (req, res) => {
    const { messageId, emoji } = req.body;

    if (!messageId || !emoji) {
        res.status(400);
        throw new Error("Message ID and Emoji are required");
    }

    try {
        const message = await Message.findById(messageId);

        if (!message) {
            res.status(404);
            throw new Error("Message not found");
        }

        const existingReaction = message.reactions.find(
            (r) => r.user.toString() === req.user._id.toString()
        );

        if (existingReaction) {
            if (existingReaction.emoji === emoji) {
                // Toggle off (remove reaction)
                message.reactions = message.reactions.filter(
                    (r) => r.user.toString() !== req.user._id.toString()
                );
            } else {
                // Update reaction
                existingReaction.emoji = emoji;
            }
        } else {
            // Add new reaction
            message.reactions.push({ user: req.user._id, emoji });
        }

        await message.save();

        const updatedMessage = await Message.findById(messageId)
            .populate("sender", "name pic email")
            .populate("chat")
            .populate("reactions.user", "name pic email");

        res.json(updatedMessage);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

module.exports = { allMessages, sendMessage, deleteMessage, clearChatMessages, readMessage, markUnread, reactToMessage };

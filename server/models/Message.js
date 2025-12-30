const mongoose = require('mongoose');

const messageSchema = mongoose.Schema(
    {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        content: { type: String, trim: true },
        chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
        readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        type: {
            type: String,
            enum: ['text', 'image', 'video', 'file', 'location', 'audio'],
            default: 'text'
        },
        deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        reactions: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                emoji: { type: String, required: true }
            }
        ],
    },
    {
        timestamps: true,
    }
);

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;

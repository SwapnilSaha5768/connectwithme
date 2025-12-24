import React, { useRef, useEffect } from 'react';
import { ChatState } from '../../Context/ChatConfig';
import { MoreVertical, Trash2, XCircle } from 'lucide-react';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import axios from 'axios';

const ScrollableChat = ({ messages, setMessages }) => {
    const { user, socket } = ChatState();

    const deleteMessage = async (messageId, type) => {
        try {
            const config = { data: { type } };
            const { data } = await axios.delete(`/api/message/${messageId}`, config);

            // Remove from local view
            setMessages(messages.filter((m) => m._id !== messageId));

            // If unsent for everyone, notify others
            if (type === 'everyone') {
                socket.emit('delete message', {
                    id: messageId,
                    chat: data.chat,
                    sender: user._id
                });
            }
        } catch (error) {
            alert("Failed to delete message");
        }
    };

    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const isSameSender = (messages, m, i, userId) => {
        return (
            i < messages.length - 1 &&
            (messages[i + 1].sender._id !== m.sender._id ||
                messages[i + 1].sender._id === undefined) &&
            messages[i].sender._id !== userId
        );
    };

    const isLastMessage = (messages, i, userId) => {
        return (
            i === messages.length - 1 &&
            messages[messages.length - 1].sender._id !== userId &&
            messages[messages.length - 1].sender._id
        );
    };

    const isSameSenderMargin = (messages, m, i, userId) => {
        if (
            i < messages.length - 1 &&
            messages[i + 1].sender._id === m.sender._id &&
            messages[i].sender._id !== userId
        )
            return 36;
        else if (
            (i < messages.length - 1 &&
                messages[i + 1].sender._id !== m.sender._id &&
                messages[i].sender._id !== userId) ||
            (i === messages.length - 1 && messages[i].sender._id !== userId)
        )
            return 0;
        else return "auto";
    };

    return (
        <div className='flex flex-col'>
            {messages && messages.map((m, i) => (
                <div
                    className={`flex ${(i === messages.length - 1 || messages[i + 1].sender._id !== m.sender._id) ? 'mb-4' : 'mb-1'}`}
                    key={m._id}
                >
                    {(isSameSender(messages, m, i, user._id) || isLastMessage(messages, i, user._id)) && (
                        <div className="tooltip" title={m.sender.name}>
                            <img
                                className='h-8 w-8 rounded-full cursor-pointer mr-1 mt-3 border border-white/20'
                                alt={m.sender.name}
                                src={m.sender.pic}
                            />
                        </div>
                    )}
                    <div
                        className={`relative group flex items-center gap-2 max-w-[75%] ${m.sender._id === user._id ? "flex-row-reverse" : "flex-row"}`}
                        style={{
                            marginLeft: isSameSenderMargin(messages, m, i, user._id),
                        }}
                    >
                        {/* Message Bubble */}
                        <span
                            className={`${m.type === 'image'
                                ? "rounded-lg overflow-hidden my-1 relative z-10"
                                : `rounded-2xl px-4 py-2 my-1 text-sm md:text-base shadow-md backdrop-blur-sm relative z-10 break-words whitespace-pre-wrap ${m.sender._id === user._id
                                    ? "bg-gradient-to-r from-neon-blue to-indigo-600 text-white rounded-br-none"
                                    : "bg-white/10 text-white border border-white/10 rounded-bl-none"
                                }`
                                }`}
                        >
                            {m.type === 'location' ? (
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${m.content}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 underline !text-white hover:text-gray-200"
                                >
                                    <i className="fas fa-map-marked-alt"></i> Shared Location
                                </a>
                            ) : m.type === 'audio' ? (
                                <audio controls src={m.content} className="max-w-[200px] h-8" />
                            ) : m.type === 'image' ? (
                                <img
                                    src={m.content}
                                    className="max-w-[250px] max-h-[300px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(m.content, "_blank", "noopener,noreferrer")}
                                />
                            ) : (
                                m.content
                            )}
                        </span>

                        {/* Menu Options (Hidden by default, shown on hover) */}
                        <Menu as="div" className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                            <MenuButton className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10">
                                <MoreVertical size={16} />
                            </MenuButton>
                            <MenuItems className="absolute bottom-0 z-50 mt-2 w-32 origin-top-right rounded-md bg-[#1a1a1a] border border-white/10 shadow-lg focus:outline-none">
                                <div className="py-1">
                                    <MenuItem>
                                        {({ active }) => (
                                            <button
                                                onClick={() => deleteMessage(m._id, 'me')}
                                                className={`${active ? 'bg-white/10' : ''} group flex w-full items-center px-4 py-2 text-sm text-gray-300`}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </button>
                                        )}
                                    </MenuItem>
                                    {m.sender._id === user._id && (
                                        <MenuItem>
                                            {({ active }) => (
                                                <button
                                                    onClick={() => deleteMessage(m._id, 'everyone')}
                                                    className={`${active ? 'bg-white/10' : ''} group flex w-full items-center px-4 py-2 text-sm text-red-400`}
                                                >
                                                    <XCircle className="mr-2 h-4 w-4" /> Unsend
                                                </button>
                                            )}
                                        </MenuItem>
                                    )}
                                </div>
                            </MenuItems>
                        </Menu>
                    </div>
                </div>
            ))}
            <div ref={bottomRef} />
        </div>
    );
};

export default ScrollableChat;

import React, { useRef, useEffect, Fragment, useState } from 'react';
import { ChatState } from '../../Context/ChatConfig';
import { MoreVertical, Trash2, XCircle, MapPin, Smile } from 'lucide-react';
import { Menu, MenuButton, MenuItems, MenuItem, Transition } from '@headlessui/react';
import axios from 'axios';

const ScrollableChat = ({ messages, setMessages }) => {
    const { user, socket, selectedChat } = ChatState();

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

    const handleReaction = async (messageId, emoji) => {
        try {
            const { data } = await axios.put('/api/message/react', { messageId, emoji });

            // Update local state immediately
            setMessages(messages.map(m => m._id === messageId ? data : m));

            // Notify others
            socket.emit('new message', data); // Re-using new message for simplicity to trigger updates
        } catch (error) {
            console.error("Failed to react", error);
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

    const isSameUser = (messages, m, i) => {
        return i < messages.length - 1 && (
            messages[i + 1].sender._id === m.sender._id ||
            messages[i + 1].sender._id === undefined
        );
    };

    const [selectedReaction, setSelectedReaction] = useState(null);

    return (
        <div className='flex flex-col'>
            {messages && messages.map((m, i) => {
                const seenUsers = m.readBy ? m.readBy.filter(uId =>
                    uId !== user._id &&
                    uId !== m.sender._id &&
                    messages.map(msg => msg.readBy.includes(uId) ? msg._id : null).filter(Boolean).pop() === m._id
                ) : [];

                return (
                    <div
                        className={`flex flex-col ${(i === messages.length - 1 || messages[i + 1].sender._id !== m.sender._id) ? 'mb-4' : 'mb-1'}`}
                        key={m._id}
                    >
                        <div className='flex'>
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
                                {/* Message Bubble Container */}
                                <div className='relative'>
                                    <span
                                        className={`${m.type === 'image'
                                            ? "rounded-lg overflow-hidden my-1 relative z-10 block"
                                            : `rounded-2xl px-4 py-2 my-1 text-sm md:text-base shadow-md backdrop-blur-sm relative z-10 break-words whitespace-pre-wrap block ${m.sender._id === user._id
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
                                                className="flex items-center gap-2 hover:underline text-white font-medium transition-all"
                                            >
                                                <MapPin size={18} className="text-white" />
                                                Shared Location
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
                                            (() => {
                                                const urlRegex = /(https?:\/\/[^\s]+)/g;
                                                const parts = m.content.split(urlRegex);
                                                return parts.map((part, index) => {
                                                    if (part.match(urlRegex)) {
                                                        return (
                                                            <a
                                                                key={index}
                                                                href={part}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-white underline break-all"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {part}
                                                            </a>
                                                        );
                                                    }
                                                    return part;
                                                });
                                            })()
                                        )}
                                    </span>

                                    {/* Reactions Display */}
                                    {m.reactions && m.reactions.length > 0 && (
                                        <div className={`absolute -bottom-3 ${m.sender._id === user._id ? '-left-2' : '-right-2'} z-20 flex gap-1 items-center bg-gray-800/90 rounded-full px-1.5 py-0.5 border border-white/10 shadow-lg scale-90`}>
                                            {(() => {
                                                const grouped = m.reactions.reduce((acc, curr) => {
                                                    const emoji = curr.emoji;
                                                    if (!acc[emoji]) acc[emoji] = [];
                                                    acc[emoji].push(curr.user);
                                                    return acc;
                                                }, {});

                                                const entries = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
                                                const topEmoji = entries[0][0];
                                                const otherCount = entries.length - 1;

                                                // Show simplified view: Top Emoji [+count if more types]
                                                return (
                                                    <button
                                                        onClick={() => setSelectedReaction(m.reactions)}
                                                        className="hover:bg-white/20 rounded-full transition-colors flex items-center gap-1 text-xs text-white cursor-pointer px-1"
                                                    >
                                                        <span>{topEmoji}</span>
                                                        {otherCount > 0 && (
                                                            <span className="text-[10px] font-bold text-neon-blue">+{otherCount}</span>
                                                        )}
                                                        {/* If only 1 type but multiple people, show count? User request was "one and add + if multiple different". 
                                                            Usually "❤️ 2" is good. "❤️ +1" usually means +1 other TYPE or +1 other person?
                                                            User said "different reaction takes too many space.. just show one and add + if multiple different reaction".
                                                            Interpretation: Collapse TYPES. 
                                                            If I have 5 hearts: Show "❤️ 5" ? Or just "❤️"? 
                                                            Let's show total count of that top reaction if > 1, OR simple dot.
                                                            Let's stick to: TopEmoji [TotalCount if > 1] or [+OtherTypes].
                                                            Let's specific: TopEmoji + (m.reactions.length if > 1) ?
                                                            Let's try: ❤️ (if 1 person), ❤️ 2 (if 2 people same), ❤️ +1 (if ❤️ and 👍).
                                                            Actually, simplified standard way:
                                                            Show top 3... user wanted "just show one".
                                                            Okay. Show TopEmoji. If entries.length > 1, show + (entries.length - 1).
                                                         */}
                                                        {(entries[0][1].length > 1 || entries.length > 1) && (
                                                            <span className="text-[10px] class font-bold ml-0.5">{m.reactions.length}</span>
                                                        )}
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>

                                {/* Menu Options */}
                                <Menu as="div" className="relative opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <MenuButton className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                                        <Smile size={16} />
                                    </MenuButton>
                                    <MenuItems
                                        transition
                                        anchor={m.sender._id === user._id ? "top end" : "top start"}
                                        className="z-50 w-auto origin-bottom-right rounded-full bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl focus:outline-none p-1 ring-1 ring-black/5 transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 flex gap-1"
                                    >
                                        {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => (
                                            <MenuItem key={emoji}>
                                                <button
                                                    onClick={() => handleReaction(m._id, emoji)}
                                                    className="p-2 hover:bg-white/20 rounded-full transition-colors text-lg"
                                                >
                                                    {emoji}
                                                </button>
                                            </MenuItem>
                                        ))}
                                    </MenuItems>

                                </Menu>

                                {/* Separate Delete Menu */}
                                <Menu as="div" className="relative opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <MenuButton className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                                        <MoreVertical size={16} />
                                    </MenuButton>
                                    <MenuItems
                                        transition
                                        anchor="top end"
                                        className="z-50 w-36 origin-bottom-right rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl focus:outline-none p-1 ring-1 ring-black/5 transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
                                    >
                                        <div className="px-1 py-1 ">
                                            <MenuItem>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() => deleteMessage(m._id, 'me')}
                                                        className={`${active ? 'bg-white/10 text-white' : 'text-gray-300'
                                                            } group flex w-full items-center rounded-lg px-2 py-2 text-sm transition-all duration-200`}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4 text-gray-400 group-hover:text-red-400 transition-colors" />
                                                        Delete
                                                    </button>
                                                )}
                                            </MenuItem>
                                            {m.sender._id === user._id && (
                                                <MenuItem>
                                                    {({ active }) => (
                                                        <button
                                                            onClick={() => deleteMessage(m._id, 'everyone')}
                                                            className={`${active ? 'bg-red-500/10 text-red-400' : 'text-gray-300'
                                                                } group flex w-full items-center rounded-lg px-2 py-2 text-sm transition-all duration-200 mt-1`}
                                                        >
                                                            <XCircle className="mr-2 h-4 w-4 text-red-400" />
                                                            Unsend
                                                        </button>
                                                    )}
                                                </MenuItem>
                                            )}
                                        </div>
                                    </MenuItems>
                                </Menu>
                            </div>
                        </div>
                        {/* Seen Indicator */}
                        {seenUsers.length > 0 && m.sender._id === user._id && (
                            <div className={`flex justify-end items-center gap-1 mr-2 ${m.reactions && m.reactions.length > 0 ? "mt-5" : "mt-1"}`}>
                                {seenUsers.map(userId => {
                                    const userObj = socket && ChatState().selectedChat.users.find(u => u._id === userId);
                                    return userObj ? (
                                        <img key={userId} src={userObj.pic} alt={userObj.name} title={`Seen by ${userObj.name}`} className="w-4 h-4 rounded-full border border-white/20" />
                                    ) : null;
                                })}
                            </div>
                        )}
                    </div>
                )
            })}
            <div ref={bottomRef} />

            {/* Reaction Details Modal */}
            <Transition show={!!selectedReaction} as={Fragment}>
                <div className="relative z-[9999]">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedReaction(null)} />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <div className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-gray-900 border border-white/10 p-6 text-left align-middle shadow-xl transition-all">
                                    <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
                                        <h3 className="text-lg font-medium leading-6 text-white">Reactions</h3>
                                    </div>

                                    <div className="mt-2 max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                                        {selectedReaction && (() => {
                                            // Group reactions for the modal view
                                            const grouped = selectedReaction.reduce((acc, curr) => {
                                                const emoji = curr.emoji;
                                                if (!acc[emoji]) acc[emoji] = [];
                                                acc[emoji].push(curr.user);
                                                return acc;
                                            }, {});

                                            return Object.entries(grouped).map(([emoji, users]) => (
                                                <div key={emoji} className="flex flex-col gap-2">
                                                    <div className="text-sm font-semibold text-gray-400 border-b border-white/5 pb-1 mb-1 flex items-center gap-2">
                                                        <span className="text-lg">{emoji}</span>
                                                        <span>{users.length}</span>
                                                    </div>
                                                    {users.map((u, i) => (
                                                        <div key={i} className="flex items-center gap-4 py-1 hover:bg-white/5 px-2 rounded-lg transition-colors">
                                                            <img
                                                                src={u?.pic}
                                                                alt={u?.name}
                                                                className="h-8 w-8 rounded-full object-cover border border-white/10"
                                                            />
                                                            <div className="flex flex-col justify-center">
                                                                <span className="text-white text-sm font-medium">{u?.name === user.name ? 'You' : u?.name}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ));
                                        })()}
                                    </div>

                                    <div className="mt-6 flex justify-end">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-lg border border-transparent bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                            onClick={() => setSelectedReaction(null)}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </Transition.Child>
                        </div>
                    </div>
                </div>
            </Transition>
        </div>
    );
};

export default ScrollableChat;

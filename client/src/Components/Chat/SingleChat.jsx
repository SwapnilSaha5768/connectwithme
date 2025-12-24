import React, { useEffect, useState, useRef } from 'react';
import { ChatState } from '../../Context/ChatConfig';
import axios from 'axios';
import io from 'socket.io-client';
import ScrollableChat from './ScrollableChat';
import UpdateGroupChatModal from '../Miscellaneous/UpdateGroupChatModal';
import ProfileModal from '../Miscellaneous/ProfileModal';
import { Plus, MapPin, Mic, X, Image as ImageIcon, Phone, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ENDPOINT = import.meta.env.VITE_SERVER_URL || '/';
var selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain, socket, socketConnected, startCall }) => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [typing, setTyping] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [showAttach, setShowAttach] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [imgLoading, setImgLoading] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // File input ref for image upload
    const fileInputRef = useRef(null);

    // Swipe Gesture Refs
    const touchStart = useRef(null);
    const touchEnd = useRef(null);

    const { user, selectedChat, setSelectedChat, notification, setNotification, activeUsers } = ChatState();

    const requestPermission = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return alert("Your browser does not support Audio Recording.");
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setPermissionGranted(true);
            // Stop tracks immediately as we just wanted permission
            stream.getTracks().forEach(track => track.stop());
        } catch (err) {
            console.error("Mic error:", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                alert("Microphone denied. Please Allow permissions in your browser settings.");
            } else {
                alert(`Error accessing microphone: ${err.message}`);
            }
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'image/jpeg' && file.type !== 'image/png' && file.type !== 'image/jpg') {
            return alert("Please upload a standard image (JPEG/PNG)");
        }

        try {
            setImgLoading(true);
            const formData = new FormData();
            formData.append('image', file);

            // Upload to ImgBB
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (data.success) {
                const imgUrl = data.data.url;

                // Send Message
                const config = { headers: { 'Content-type': 'application/json' } };
                const { data: msgData } = await axios.post('/api/message', {
                    content: imgUrl,
                    chatId: selectedChat._id,
                    type: 'image'
                }, config);

                if (socket) socket.emit('new message', msgData);
                setMessages((prev) => [...prev, msgData]);
                setShowAttach(false);
            } else {
                alert("Image upload failed");
            }
            setImgLoading(false);
        } catch (error) {
            console.error(error);
            alert("Error uploading image");
            setImgLoading(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result;
                    try {
                        const config = { headers: { 'Content-type': 'application/json' } };
                        const { data } = await axios.post('/api/message', {
                            content: base64Audio,
                            chatId: selectedChat._id,
                            type: 'audio'
                        }, config);

                        if (socket) socket.emit('new message', data);
                        setMessages((prev) => [...prev, data]);
                        setShowAttach(false);
                    } catch (error) {
                        alert("Failed to send audio");
                    }
                };
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Mic error:", err);
            alert(`Mic Error: ${err.message}`);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const getSender = (loggedUser, users) => {
        return users[0]._id === loggedUser._id ? users[1].name : users[0].name;
    };

    const getSenderFull = (loggedUser, users) => {
        return users[0]._id === loggedUser._id ? users[1] : users[0];
    };

    // Handle Hardware Back Button
    useEffect(() => {
        if (selectedChat) {
            // Push a state so back button doesn't exit the whole app
            window.history.pushState(null, "", window.location.href);

            const handlePopState = () => {
                setSelectedChat('');
            };

            window.addEventListener('popstate', handlePopState);

            return () => {
                window.removeEventListener('popstate', handlePopState);
            };
        }
    }, [selectedChat]);

    // Swipe Handlers
    const onTouchStart = (e) => {
        touchEnd.current = null;
        touchStart.current = e.targetTouches[0].clientX;
    };

    const onTouchMove = (e) => {
        touchEnd.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
        if (!touchStart.current || !touchEnd.current) return;
        const distance = touchStart.current - touchEnd.current;
        const isLeftEdge = touchStart.current < 50;
        const isRightSwipe = distance < -75;

        if (isLeftEdge && isRightSwipe) {
            setSelectedChat('');
        }
    };

    useEffect(() => {
        if (!socket) return;
        socket.on('typing', () => setIsTyping(true));
        socket.on('stop typing', () => setIsTyping(false));
    }, [socket]);

    const fetchMessages = async () => {
        if (!selectedChat) return;
        try {
            const config = {};
            setLoading(true);
            const { data } = await axios.get(`/api/message/${selectedChat._id}`, config);
            setMessages(data);
            setLoading(false);
            if (socket) socket.emit('join chat', selectedChat._id);
        } catch (error) {
            alert(`Failed to load messages: ${error.message}`);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        selectedChatCompare = selectedChat;
    }, [selectedChat]);

    useEffect(() => {
        if (!socket) return;
        socket.on('message recieved', (newMessageRecieved) => {
            if (!selectedChatCompare || selectedChatCompare._id !== newMessageRecieved.chat._id) {
                // Notification logic handled in ChatPage
            } else {
                setMessages([...messages, newMessageRecieved]);
            }
        });

        socket.on('message deleted', (deletedMessage) => {
            if (
                selectedChatCompare &&
                selectedChatCompare._id === deletedMessage.chat
            ) {
                setMessages(prev => prev.filter(m => m._id !== deletedMessage.id));
            }
        });

        socket.on('chat cleared', (chatId) => {
            if (selectedChatCompare && selectedChatCompare._id === chatId) {
                setMessages([]);
            }
        });

        return () => { // Cleanup listeners to prevent duplicates
            socket.off('message recieved');
            socket.off('message deleted');
            socket.off('chat cleared');
        };
    }, [socket, messages]);

    const sendMessage = async (event) => {
        if (event.key === 'Enter' && newMessage) {
            if (socket) socket.emit('stop typing', selectedChat._id);
            try {
                const config = { headers: { 'Content-type': 'application/json' } };
                setNewMessage("");
                const { data } = await axios.post('/api/message', { content: newMessage, chatId: selectedChat._id }, config);
                if (socket) socket.emit('new message', data);
                setMessages([...messages, data]);
            } catch (error) {
                alert("Failed to send message");
            }
        }
    };

    const typingHandler = (e) => {
        setNewMessage(e.target.value);
        if (!socketConnected) return;

        if (!typing) {
            setTyping(true);
            if (socket) socket.emit('typing', selectedChat._id);
        }

        let lastTypingTime = new Date().getTime();
        var timerLength = 3000;
        setTimeout(() => {
            var timeNow = new Date().getTime();
            var timeDiff = timeNow - lastTypingTime;
            if (timeDiff >= timerLength && typing) {
                if (socket) socket.emit('stop typing', selectedChat._id);
                setTyping(false);
            }
        }, timerLength);
    };

    return (
        <>
            {selectedChat ? (
                <div
                    className='flex flex-col h-full w-full'
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    <div className='text-lg md:text-2xl pb-3 px-2 w-full font-display font-medium flex justify-between items-center border-b border-white/10 text-white'>
                        {!selectedChat.isGroupChat ? (
                            <>
                                <div className="flex items-center gap-4">
                                    <ProfileModal user={getSenderFull(user, selectedChat.users)}>
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-neon-blue/50 hover:border-neon-blue transition-all cursor-pointer shadow-[0_0_15px_rgba(0,243,255,0.2)]">
                                            <img
                                                src={getSenderFull(user, selectedChat.users).pic}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </ProfileModal>
                                    <div className="flex flex-col">
                                        <span className="text-xl md:text-2xl font-bold tracking-wide text-white drop-shadow-md truncate max-w-[200px] md:max-w-xs">
                                            {getSender(user, selectedChat.users)}
                                        </span>
                                        {activeUsers.includes(getSenderFull(user, selectedChat.users)?._id) && (
                                            <span className="text-xs text-neon-blue font-medium tracking-wider uppercase drop-shadow-[0_0_5px_theme(colors.neon.blue)] animate-pulse">
                                                Online
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        className="p-3 rounded-full bg-white/5 hover:bg-neon-blue/20 text-neon-blue border border-white/10 transition-all group"
                                        onClick={() => {
                                            const friend = getSenderFull(user, selectedChat.users);
                                            startCall(friend._id, friend.name, friend.pic);
                                        }}
                                        title="Audio Call"
                                    >
                                        <Phone size={20} className="group-hover:scale-110 transition-transform" />
                                    </button>
                                    <button
                                        className="p-3 rounded-full bg-white/5 hover:bg-red-500/20 text-red-500 border border-white/10 transition-all group"
                                        onClick={async () => {
                                            if (window.confirm("Are you sure you want to clear the entire chat history? This cannot be undone.")) {
                                                try {
                                                    const config = {};
                                                    await axios.delete(`/api/message/clear/${selectedChat._id}`, config);
                                                    if (socket) socket.emit('chat cleared', selectedChat._id);
                                                    setMessages([]);
                                                } catch (error) {
                                                    alert("Failed to clear chat");
                                                }
                                            }
                                        }}
                                        title="Clear Chat History"
                                    >
                                        <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {selectedChat.chatName.toUpperCase()}
                                <UpdateGroupChatModal
                                    fetchAgain={fetchAgain}
                                    setFetchAgain={setFetchAgain}
                                    fetchMessages={fetchMessages}
                                />
                            </>
                        )}
                    </div>
                    <div className='flex flex-col justify-end p-3 w-full h-full overflow-y-hidden mt-2 relative'>
                        {loading ? (
                            <div className="self-center m-auto animate-spin h-12 w-12 border-4 border-neon-blue rounded-full border-t-transparent"></div>
                        ) : (
                            <div className="messages flex flex-col overflow-y-scroll pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                                <ScrollableChat messages={messages} setMessages={setMessages} />
                            </div>
                        )}

                        <div className="mt-3 relative flex items-center gap-2" onKeyDown={sendMessage}>
                            {isTyping && <div className='absolute -top-6 left-12 text-xs text-neon-pink italic animate-pulse'>Typing...</div>}

                            <div className="relative flex items-center">
                                <AnimatePresence>
                                    {showAttach && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -20, scale: 0.8 }}
                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                            exit={{ opacity: 0, x: -20, scale: 0.8 }}
                                            className="flex items-center gap-2 absolute bottom-12 left-0 bg-black/50 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-xl"
                                        >
                                            {/* Location Button */}
                                            <button
                                                onClick={() => {
                                                    if (!navigator.geolocation) return alert('Geolocation is not supported by your browser');
                                                    navigator.geolocation.getCurrentPosition(async (position) => {
                                                        const { latitude, longitude } = position.coords;
                                                        const locationString = `${latitude},${longitude}`;

                                                        try {
                                                            const config = { headers: { 'Content-type': 'application/json' } };
                                                            const { data } = await axios.post('/api/message', {
                                                                content: locationString,
                                                                chatId: selectedChat._id,
                                                                type: 'location'
                                                            }, config);

                                                            if (socket) socket.emit('new message', data);
                                                            setMessages((prev) => [...prev, data]);
                                                            setShowAttach(false); // Close menu after sending
                                                        } catch (error) {
                                                            alert(`Failed to send location: ${error.message}`);
                                                        }
                                                    });
                                                }}
                                                className="p-3 rounded-full bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue transition-all border border-neon-blue/20 group relative"
                                                title="Send Location"
                                            >
                                                <MapPin size={20} />
                                            </button>

                                            {/* Image Button */}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                                ref={fileInputRef}
                                                onChange={handleFileUpload}
                                            />
                                            <button
                                                onClick={() => fileInputRef.current.click()}
                                                className="p-3 rounded-full bg-green-500/10 hover:bg-green-500/20 text-green-500 transition-all border border-green-500/20"
                                                title="Send Image"
                                                disabled={imgLoading}
                                            >
                                                {imgLoading ? <div className='w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin' /> : <ImageIcon size={20} />}
                                            </button>

                                            {/* Audio Button */}
                                            {!permissionGranted ? (
                                                <button
                                                    onClick={requestPermission}
                                                    onTouchEnd={(e) => {
                                                        e.preventDefault();
                                                        requestPermission();
                                                    }}
                                                    className="p-3 rounded-full bg-neon-pink/10 hover:bg-neon-pink/20 text-neon-pink transition-all border border-neon-pink/20 relative z-50"
                                                    title="Tap to Enable Microphone"
                                                >
                                                    <Mic size={20} />
                                                </button>
                                            ) : (
                                                <button
                                                    onTouchStart={(e) => {
                                                        e.preventDefault();
                                                        if (!loading && !isRecording) startRecording();
                                                    }}
                                                    onTouchEnd={(e) => {
                                                        e.preventDefault();
                                                        if (isRecording) stopRecording();
                                                    }}
                                                    onClick={() => {
                                                        if (isRecording) stopRecording();
                                                    }}
                                                    className={`p-3 rounded-full transition-all border ${isRecording
                                                        ? 'bg-red-500/20 text-red-500 border-red-500 animate-pulse'
                                                        : 'bg-neon-pink/10 hover:bg-neon-pink/20 text-neon-pink border-neon-pink/20'
                                                        }`}
                                                    title={isRecording ? "Release/Click to Send" : "Hold (Mobile) / Click (PC) to Record"}
                                                >
                                                    {isRecording ? <div className='w-5 h-5 bg-red-500 rounded-sm animate-pulse' /> : <Mic size={20} />}
                                                </button>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <button
                                    onClick={() => setShowAttach(!showAttach)}
                                    className={`p-3 rounded-full transition-all duration-300 border border-white/10 ${showAttach ? 'bg-white/20 rotate-45 text-red-400' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`}
                                >
                                    <Plus size={24} />
                                </button>
                            </div>

                            <input
                                className="bg-white/5 border border-white/10 w-full p-3 px-5 rounded-full focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue text-white placeholder-gray-500 transition-all backdrop-blur-sm"
                                placeholder="Enter a message.."
                                onChange={typingHandler}
                                value={newMessage}
                            />
                        </div>
                    </div>
                </div >
            ) : (
                <div className="flex items-center justify-center h-full flex-col space-y-4">
                    <div className="w-24 h-24 bg-gradient-to-tr from-neon-blue to-neon-purple rounded-full blur-[40px] opacity-50 animate-pulse"></div>
                    <p className="text-3xl font-display text-gray-400 opacity-80 z-10">
                        Click on a user to start <span className="text-gradient">Chatting</span>
                    </p>
                </div>
            )}
        </>
    );
};

export default SingleChat;

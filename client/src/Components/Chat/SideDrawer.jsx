import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChatState } from '../../Context/ChatConfig';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileModal from '../Miscellaneous/ProfileModal';
import { Search, ArrowLeft } from 'lucide-react';

const SideDrawer = () => {
    const [search, setSearch] = useState('');
    const [searchResult, setSearchResult] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingChat, setLoadingChat] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef();

    const { user, setUser, setSelectedChat, chats, setChats, notification, setNotification } = ChatState();
    const navigate = useNavigate();

    const logoutHandler = async () => {
        try {
            await axios.post('/api/user/logout');
            localStorage.removeItem('userInfo'); // Optional clearing if it was there
            setUser(null);
            navigate('/');
        } catch (error) {
            console.error("Logout failed", error);
            // Force logout on client side anyway
            setUser(null);
            navigate('/');
        }
    };

    const handleSearch = async () => {
        if (!search) {
            alert('Please enter something in search');
            return;
        }
        try {
            setLoading(true);
            const config = { headers: {} };
            const { data } = await axios.get(`/api/user?search=${search}`, config);
            setLoading(false);
            setSearchResult(data);
        } catch (error) {
            alert('Error Occured!');
            setLoading(false);
        }
    };

    const accessChat = async (userId) => {
        try {
            setLoadingChat(true);
            const config = { headers: { 'Content-type': 'application/json' } };
            const { data } = await axios.post(`/api/chat`, { userId }, config);
            if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);
            setSelectedChat(data);
            setLoadingChat(false);
            setDrawerOpen(false);
        } catch (error) {
            alert('Error fetching the chat');
            setLoadingChat(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [profileRef]);

    return (
        <>
            <div className='flex justify-between items-center bg-white/5 backdrop-blur-md w-full p-3 border-b border-white/10 sticky top-0 z-20'>
                <h2 className='text-2xl md:text-3xl font-bold text-gradient font-display tracking-wider cursor-default drop-shadow-md'>
                    ConnecT
                </h2>

                <div className='flex items-center space-x-4'>
                    <div className='relative cursor-pointer group'>
                        <i className="fas fa-bell text-2xl text-gray-400 group-hover:text-neon-blue transition-colors"></i>
                        {notification.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-neon-pink text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                                {notification.length}
                            </span>
                        )}
                    </div>
                    <button
                        className='flex items-center justify-center p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all text-gray-200 hover:text-neon-classy border border-white/5 group'
                        onClick={() => setDrawerOpen(true)}
                        title="Search Users"
                    >
                        <Search size={22} className="group-hover:text-neon-blue transition-colors" />
                    </button>

                    <div className='relative' ref={profileRef}>
                        <div
                            className="flex items-center space-x-2 cursor-pointer p-1 rounded-md hover:bg-white/10 transition-colors"
                            onClick={() => setProfileOpen(!profileOpen)}
                        >
                            <img src={user.pic} alt={user.name} className="h-10 w-10 rounded-full object-cover border-2 border-neon-purple/50" />
                            <i className={`fas fa-chevron-down text-gray-500 text-sm transition-transform ${profileOpen ? 'rotate-180' : ''}`}></i>
                        </div>

                        {profileOpen && (
                            <div className='absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-md shadow-[0_0_15px_rgba(0,0,0,0.5)] py-1 z-50 animate-fade-in-down backdrop-blur-xl'>
                                <button
                                    className='block px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white w-full text-left transition-colors'
                                    onClick={() => {
                                        setProfileOpen(false);
                                        navigate('/profile');
                                    }}
                                >
                                    My Profile
                                </button>
                                <button className='block px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white w-full text-left transition-colors' onClick={logoutHandler}>Logout</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {drawerOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
                            onClick={() => setDrawerOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed left-0 top-0 h-full w-full md:w-80 bg-[#0F0F0F] border-r border-white/10 z-50 shadow-2xl overflow-y-auto"
                        >
                            <div className="p-5 border-b border-white/10 flex items-center gap-3">
                                {/* Mobile Back Button */}
                                <button
                                    onClick={() => setDrawerOpen(false)}
                                    className="md:hidden p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                                >
                                    <ArrowLeft size={24} />
                                </button>
                                <h3 className='text-xl font-bold text-gradient font-display'>Search Users</h3>
                            </div>
                            <div className="p-4 flex space-x-2">
                                <input
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md focus:outline-none focus:border-neon-blue text-white placeholder-gray-500"
                                    placeholder="Search by name or email"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <button
                                    onClick={handleSearch}
                                    className="bg-neon-blue/20 border border-neon-blue/50 text-neon-blue px-4 py-2 rounded-md hover:bg-neon-blue hover:text-black transition-all font-bold"
                                >
                                    Go
                                </button>
                            </div>

                            <div className="px-4 pb-4 space-y-2">
                                {loading ? (
                                    <div className="flex justify-center py-4"><span className="animate-spin h-6 w-6 border-2 border-neon-blue rounded-full border-t-transparent"></span></div>
                                ) : (
                                    searchResult?.map(user => (
                                        <div
                                            key={user._id}
                                            onClick={() => accessChat(user._id)}
                                            className="flex items-center space-x-3 p-3 bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-lg cursor-pointer transition-all"
                                        >
                                            <img src={user.pic} alt={user.name} className="h-10 w-10 rounded-full bg-gray-700" />
                                            <div>
                                                <p className="font-semibold text-gray-200">{user.name}</p>
                                                <p className="text-sm text-gray-500">Email: {user.email}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                                {loadingChat && <div className="text-center text-neon-blue mt-2 animate-pulse">Opening Chat...</div>}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default SideDrawer;

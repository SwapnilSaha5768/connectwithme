import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';

const isProduction = window.location.hostname.includes('vercel.app');
const ENDPOINT = isProduction ? '/' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:5000');

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
    const [selectedChat, setSelectedChat] = useState();
    const [user, setUser] = useState();
    const [notification, setNotification] = useState([]);
    const [chats, setChats] = useState([]);
    const [socket, setSocket] = useState(null);
    const [activeUsers, setActiveUsers] = useState([]);

    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const fetchUser = async () => {
            // If user is already set, we don't strictly need to refetch, but checking session validity is good.
            if (!user) {
                try {
                    const { data } = await axios.get('/api/user/me');

                    if (data) {
                        setUser(data);
                    } else {
                        // User is not authenticated (backend returned null)
                        if (location.pathname !== '/' && location.pathname !== '/resetpassword' && location.pathname !== '/register') {
                            navigate('/');
                        }
                    }
                    setLoading(false);
                } catch (error) {
                    setLoading(false);
                    if (location.pathname !== '/' && location.pathname !== '/resetpassword') {
                        navigate('/');
                    }
                }
            } else {
                setLoading(false);
            }
        };

        fetchUser();
    }, [navigate, location.pathname]); // Dependencies

    useEffect(() => {
        if (user) {
            const newSocket = io(ENDPOINT, { withCredentials: true });
            setSocket(newSocket);
            newSocket.emit('setup', user);

            newSocket.on('connected-users', (users) => {
                setActiveUsers(users);
            });

            return () => newSocket.close();
        } else {
            // Clear state when user logs out or is not authenticated
            setChats([]);
            setNotification([]);
            setSelectedChat(null);
            setActiveUsers([]);
        }
    }, [user]);

    return (
        <ChatContext.Provider
            value={{
                selectedChat,
                setSelectedChat,
                user,
                setUser,
                notification,
                setNotification,
                chats,
                setChats,
                socket,
                activeUsers,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};

export const ChatState = () => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        console.error("ChatState: Context is undefined! Attempting to access ChatContext outside of ChatProvider.");
    }
    return context;
};

export default ChatProvider;

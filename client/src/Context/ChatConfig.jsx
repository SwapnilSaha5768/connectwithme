import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import Loading from '../Components/Miscellaneous/Loading';

const ENDPOINT = import.meta.env.VITE_SERVER_URL;

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
        let isActive = true;

        const fetchUser = async () => {
            if (!user) {
                try {
                    const { data } = await axios.get('/api/user/me');

                    if (isActive) {
                        if (data) {
                            setUser(data);
                        } else {
                            if (location.pathname !== '/' && location.pathname !== '/resetpassword' && location.pathname !== '/register') {
                                navigate('/');
                            }
                        }
                        setLoading(false);
                    }
                } catch (error) {
                    if (isActive) {
                        setLoading(false);
                        if (location.pathname !== '/' && location.pathname !== '/resetpassword') {
                            navigate('/');
                        }
                    }
                }
            } else {
                if (isActive) setLoading(false);
            }
        };

        fetchUser();

        return () => {
            isActive = false;
        };
    }, [navigate, location.pathname]);

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
            setChats([]);
            setNotification([]);
            setSelectedChat(null);
            setActiveUsers([]);
        }
    }, [user]);

    // specific routes to not show loading
    if (loading && location.pathname !== '/' && location.pathname !== '/register' && location.pathname !== '/resetpassword') {
        return <Loading />;
    }

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

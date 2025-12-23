import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';

const ENDPOINT = import.meta.env.VITE_SERVER_URL || '/';

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
    console.log("ChatProvider: Rendering");
    const [selectedChat, setSelectedChat] = useState();
    const [user, setUser] = useState();
    const [notification, setNotification] = useState([]);
    const [chats, setChats] = useState([]);
    const [socket, setSocket] = useState(null);
    const [activeUsers, setActiveUsers] = useState([]);

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        setUser(userInfo);

        if (!userInfo) {
            if (location.pathname !== '/' && location.pathname !== '/resetpassword') {
                navigate('/');
            }
        } else {
            const newSocket = io(ENDPOINT);
            setSocket(newSocket);
            newSocket.emit('setup', userInfo);

            newSocket.on('connected-users', (users) => {
                setActiveUsers(users);
            });

            return () => newSocket.close();
        }
    }, [navigate, location.pathname]);

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

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const ENDPOINT = import.meta.env.VITE_SERVER_URL || '/';

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
    const [selectedChat, setSelectedChat] = useState();
    const [user, setUser] = useState();
    const [notification, setNotification] = useState([]);
    const [chats, setChats] = useState([]);
    const [socket, setSocket] = useState(null);
    const [activeUsers, setActiveUsers] = useState([]);

    const navigate = useNavigate();

    useEffect(() => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        setUser(userInfo);

        if (!userInfo) {
            navigate('/');
        } else {
            const newSocket = io(ENDPOINT);
            setSocket(newSocket);
            newSocket.emit('setup', userInfo);

            newSocket.on('connected-users', (users) => {
                setActiveUsers(users);
            });

            return () => newSocket.close();
        }
    }, [navigate]);

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
    return useContext(ChatContext);
};

export default ChatProvider;

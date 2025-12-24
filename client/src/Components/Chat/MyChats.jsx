import React, { useEffect, useState } from 'react';
import { ChatState } from '../../Context/ChatConfig';
import axios from 'axios';
import GroupChatModal from '../Miscellaneous/GroupChatModal';

const MyChats = ({ fetchAgain }) => {
    const [loggedUser, setLoggedUser] = useState();
    const { selectedChat, setSelectedChat, user, chats, setChats } = ChatState();

    const fetchChats = async () => {
        try {
            const config = {};
            const { data } = await axios.get('/api/chat', config);
            setChats(data);
        } catch (error) {
            alert("Failed to Load the chats");
        }
    };

    useEffect(() => {
        setLoggedUser(user);
        if (!chats.length) fetchChats();
    }, [fetchAgain, user]);

    const getSender = (loggedUser, users) => {
        if (!loggedUser || !users || users.length < 2) return "User";
        return users[0]._id === loggedUser._id ? users[1].name : users[0].name;
    }

    return (
        <div className="glass flex flex-col p-4 w-full h-full rounded-xl">
            <div className='pb-4 px-2 text-2xl font-display font-bold text-white flex w-full justify-between items-center border-b border-white/10 mb-2'>
                My Chats
                <GroupChatModal>
                    <button className='text-sm flex bg-white/10 hover:bg-white/20 border border-white/5 text-gray-200 px-3 py-1.5 rounded-md items-center cursor-pointer transition-all'>
                        <i className="fas fa-plus mr-2"></i> New Group
                    </button>
                </GroupChatModal>
            </div>
            <div className="flex flex-col w-full h-full overflow-y-hidden">
                {chats && loggedUser ? (
                    <div className="overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {chats.map((chat) => (
                            <div
                                onClick={() => setSelectedChat(chat)}
                                className={`cursor-pointer px-4 py-3 rounded-xl transition-all duration-300 border ${selectedChat === chat
                                    ? 'bg-gradient-to-r from-neon-purple/80 to-neon-pink/80 text-white shadow-lg border-transparent'
                                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border-transparent hover:border-white/10'
                                    }`}
                                key={chat._id}
                            >
                                <p className="font-medium tracking-wide">
                                    {!chat.isGroupChat ? getSender(loggedUser, chat.users) : chat.chatName}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex justify-center p-4">
                        <span className="animate-spin h-8 w-8 border-2 border-neon-purple rounded-full border-t-transparent"></span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyChats;

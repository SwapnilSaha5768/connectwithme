import React from 'react';
import { ChatState } from '../../Context/ChatConfig';
import SingleChat from './SingleChat';

const ChatBox = ({ fetchAgain, setFetchAgain, socket, socketConnected, startCall }) => {
    const { selectedChat } = ChatState();

    return (
        <div className="glass flex flex-col p-4 w-full h-full rounded-xl relative overflow-hidden">
            {/* Optional inner glow/decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-blue/5 rounded-full blur-[80px] -z-10"></div>

            <SingleChat
                fetchAgain={fetchAgain}
                setFetchAgain={setFetchAgain}
                socket={socket}
                socketConnected={socketConnected}
                startCall={startCall}
            />
        </div>
    );
};

export default ChatBox;

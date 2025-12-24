import React, { useState } from 'react';
import axios from 'axios';
import { ChatState } from '../../Context/ChatConfig';

const UpdateGroupChatModal = ({ fetchAgain, setFetchAgain, fetchMessages }) => {
    const { selectedChat, setSelectedChat, user } = ChatState();

    const [isOpen, setIsOpen] = useState(false);
    const [groupChatName, setGroupChatName] = useState('');
    const [search, setSearch] = useState('');
    const [searchResult, setSearchResult] = useState([]);
    const [loading, setLoading] = useState(false);
    const [renameloading, setRenameloading] = useState(false);

    const handleRemove = async (user1) => {
        if (selectedChat.groupAdmin._id !== user._id && user1._id !== user._id) {
            alert("Only admins can remove users!");
            return;
        }

        try {
            setLoading(true);
            const config = {
                headers: {}
            };
            const { data } = await axios.put(
                `/api/chat/groupremove`,
                {
                    chatId: selectedChat._id,
                    userId: user1._id,
                },
                config
            );

            user1._id === user._id ? setSelectedChat() : setSelectedChat(data);
            setFetchAgain(!fetchAgain);
            fetchMessages(); // Refresh messages in parent
            setLoading(false);
        } catch (error) {
            alert("Error removing user");
            setLoading(false);
        }
    };

    const handleRename = async () => {
        if (!groupChatName) return;

        try {
            setRenameloading(true);
            const config = {
                headers: {}
            };
            const { data } = await axios.put(
                `/api/chat/rename`,
                {
                    chatId: selectedChat._id,
                    chatName: groupChatName,
                },
                config
            );

            setSelectedChat(data);
            setFetchAgain(!fetchAgain);
            setRenameloading(false);
            setGroupChatName("");
        } catch (error) {
            alert("Error renaming group");
            setRenameloading(false);
            setGroupChatName("");
        }
    };

    const handleSearch = async (query) => {
        setSearch(query);
        if (!query) return;

        try {
            setLoading(true);
            const config = {
                headers: {}
            };
            const { data } = await axios.get(`/api/user?search=${query}`, config);
            setLoading(false);
            setSearchResult(data);
        } catch (error) {
            alert("Error searching user");
            setLoading(false);
        }
    };

    const handleAddUser = async (user1) => {
        if (selectedChat.users.find((u) => u._id === user1._id)) {
            alert("User Already in group!");
            return;
        }

        if (selectedChat.groupAdmin._id !== user._id) {
            alert("Only admins can add someone!");
            return;
        }

        try {
            setLoading(true);
            const config = {
                headers: {}
            };
            const { data } = await axios.put(
                '/api/chat/groupadd',
                {
                    chatId: selectedChat._id,
                    userId: user1._id,
                },
                config
            );

            setSelectedChat(data);
            setFetchAgain(!fetchAgain);
            setLoading(false);
        } catch (error) {
            alert("Error Adding User");
            setLoading(false);
        }
    }

    return (
        <>
            <button onClick={() => setIsOpen(true)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors">
                <i className="fas fa-eye"></i>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsOpen(false)}></div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 className="text-2xl font-bold text-center mb-4">{selectedChat.chatName}</h3>
                                <div className="flex flex-wrap gap-2 justify-center mb-4">
                                    {selectedChat.users.map((u) => (
                                        <div key={u._id} className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-sm flex items-center">
                                            {u.name}
                                            <span onClick={() => handleRemove(u)} className="ml-2 cursor-pointer font-bold text-red-500">x</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex space-x-2">
                                    <input
                                        placeholder="Rename Chat"
                                        className="w-full border p-2 rounded-md"
                                        value={groupChatName}
                                        onChange={(e) => setGroupChatName(e.target.value)}
                                    />
                                    <button
                                        className={`bg-teal-500 text-white px-4 py-2 rounded-md ${renameloading ? "opacity-50" : ""}`}
                                        onClick={handleRename}
                                        disabled={renameloading}
                                    >
                                        Update
                                    </button>
                                </div>
                                <div className="mt-4">
                                    <input
                                        placeholder="Add User to group"
                                        className="w-full border p-2 rounded-md"
                                        onChange={(e) => handleSearch(e.target.value)}
                                    />
                                    {loading ? <div>Loading...</div> : (
                                        searchResult?.slice(0, 4).map(user => (
                                            <div key={user._id} onClick={() => handleAddUser(user)} className="cursor-pointer hover:bg-gray-100 p-2 rounded-md flex items-center space-x-2 mt-1">
                                                <img src={user.pic} alt={user.name} className="h-8 w-8 rounded-full" />
                                                <div>
                                                    <p className='font-semibold'>{user.name}</p>
                                                    <p className='text-xs text-gray-500'>{user.email}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button onClick={() => handleRemove(user)} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                                    Leave Group
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default UpdateGroupChatModal;

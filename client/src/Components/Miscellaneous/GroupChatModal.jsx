import React, { useState } from 'react';
import axios from 'axios';
import { ChatState } from '../../Context/ChatConfig';

const GroupChatModal = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [groupChatName, setGroupChatName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [searchResult, setSearchResult] = useState([]);
    const [loading, setLoading] = useState(false);

    const { user, chats, setChats } = ChatState();

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
            alert("Failed to load search results");
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!groupChatName || !selectedUsers) {
            alert("Please fill all the fields");
            return;
        }

        try {
            const config = {
                headers: {}
            };

            const { data } = await axios.post('/api/chat/group', {
                name: groupChatName,
                users: JSON.stringify(selectedUsers.map((u) => u._id)),
            }, config);

            setChats([data, ...chats]);
            setIsOpen(false);
            alert("New Group Chat Created!");
        } catch (error) {
            alert("Failed to create the chat!");
        }
    };

    const handleGroup = (userToAdd) => {
        if (selectedUsers.includes(userToAdd)) {
            alert("User already added");
            return;
        }
        setSelectedUsers([...selectedUsers, userToAdd]);
    };

    const handleDelete = (delUser) => {
        setSelectedUsers(selectedUsers.filter(sel => sel._id !== delUser._id));
    };


    return (
        <>
            <span onClick={() => setIsOpen(true)}>{children}</span>

            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-center justify-center min-h-screen px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsOpen(false)}></div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-xl leading-6 font-bold text-gray-900" id="modal-title">Create Group Chat</h3>
                                        <div className="mt-4 space-y-4">
                                            <input
                                                placeholder='Chat Name'
                                                className="w-full border p-2 rounded-md mb-3"
                                                onChange={(e) => setGroupChatName(e.target.value)}
                                            />
                                            <input
                                                placeholder='Add Users eg: John, Jane'
                                                className="w-full border p-2 rounded-md mb-1"
                                                onChange={(e) => handleSearch(e.target.value)}
                                            />

                                            {/* Selected Users Chips */}
                                            <div className="flex flex-wrap gap-2">
                                                {selectedUsers.map((u) => (
                                                    <div key={u._id} className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-sm flex items-center">
                                                        {u.name}
                                                        <span onClick={() => handleDelete(u)} className="ml-2 cursor-pointer font-bold">x</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Render Search Results */}
                                            {loading ? <div>Loading...</div> : (
                                                searchResult?.slice(0, 4).map(user => (
                                                    <div key={user._id} onClick={() => handleGroup(user)} className="cursor-pointer hover:bg-gray-100 p-2 rounded-md flex items-center space-x-2">
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
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button onClick={handleSubmit} type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                                    Create Chat
                                </button>
                                <button onClick={() => setIsOpen(false)} type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default GroupChatModal;

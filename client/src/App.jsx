import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Homepage from './Pages/Homepage';
import ChatPage from './Pages/ChatPage';
import ProfilePage from './Pages/ProfilePage';
import ResetPassword from './Components/Auth/ResetPassword';
import './index.css';

import ChatProvider from './Context/ChatConfig';

function App() {
    return (
        <BrowserRouter>
            <ChatProvider>
                <div className="App">
                    <Routes>
                        <Route path="/" element={<Homepage />} />
                        <Route path="/chats" element={<ChatPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/resetpassword" element={<ResetPassword />} />
                    </Routes>
                </div>
            </ChatProvider>
        </BrowserRouter>
    );
}

export default App;

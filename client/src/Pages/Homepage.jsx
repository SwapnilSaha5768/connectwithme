import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Login from '../Components/Auth/Login';
import Signup from '../Components/Auth/Signup';

import { ChatState } from '../Context/ChatConfig';

const Homepage = () => {
    const navigate = useNavigate();
    const { user } = ChatState();

    useEffect(() => {
        if (user) navigate('/chats');
    }, [navigate, user]);

    const [activeTab, setActiveTab] = React.useState('login');

    return (
        <div className='min-h-screen flex items-center justify-center p-4 relative overflow-hidden'>
            {/* Decorative background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-purple/20 rounded-full blur-[120px] animate-pulse-slow"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-blue/20 rounded-full blur-[120px] animate-pulse-slow animation-delay-2000"></div>

            <div className='glass w-full max-w-lg rounded-2xl overflow-hidden relative z-10'>
                <div className='p-6 md:p-8 text-center border-b border-white/10 bg-white/5'>
                    <h1 className='text-5xl font-display font-bold text-gradient tracking-wider mb-2 drop-shadow-lg'>
                        ConnecT
                    </h1>
                    <p className='text-gray-300 font-light tracking-widest text-sm uppercase'>
                        Secure Realtime Conversations
                    </p>
                </div>

                <div className='flex border-b border-white/10'>
                    <button
                        className={`w-1/2 py-4 text-center font-bold tracking-wide transition-all duration-300 ${activeTab === 'login'
                            ? 'text-neon-blue bg-white/5 border-b-2 border-neon-blue'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        onClick={() => setActiveTab('login')}
                    >
                        LOGIN
                    </button>
                    <button
                        className={`w-1/2 py-4 text-center font-bold tracking-wide transition-all duration-300 ${activeTab === 'signup'
                            ? 'text-neon-pink bg-white/5 border-b-2 border-neon-pink'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        onClick={() => setActiveTab('signup')}
                    >
                        SIGN UP
                    </button>
                </div>

                <div className='p-8'>
                    {activeTab === 'login' ? <Login /> : <Signup />}
                </div>
            </div>
        </div>
    );
};

export default Homepage;

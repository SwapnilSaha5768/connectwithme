import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { ChatState } from '../../Context/ChatConfig';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { setUser } = ChatState();

    const submitHandler = async (e) => {
        e.preventDefault();
        setLoading(true);
        if (!email || !password) {
            alert('Please fill all the fields');
            setLoading(false);
            return;
        }

        try {
            const config = {
                headers: { 'Content-type': 'application/json' },
            };

            const { data } = await axios.post(
                '/api/user/login',
                { email, password },
                config
            );

            setUser(data);
            setLoading(false);
            navigate('/chats');
        } catch (error) {
            if (error.response && error.response.status === 403 && error.response.data.isVerified === false) {
                alert(error.response.data.message);
                setShowOtpInput(true);
                setLoading(false);
                return;
            }

            alert(
                'Error Occured: ' +
                (error.response && error.response.data.message
                    ? error.response.data.message
                    : error.message)
            );
            setLoading(false);
        }
    };

    const verifyOtpHandler = async (e) => {
        e.preventDefault();
        setLoading(true);
        if (!otp) {
            alert("Please enter OTP");
            setLoading(false);
            return;
        }

        try {
            const config = { headers: { 'Content-type': 'application/json' } };
            const { data } = await axios.post('/api/user/verify-otp', { email, otp }, config);

            setUser(data);
            setLoading(false);
            navigate('/chats');
        } catch (error) {
            alert('Verification Failed: ' + (error.response && error.response.data.message ? error.response.data.message : error.message));
            setLoading(false);
        }
    };

    return (
        <div className='space-y-6 animate-fade-in'>
            {!showOtpInput ? (
                <>
                    <div className='space-y-2'>
                        <label className='block text-xs font-bold text-neon-blue uppercase tracking-wider'>Email</label>
                        <input
                            type='email'
                            placeholder='Enter your email'
                            className='w-full px-4 py-3 rounded-lg bg-dark-surface/50 border border-white/10 text-white placeholder-gray-500 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all outline-none'
                            onChange={(e) => setEmail(e.target.value)}
                            value={email}
                            required
                        />
                    </div>
                    <div className='space-y-2'>
                        <label className='block text-xs font-bold text-neon-blue uppercase tracking-wider'>
                            Password
                        </label>
                        <input
                            type='password'
                            placeholder='Enter password'
                            className='w-full px-4 py-3 rounded-lg bg-dark-surface/50 border border-white/10 text-white placeholder-gray-500 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all outline-none'
                            onChange={(e) => setPassword(e.target.value)}
                            value={password}
                            required
                        />
                    </div>
                    <button
                        onClick={submitHandler}
                        disabled={loading}
                        className={`w-full py-3 px-4 rounded-lg font-bold text-lg tracking-wide shadow-[0_0_15px_rgba(0,243,255,0.3)] hover:shadow-[0_0_25px_rgba(0,243,255,0.5)] transition-all duration-300 ${loading
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                            }`}
                    >
                        {loading ? 'Submitting...' : 'Login'}
                    </button>

                    <div className='text-center mt-4'>
                        <Link
                            to="/resetpassword"
                            className='text-gray-400 hover:text-neon-blue text-sm transition-colors'
                        >
                            Forgot Password?
                        </Link>
                    </div>
                </>
            ) : (
                <div className="space-y-4 animate-fade-in-up">
                    <div className="text-center">
                        <h3 className="text-lg font-display text-white">Enter Verification Code</h3>
                        <p className="text-gray-400 text-sm">We sent a newly generated 6-digit code to {email}</p>
                    </div>
                    <div className='space-y-2'>
                        <input
                            type='text' placeholder='Enter 6-digit OTP'
                            className='w-full px-4 py-3 rounded-lg bg-dark-surface/50 border border-white/10 text-white placeholder-gray-500 focus:border-neon-pink focus:ring-1 focus:ring-neon-pink transition-all outline-none text-center text-2xl tracking-[0.5em] font-display'
                            onChange={(e) => setOtp(e.target.value)} value={otp} maxLength={6}
                        />
                    </div>
                    <button
                        onClick={verifyOtpHandler}
                        disabled={loading}
                        className={`w-full py-3 px-4 rounded-lg font-bold text-lg tracking-wide shadow-[0_0_15px_rgba(72,187,120,0.3)] hover:shadow-[0_0_25px_rgba(72,187,120,0.5)] transition-all duration-300 ${loading
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                            }`}
                    >
                        {loading ? 'Verifying...' : 'Verify & Login'}
                    </button>
                    <button
                        onClick={() => setShowOtpInput(false)}
                        className="w-full text-gray-400 hover:text-white text-sm mt-2"
                    >
                        Back to Login
                    </button>
                </div>
            )}
        </div>
    );
};

export default Login;

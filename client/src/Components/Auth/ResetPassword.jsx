import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
    // Step 1: Email
    // Step 2: OTP + New Password
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const sendOtpHandler = async (e) => {
        e.preventDefault();
        setLoading(true);
        if (!email) {
            alert("Please enter your email");
            setLoading(false);
            return;
        }

        try {
            const config = { headers: { 'Content-type': 'application/json' } };
            // Note: Reuse the forgotpassword endpoint which now sends OTP
            const { data } = await axios.post('/api/user/forgotpassword', { email }, config);

            // On success
            setStep(2);
            setLoading(false);
            alert("OTP sent to your email!");
        } catch (error) {
            alert(
                'Error: ' +
                (error.response && error.response.data.message
                    ? error.response.data.message
                    : error.message)
            );
            setLoading(false);
        }
    };

    const resetPasswordHandler = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (password !== confirmPassword) {
            alert("Passwords do not match");
            setLoading(false);
            return;
        }

        if (!otp) {
            alert("Please enter OTP");
            setLoading(false);
            return;
        }

        try {
            const config = {
                headers: { 'Content-type': 'application/json' },
            };

            const { data } = await axios.put(
                '/api/user/resetpassword',
                { email, otp, password }, // Send all 3
                config
            );

            alert('Password Reset Successfully! Logging you in...');
            localStorage.setItem('userInfo', JSON.stringify(data));
            setLoading(false);
            navigate('/chats');
        } catch (error) {
            alert(
                'Error: ' +
                (error.response && error.response.data.message
                    ? error.response.data.message
                    : error.message)
            );
            setLoading(false);
        }
    };

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
                        {step === 1 ? 'Recover Your Account' : 'Set New Password'}
                    </p>
                </div>

                <div className='p-8'>
                    {step === 1 ? (
                        <div className="space-y-6 animate-fade-in">
                            <div className='space-y-2'>
                                <label className='block text-xs font-bold text-neon-blue uppercase tracking-wider'>Email Address</label>
                                <input
                                    type='email'
                                    placeholder='Enter your email'
                                    className='w-full px-4 py-3 rounded-lg bg-dark-surface/50 border border-white/10 text-white placeholder-gray-500 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all outline-none'
                                    onChange={(e) => setEmail(e.target.value)}
                                    value={email}
                                    required
                                />
                            </div>
                            <button
                                onClick={sendOtpHandler}
                                disabled={loading}
                                className={`w-full py-3 px-4 rounded-lg font-bold text-lg tracking-wide shadow-[0_0_15px_rgba(0,243,255,0.3)] hover:shadow-[0_0_25px_rgba(0,243,255,0.5)] transition-all duration-300 ${loading
                                    ? 'bg-gray-600 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                                    }`}
                            >
                                {loading ? 'Sending OTP...' : 'Send OTP'}
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="w-full text-gray-400 hover:text-white text-sm mt-2 transition-colors"
                            >
                                Back to Login
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className='space-y-2'>
                                <label className='block text-xs font-bold text-neon-blue uppercase tracking-wider'>OTP Code</label>
                                <input
                                    type='text'
                                    placeholder='Enter 6-digit OTP'
                                    className='w-full px-4 py-3 rounded-lg bg-dark-surface/50 border border-white/10 text-white placeholder-gray-500 focus:border-neon-pink focus:ring-1 focus:ring-neon-pink transition-all outline-none text-center text-xl tracking-widest font-display'
                                    onChange={(e) => setOtp(e.target.value)}
                                    value={otp}
                                    maxLength={6}
                                    required
                                />
                            </div>
                            <div className='space-y-2'>
                                <label className='block text-xs font-bold text-neon-blue uppercase tracking-wider'>New Password</label>
                                <input
                                    type='password'
                                    placeholder='Enter new password'
                                    className='w-full px-4 py-3 rounded-lg bg-dark-surface/50 border border-white/10 text-white placeholder-gray-500 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all outline-none'
                                    onChange={(e) => setPassword(e.target.value)}
                                    value={password}
                                    required
                                />
                            </div>
                            <div className='space-y-2'>
                                <label className='block text-xs font-bold text-neon-blue uppercase tracking-wider'>Confirm Password</label>
                                <input
                                    type='password'
                                    placeholder='Confirm new password'
                                    className='w-full px-4 py-3 rounded-lg bg-dark-surface/50 border border-white/10 text-white placeholder-gray-500 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all outline-none'
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    value={confirmPassword}
                                    required
                                />
                            </div>

                            <button
                                onClick={resetPasswordHandler}
                                disabled={loading}
                                className={`w-full py-3 px-4 rounded-lg font-bold text-lg tracking-wide shadow-[0_0_15px_rgba(72,187,120,0.3)] hover:shadow-[0_0_25px_rgba(72,187,120,0.5)] transition-all duration-300 ${loading
                                    ? 'bg-gray-600 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                                    }`}
                            >
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                            <button
                                onClick={() => setStep(1)}
                                className="w-full text-gray-400 hover:text-white text-sm mt-2 transition-colors"
                            >
                                Back to Email
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;

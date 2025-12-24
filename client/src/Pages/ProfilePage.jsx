import React, { useState, useEffect } from 'react';
import { ChatState } from '../Context/ChatConfig';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Mail, Lock, Camera, Save, ArrowLeft, Loader2 } from 'lucide-react';

const ProfilePage = () => {
    const { user, setUser } = ChatState();
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pic, setPic] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name);
            setPic(user.pic);
        } else {
            navigate('/');
        }
    }, [user, navigate]);

    const postDetails = (pics) => {
        setLoading(true);
        if (pics === undefined) {
            alert("Please Select an Image!");
            setLoading(false);
            return;
        }

        if (pics.type === "image/jpeg" || pics.type === "image/png") {
            const reader = new FileReader();
            reader.readAsDataURL(pics);
            reader.onloadend = () => {
                setPic(reader.result);
                setLoading(false);
            };
        } else {
            alert("Please Select an Image (jpeg/png)");
            setLoading(false);
        }
    };

    const submitHandler = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (password && password !== confirmPassword) {
            alert("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            const config = {
                headers: {
                    'Content-type': 'application/json',
                },
            };

            const { data } = await axios.put(
                '/api/user/profile',
                {
                    name,
                    pic,
                    password: password || undefined,
                },
                config
            );

            alert("Profile Updated Successfully");
            setUser(data);
            setUser(data);
            setLoading(false);
        } catch (error) {
            alert(error.response?.data?.message || "Something went wrong");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-purple/20 rounded-full blur-[120px] animate-pulse-slow"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-blue/20 rounded-full blur-[120px] animate-pulse-slow animation-delay-2000"></div>

            <div className="glass w-full max-w-4xl rounded-2xl overflow-hidden relative z-10 p-8 flex flex-col md:flex-row gap-8">

                {/* Header / Back Button */}
                <button
                    onClick={() => navigate('/chats')}
                    className="absolute top-4 left-4 p-2 rounded-full hover:bg-white/10 text-white transition-all"
                >
                    <ArrowLeft size={24} />
                </button>

                {/* Left Side: Avatar & Basic Info */}
                <div className="w-full md:w-1/3 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/10 pb-8 md:pb-0 md:pr-8">
                    <div className="relative group cursor-pointer mb-6">
                        <img
                            src={pic}
                            alt={name}
                            className="w-48 h-48 rounded-full object-cover border-4 border-white/10 shadow-[0_0_30px_rgba(188,19,254,0.3)] group-hover:border-neon-pink transition-all duration-300"
                        />
                        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                            <label htmlFor="pic-upload" className="cursor-pointer flex flex-col items-center text-white">
                                <Camera size={32} />
                                <span className="text-sm mt-2 font-medium">Change Photo</span>
                            </label>
                            <input
                                id="pic-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => postDetails(e.target.files[0])}
                            />
                        </div>
                    </div>

                    <h2 className="text-3xl font-display font-bold text-white mb-1 glow-text">{name}</h2>
                    <p className="text-gray-400 font-light flex items-center gap-2">
                        <Mail size={16} /> {user?.email}
                    </p>
                </div>

                {/* Right Side: Edit Form */}
                <div className="w-full md:w-2/3">
                    <h3 className="text-2xl font-display font-medium text-white mb-6 border-b border-white/10 pb-2">Edit Profile</h3>

                    <form onSubmit={submitHandler} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-neon-blue text-sm font-bold uppercase tracking-wider ml-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all outline-none backdrop-blur-sm"
                                    placeholder="Enter your name"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-neon-pink text-sm font-bold uppercase tracking-wider ml-1">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-neon-pink focus:ring-1 focus:ring-neon-pink transition-all outline-none backdrop-blur-sm"
                                    placeholder="Leave blank to keep current"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-neon-pink text-sm font-bold uppercase tracking-wider ml-1">Confirm New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-neon-pink focus:ring-1 focus:ring-neon-pink transition-all outline-none backdrop-blur-sm"
                                    placeholder="Confirm new password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-8 bg-gradient-to-r from-neon-blue to-neon-purple hover:from-neon-blue/80 hover:to-neon-purple/80 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(188,19,254,0.4)] hover:shadow-[0_0_30px_rgba(188,19,254,0.6)] transition-all flex items-center justify-center gap-2 transform active:scale-95"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Save Changes</>}
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
};

export default ProfilePage;

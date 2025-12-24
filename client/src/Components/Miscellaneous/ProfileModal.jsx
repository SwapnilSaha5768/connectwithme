import React, { useState } from 'react';
import { Edit2, Loader } from 'lucide-react';
import axios from 'axios';
import { ChatState } from '../../Context/ChatConfig';
import ImageCropper from './ImageCropper';

const ProfileModal = ({ user, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [imgLoading, setImgLoading] = useState(false);
    const [showCropper, setShowCropper] = useState(false);
    const [tempImgSrc, setTempImgSrc] = useState(null);
    const { user: loggedInUser, setUser } = ChatState();

    const onFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'image/jpeg' && file.type !== 'image/png' && file.type !== 'image/jpg') {
            return alert("Please select a valid image (JPEG/PNG)");
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            setTempImgSrc(reader.result);
            setShowCropper(true);
        };
    };

    const performUpload = async (croppedFile) => {
        setShowCropper(false);
        try {
            setImgLoading(true);
            const formData = new FormData();
            formData.append("image", croppedFile);

            // 1. Upload to ImgBB
            const imgRes = await fetch(`https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`, {
                method: "POST",
                body: formData,
            });
            const imgData = await imgRes.json();

            if (!imgData.success) {
                setImgLoading(false);
                return alert("ImgBB Upload Failed");
            }

            const newPicUrl = imgData.data.url;

            // 2. Update Backend
            const config = { headers: { 'Content-type': 'application/json' } };

            const { data } = await axios.put('/api/user/profile', { pic: newPicUrl }, config);

            // 3. Update Local State
            setUser(data);
            setImgLoading(false);
        } catch (error) {
            console.error(error);
            alert("Failed to update profile picture");
            setImgLoading(false);
        }
    };

    return (
        <>
            <span onClick={() => setIsOpen(true)}>{children}</span>

            {/* Cropper Modal */}
            {showCropper && (
                <ImageCropper
                    imageSrc={tempImgSrc}
                    onCancel={() => setShowCropper(false)}
                    onCropComplete={performUpload}
                />
            )}

            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-900 opacity-75" onClick={() => setIsOpen(false)}></div>
                        </div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-[#1a1a1a] border border-white/10 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4 flex flex-col items-center">
                                <h3 className="text-3xl font-display font-medium text-white mb-6">{user.name}</h3>

                                <div className="relative group cursor-pointer w-40 h-40 mb-6">
                                    <img
                                        src={user.pic}
                                        alt={user.name}
                                        className="w-full h-full rounded-full object-cover border-4 border-neon-blue/20"
                                    />
                                    {loggedInUser._id === user._id && (
                                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            {imgLoading ? <Loader className="animate-spin text-white" /> : <Edit2 className="text-white" />}
                                            <input type="file" className="hidden" accept="image/*" onChange={onFileSelect} disabled={imgLoading} />
                                        </label>
                                    )}
                                </div>

                                <p className="text-xl text-gray-400 font-sans tracking-wide">{user.email}</p>
                            </div>
                            <div className="bg-white/5 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-white/10">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-neon-pink text-base font-medium text-white hover:bg-pink-600 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProfileModal;

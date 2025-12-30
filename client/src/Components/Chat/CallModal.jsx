import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { motion } from 'framer-motion';

const CallModal = ({
    stream,
    callAccepted,
    myVideo,
    userVideo,
    callEnded,
    answerCall,
    call,
    name,
    leaveCall,
    isIncoming,
    remoteStream // Added
}) => {
    const isVideoCall = call.isVideo || (stream && stream.getVideoTracks().length > 0);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [muted, setMuted] = useState(false);

    const toggleMute = () => {
        if (stream) {
            setMuted(!muted);
            stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled;
        }
    };

    const toggleVideo = () => {
        if (stream) {
            setVideoEnabled(!videoEnabled);
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
            }
        }
    };

    // Ringtone Logic
    useEffect(() => {
        let ringtone = new Audio("https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg"); // Standard Google Sound
        ringtone.loop = true;

        if (isIncoming && !callAccepted) {
            ringtone.play().catch(e => { });
        }

        return () => {
            ringtone.pause();
            ringtone.currentTime = 0;
        };
    }, [isIncoming, callAccepted]);

    // Force play remote stream when available
    useEffect(() => {
        if (userVideo?.current && callAccepted && !callEnded) {
            if (remoteStream) {
                userVideo.current.srcObject = remoteStream;
            }
            const playVideo = async () => {
                try {
                    await userVideo.current.play();
                } catch (error) {
                    if (error.name !== "AbortError") console.error("Auto-play failed:", error);
                }
            };
            playVideo();
        }
    }, [userVideo, callAccepted, callEnded, remoteStream]);

    // Attach Local Stream (Fix for "My Mic" not moving)
    useEffect(() => {
        if (myVideo?.current && stream) {
            myVideo.current.srcObject = stream;
            const playVideo = async () => {
                try {
                    await myVideo.current.play();
                } catch (error) {
                    if (error.name !== "AbortError") console.error("Local video play failed", error);
                }
            };
            playVideo();
        }
    }, [myVideo, stream]);

    return (
        <div className="fixed inset-0 z-[100] w-full h-full bg-black flex text-white overflow-hidden">

            {/* --- REMOTE VIDEO (Full Screen Background) --- */}
            <div className="absolute inset-0 w-full h-full">
                {callAccepted && !callEnded && isVideoCall ? (
                    <video
                        playsInline
                        ref={userVideo}
                        autoPlay
                        className="w-full h-full object-cover"
                    />
                ) : (
                    /* Blurred Background for Incoming/Calling state or No Video */
                    <div className="w-full h-full relative">
                        <img
                            src={call.pic || "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg"}
                            alt="background"
                            className="w-full h-full object-cover blur-3xl opacity-50"
                        />
                        <div className="absolute inset-0 bg-black/40"></div>
                    </div>
                )}
            </div>

            {/* --- CENTER INFO (Calling / Incoming) --- */}
            {(!callAccepted || callEnded) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 animate-fade-in text-center p-4">
                    <div className="relative mb-8">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-neon-blue shadow-[0_0_40px_rgba(0,243,255,0.3)] bg-gray-900">
                            <img
                                src={call.pic || "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg"}
                                alt={call.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {/* Ripples */}
                        {!callAccepted && !callEnded && (
                            <>
                                <div className="absolute inset-0 rounded-full border-2 border-neon-blue animate-ping opacity-30 delay-100"></div>
                                <div className="absolute inset-0 rounded-full border-2 border-neon-blue animate-ping opacity-20 delay-300"></div>
                            </>
                        )}
                    </div>

                    <h2 className="text-3xl md:text-4xl font-display font-light mb-2 drop-shadow-lg">
                        {isIncoming ? "Incoming Call..." : "Calling..."}
                    </h2>
                    <p className="text-2xl md:text-3xl font-bold text-neon-blue drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]">
                        {call.name || name}
                    </p>
                </div>
            )}

            {/* --- LOCAL VIDEO (Picture in Picture - Draggable) --- */}
            {stream && isVideoCall && (
                <motion.div
                    drag
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} // We will use a ref constraint typically, or just let it float freely within window.
                    // Actually, usually we set dragConstraints to the parent container ref.
                    dragElastic={0.1}
                    dragMomentum={false}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ cursor: "grabbing" }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`absolute top-4 right-4 md:top-8 md:right-8 w-28 md:w-64 aspect-[3/4] md:aspect-video bg-gray-900 rounded-xl overflow-hidden border-2 border-neon-blue/50 shadow-2xl z-50 cursor-grab ${!callAccepted ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                >
                    <video
                        playsInline
                        muted
                        ref={myVideo}
                        autoPlay
                        className={`w-full h-full object-cover scale-x-[-1] ${!videoEnabled ? 'hidden' : ''}`}
                    />
                    {!videoEnabled && (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-600">
                                    <VideoOff size={24} />
                                </div>
                                <span className="text-xs">Camera Off</span>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Only for verifying stream audio when video is off logic, hidden audio element if needed but existing refs handle it. 
                The 'myVideo' ref handles local stream. 'userVideo' handles remote. 
            */}

            {/* --- CONTROLS --- */}
            <div className="absolute bottom-8 left-0 w-full flex justify-center items-center gap-6 z-40 px-4">

                {/* Answer/Decline Logic */}
                {!callAccepted && isIncoming ? (
                    <>
                        <button
                            onClick={answerCall}
                            className="p-5 rounded-full bg-green-500 hover:bg-green-400 text-white shadow-[0_0_20px_theme(colors.green.500)] transition-transform hover:scale-110 flex flex-col items-center gap-1"
                        >
                            <Phone size={32} fill="currentColor" />
                        </button>
                        <button
                            onClick={leaveCall}
                            className="p-5 rounded-full bg-red-500 hover:bg-red-400 text-white shadow-[0_0_20px_theme(colors.red.500)] transition-transform hover:scale-110 flex flex-col items-center gap-1"
                        >
                            <PhoneOff size={32} />
                        </button>
                    </>
                ) : (
                    /* In Call Controls */
                    <div className="flex items-center gap-4 p-4 bg-gray-900/60 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl">

                        {/* Mute Toggle */}
                        <button
                            onClick={toggleMute}
                            className={`p-4 rounded-full transition-all ${muted ? 'bg-white text-gray-900' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                            title={muted ? "Unmute" : "Mute"}
                        >
                            {muted ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>

                        {/* Camera Toggle */}
                        {isVideoCall && (
                            <button
                                onClick={toggleVideo}
                                className={`p-4 rounded-full transition-all ${!videoEnabled ? 'bg-white text-gray-900' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                                title={!videoEnabled ? "Turn Camera On" : "Turn Camera Off"}
                            >
                                {videoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
                            </button>
                        )}

                        {/* End Call */}
                        <button
                            onClick={leaveCall}
                            className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-transform hover:scale-110 ml-4"
                            title="End Call"
                        >
                            <PhoneOff size={28} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CallModal;

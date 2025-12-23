import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';

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
    isIncoming
}) => {
    const [muted, setMuted] = useState(false);

    const toggleMute = () => {
        if (stream) {
            setMuted(!muted);
            stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled;
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
        if (userVideo?.current && callAccepted) {
            userVideo.current.play().catch(e => console.error("Auto-play failed:", e));
        }
    }, [userVideo, callAccepted]);

    // Attach Local Stream (Fix for "My Mic" not moving)
    useEffect(() => {
        if (myVideo?.current && stream) {
            myVideo.current.srcObject = stream;
            myVideo.current.play().catch(e => console.error("Local Audio play failed", e));
        }
    }, [myVideo, stream]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-dark-surface border border-neon-blue/20 rounded-2xl p-8 w-full max-w-md flex flex-col items-center shadow-[0_0_30px_rgba(0,243,255,0.1)]">

                {/* Avatar / User Info */}
                <div className="relative mb-8">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-neon-blue/30 shadow-[0_0_20px_rgba(0,243,255,0.2)]">
                        <img
                            src={call.pic || "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg"}
                            alt={call.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    {/* Ripples for calling state */}
                    {!callAccepted && !callEnded && (
                        <div className="absolute inset-0 rounded-full border-2 border-neon-blue animate-ping opacity-20"></div>
                    )}
                </div>

                <h2 className="text-2xl font-display text-white mb-2">
                    {callAccepted ? "In Call with" : isIncoming ? "Incoming Call..." : "Calling..."}
                </h2>
                <p className="text-xl font-bold text-neon-blue mb-8">{call.name || name}</p>

                {/* Audio Elements - Visible for Debugging */}
                <div className="flex gap-2 opacity-50 mb-4">
                    {stream && (
                        <div>
                            <p className="text-xs text-white">My Mic</p>
                            <audio playsInline ref={myVideo} autoPlay muted controls className="w-24 h-8" />
                        </div>
                    )}
                    {callAccepted && !callEnded && (
                        <div>
                            <p className="text-xs text-white">Remote Audio</p>
                            <audio playsInline ref={userVideo} autoPlay controls className="w-24 h-8" />
                        </div>
                    )}
                </div>

                {/* Debugging / Mobile Unlock */}
                <button
                    onClick={() => {
                        if (myVideo.current) myVideo.current.play();
                        if (userVideo.current) userVideo.current.play();
                    }}
                    className="text-xs text-neon-blue underline mb-4 hover:text-white transition-colors"
                >
                    Tap here if no audio (Unlock)
                </button>

                {/* Controls */}
                <div className="flex items-center gap-6">
                    {!callAccepted && isIncoming ? (
                        <>
                            <button
                                onClick={answerCall}
                                className="p-4 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transition-transform hover:scale-110"
                            >
                                <Phone size={32} />
                            </button>
                            <button
                                onClick={leaveCall}
                                className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-transform hover:scale-110"
                            >
                                <PhoneOff size={32} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={toggleMute}
                                className={`p-4 rounded-full ${muted ? 'bg-red-500/20 text-red-500' : 'bg-gray-700 text-white'} hover:bg-opacity-80 transition-all`}
                            >
                                {muted ? <MicOff size={24} /> : <Mic size={24} />}
                            </button>
                            <button
                                onClick={leaveCall}
                                className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-transform hover:scale-110"
                            >
                                <PhoneOff size={32} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CallModal;

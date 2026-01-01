import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { ChatState } from '../Context/ChatConfig';
import { toast } from 'react-toastify';
import SideDrawer from '../Components/Chat/SideDrawer';
import MyChats from '../Components/Chat/MyChats';
import ChatBox from '../Components/Chat/ChatBox';
import CallModal from '../Components/Chat/CallModal';

const ENDPOINT = import.meta.env.VITE_SERVER_URL;
var selectedChatCompare;

const ChatPage = () => {
    const { user, selectedChat, setSelectedChat, notification, setNotification, setChats, chats, socket } = ChatState();
    const [fetchAgain, setFetchAgain] = useState(false);
    const [socketConnected, setSocketConnected] = useState(false);

    // Call State
    const [stream, setStream] = useState(null);
    const [call, setCall] = useState({});
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [name, setName] = useState('');
    const [isIncoming, setIsIncoming] = useState(false);

    const myVideo = useRef();
    const [remoteStream, setRemoteStream] = useState(null);

    const userVideo = useRef();
    const connectionRef = useRef();
    const streamRef = useRef();
    const incomingCandidates = useRef([]);

    useEffect(() => {
        if (!socket) return;
        if (socket.connected) setSocketConnected(true);

        socket.on('connect', () => {
            socket.emit('setup', user);
            setSocketConnected(true);
        });
    }, [socket, user]);

    useEffect(() => {
        if (!socket) return;
        socket.on('connected', () => setSocketConnected(true));
        socket.on('message recieved', (newMessageRecieved) => {
            if (!selectedChatCompare || selectedChatCompare._id !== newMessageRecieved.chat._id) {
                if (!notification.includes(newMessageRecieved)) {
                    setNotification([newMessageRecieved, ...notification]);
                    setFetchAgain(!fetchAgain);
                }
            }
        });

        return () => {
            socket.off("connected");
            socket.off("message recieved");
        };
    }, [socket, notification, fetchAgain, selectedChat]);

    useEffect(() => {
        if (!socket) return;

        socket.on('callUser', (data) => {
            setCall({ isReceivingCall: true, from: data.from, name: data.name, signal: data.signal, pic: data.pic, isVideo: data.isVideo });
            setIsIncoming(true);
            setCallEnded(false);
        });

        socket.on('callAccepted', (signal) => {
            setCallAccepted(true);
            if (connectionRef.current) connectionRef.current.signal(signal);
        });

        socket.on('ice-candidate', (candidate) => {
            if (connectionRef.current) {
                connectionRef.current.signal(candidate);
            } else {
                if (!incomingCandidates.current) incomingCandidates.current = [];
                incomingCandidates.current.push(candidate);
            }
        });

        socket.on('endCall', () => {
            leaveCall();
        });

        return () => {
            socket.off("callUser");
            socket.off('callAccepted');
            socket.off('ice-candidate');
            socket.off('endCall');
        };
    }, [socket]);

    useEffect(() => {
        selectedChatCompare = selectedChat;
    }, [selectedChat]);

    const getMedia = async (isVideo = false) => {
        try {
            const constraints = { audio: true, video: isVideo };
            const currentStream = await navigator.mediaDevices.getUserMedia(constraints);

            setStream(currentStream);
            streamRef.current = currentStream; // Keep ref in sync
            if (myVideo.current) myVideo.current.srcObject = currentStream;
            return currentStream;
        } catch (err) {
            console.error("Failed to get media", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDismissedError') {
                alert("Camera/Microphone access blocked. Please reset site permissions in your browser settings.");
            } else {
                alert(`Media Error: ${err.name} - ${err.message}`);
            }
            return null;
        }
    };


    const getIceServers = async () => {
        const meteredKey = import.meta.env.VITE_METERED_API_KEY;
        const meteredDomain = import.meta.env.VITE_METERED_DOMAIN;

        console.log("DEBUG: Metered Config Check");
        console.log(`Domain: '${meteredDomain}'`); 
        console.log(`Key: '${meteredKey}'`);

        if (meteredKey && meteredDomain) {
            try {
                const response = await axios.get(
                    `https://${import.meta.env.VITE_METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${import.meta.env.VITE_METERED_API_KEY}`,
                    { withCredentials: false }
                );
                return response.data;
            } catch (error) {
                console.error("Failed to fetch Metered ICE servers:", error);
            }
        }

        return [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            }
        ];
    };

    const answerCall = async () => {
        const currentStream = await getMedia(call.isVideo);
        if (!currentStream) return;

        setCallAccepted(true);
        setIsIncoming(false);

        const iceServers = await getIceServers();

        const peer = new Peer({
            initiator: false,
            trickle: true,
            stream: currentStream,
            config: { iceServers: iceServers }
        });

        // Debugging events
        peer.on('connect', () => console.log('Peer Connected!'));
        peer.on('close', () => console.log('Peer Connection Closed'));

        peer.on('signal', (data) => {
            if (data.type === 'offer' || data.type === 'answer') {
                socket.emit('answerCall', { signal: data, to: call.from });
            } else if (data.candidate) {
                socket.emit('ice-candidate', { candidate: data, to: call.from });
            }
        });

        peer.on('stream', (currentStream) => {
            setRemoteStream(currentStream);
            if (userVideo.current) userVideo.current.srcObject = currentStream;
        });

        peer.on('error', (err) => {
            console.error("Peer Error:", err);
            if (err.message && (err.message.includes('User-Initiated Abort') || err.message.includes('Close called') || err.code === 'ERR_DATA_CHANNEL')) {
                return;
            }
            toast.error("Call connection failed. Retrying...");
        });

        peer.signal(call.signal);
        connectionRef.current = peer;

        if (incomingCandidates.current && incomingCandidates.current.length > 0) {
            incomingCandidates.current.forEach(candidate => {
                peer.signal(candidate);
            });
            incomingCandidates.current = [];
        }
    };

    const startCall = async (idToCall, userName, userPic, isVideo = false) => {
        const currentStream = await getMedia(isVideo);
        if (!currentStream) return;

        setCall({ isReceivingCall: false, name: userName, pic: userPic, from: user._id, userToCall: idToCall, isVideo });
        setIsIncoming(false);
        setCallEnded(false);
        setCallAccepted(false);

        const iceServers = await getIceServers();

        const peer = new Peer({
            initiator: true,
            trickle: true,
            stream: currentStream,
            config: { iceServers: iceServers }
        });

        // Debugging events
        peer.on('connect', () => console.log('Peer Connected!'));
        peer.on('close', () => console.log('Peer Connection Closed'));

        peer.on('signal', (data) => {
            if (data.type === 'offer' || data.type === 'answer') {
                socket.emit('callUser', {
                    userToCall: idToCall,
                    signalData: data,
                    from: user._id,
                    name: user.name,
                    pic: user.pic,
                    isVideo
                });
            } else if (data.candidate) {
                socket.emit('ice-candidate', { candidate: data, to: idToCall });
            }
        });

        peer.on('stream', (currentStream) => {
            setRemoteStream(currentStream);
            if (userVideo.current) userVideo.current.srcObject = currentStream;
        });

        peer.on('error', (err) => {
            console.error("Peer Error:", err);
            // Ignore intentional close errors
            if (err.message && (err.message.includes('User-Initiated Abort') || err.message.includes('Close called') || err.code === 'ERR_DATA_CHANNEL')) {
                return;
            }
            toast.error("Call connection failed. Retrying...");
        });

        connectionRef.current = peer;
    };

    const hangUp = () => {
        const targetId = call.userToCall || call.from;
        if (targetId) socket.emit('endCall', { to: targetId });
        leaveCall();
    }

    const leaveCall = () => {
        // 1. Critical UI updates first (Force unmount)
        setCallEnded(true);
        setIsIncoming(false);
        setCallAccepted(false);
        setCall({});

        // 2. Defer heavy cleanup to allow UI to render immediately
        setTimeout(() => {
            setRemoteStream(null);

            if (connectionRef.current) {
                try {
                    connectionRef.current.destroy();
                } catch (error) {
                    console.error("Peer destroy error:", error);
                }
                connectionRef.current = null;
            }

            if (streamRef.current) {
                try {
                    streamRef.current.getTracks().forEach(track => {
                        track.stop();
                        track.enabled = false;
                    });
                } catch (error) {
                    console.error("Stream stop error:", error);
                }
                streamRef.current = null;
                setStream(null);
            }

            if (myVideo.current) myVideo.current.srcObject = null;
            if (userVideo.current) userVideo.current.srcObject = null;
            incomingCandidates.current = [];
        }, 100);
    };

    return (
        <div className='w-full h-[100dvh] flex flex-col relative'>
            {/* Background blobs for depth */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-neon-purple/10 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-neon-blue/10 rounded-full blur-[150px]"></div>
            </div>

            {(isIncoming || (call.name && !callEnded)) && (
                <CallModal
                    stream={stream}
                    remoteStream={remoteStream}
                    callAccepted={callAccepted}
                    myVideo={myVideo}
                    userVideo={userVideo}
                    callEnded={callEnded}
                    answerCall={answerCall}
                    call={call}
                    name={name}
                    leaveCall={hangUp}
                    isIncoming={isIncoming}
                />
            )}

            {user && <SideDrawer />}
            <div className='flex justify-between w-full h-[91dvh] p-4 gap-4'>
                {user && (
                    <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-[31%] h-full`}>
                        <MyChats fetchAgain={fetchAgain} />
                    </div>
                )}
                {user && (
                    <div className={`${!selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-[68%] h-full`}>
                        <ChatBox
                            fetchAgain={fetchAgain}
                            setFetchAgain={setFetchAgain}
                            socket={socket}
                            socketConnected={socketConnected}
                            startCall={startCall}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatPage;

import React, { useState, useEffect, useRef } from 'react';
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
            if (connectionRef.current) connectionRef.current.signal(candidate);
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

    const ICE_SERVERS = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        { urls: 'stun:stun.stunprotocol.org:3478' },
        { urls: 'stun:stun.framasoft.org:3478' },
    ];

    const answerCall = async () => {
        const currentStream = await getMedia(call.isVideo);
        if (!currentStream) return;

        setCallAccepted(true); // Only accept call after media is ready

        const peer = new Peer({
            initiator: false,
            trickle: true,
            stream: currentStream,
            config: { iceServers: ICE_SERVERS }
        });

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
            if (err.message && (err.message.includes('User-Initiated Abort') || err.message.includes('Close called'))) {
                return;
            }
            toast.error("Call connection failed. Please try again.");
            leaveCall();
        });

        peer.signal(call.signal);
        connectionRef.current = peer;
    };

    const startCall = async (idToCall, userName, userPic, isVideo = false) => {
        const currentStream = await getMedia(isVideo);
        if (!currentStream) return;

        setCall({ isReceivingCall: false, name: userName, pic: userPic, from: user._id, userToCall: idToCall, isVideo });
        setIsIncoming(false);
        setCallEnded(false);
        setCallAccepted(false);

        const peer = new Peer({
            initiator: true,
            trickle: true,
            stream: currentStream,
            config: { iceServers: ICE_SERVERS }
        });

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
            if (err.message && (err.message.includes('User-Initiated Abort') || err.message.includes('Close called'))) {
                return;
            }
            toast.error("Call connection failed. Please try again.");
            leaveCall();
        });

        connectionRef.current = peer;
    };

    const hangUp = () => {
        const targetId = call.userToCall || call.from;
        if (targetId) socket.emit('endCall', { to: targetId });
        leaveCall();
    }

    const leaveCall = () => {
        setCallEnded(true);
        setIsIncoming(false);
        setCallAccepted(false);
        setRemoteStream(null);

        if (connectionRef.current) {
            connectionRef.current.destroy();
            connectionRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            streamRef.current = null;
            setStream(null);
        }

        if (myVideo.current) myVideo.current.srcObject = null;
        if (userVideo.current) userVideo.current.srcObject = null;

        setCall({});
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

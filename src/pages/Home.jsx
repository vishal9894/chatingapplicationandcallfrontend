import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import CreateChatRoom from "../components/CreateChatRoom";
import CallInterface from "../components/CallInterface";
import CallModal from "../components/CallModal";

const socket = io("https://chatingapplicationandcallbackend.onrender.com");
// const socket = io("http://localhost:5000");

const Home = () => {
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callType, setCallType] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState("");
  const [callError, setCallError] = useState("");

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const bottomRef = useRef(null);

  // WebRTC configuration
  const configuration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  useEffect(() => {
    // Connection established
    socket.on("connected", (data) => {
      console.log("Connected to server:", data);
    });

    // Chat message listener
    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    // Room joined
    socket.on("room_joined", (data) => {
      console.log("Room joined:", data);
    });

    // Incoming call listener
    socket.on("incoming_call", ({ from, offer, callType, room }) => {
      console.log("Incoming call from:", from);
      setIncomingCall({ from, offer, callType, room });
      setCallStatus("Incoming call...");
    });

    // Call accepted listener
    socket.on("call_accepted", async ({ answer, from }) => {
      console.log("Call accepted by:", from);
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
          setCallStatus("Call connected");
          setIsCallActive(true);
        } catch (error) {
          console.error("Error setting remote description:", error);
          setCallError("Failed to accept call");
        }
      }
    });

    // ICE candidate listener
    socket.on("ice_candidate", async ({ candidate, from }) => {
      console.log("ICE candidate from:", from);
      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      }
    });

    // Call ended listener
    socket.on("call_ended", ({ from, reason }) => {
      console.log("Call ended by:", from, "Reason:", reason);
      endCall();
      setCallStatus(reason || "Call ended");
    });

    // Call rejected listener
    socket.on("call_rejected", ({ from, reason }) => {
      console.log("Call rejected by:", from);
      setCallStatus("Call rejected");
      endCall();
    });

    // Call failed listener
    socket.on("call_failed", ({ message }) => {
      console.log("Call failed:", message);
      setCallError(message);
      endCall();
    });

    // Call error listener
    socket.on("call_error", ({ message }) => {
      console.log("Call error:", message);
      setCallError(message);
      endCall();
    });

    // User joined/left
    socket.on("user_joined", ({ userId }) => {
      console.log("User joined:", userId);
    });

    socket.on("user_left", ({ userId }) => {
      console.log("User left:", userId);
    });

    return () => {
      socket.off("connected");
      socket.off("receive_message");
      socket.off("room_joined");
      socket.off("incoming_call");
      socket.off("call_accepted");
      socket.off("ice_candidate");
      socket.off("call_ended");
      socket.off("call_rejected");
      socket.off("call_failed");
      socket.off("call_error");
      socket.off("user_joined");
      socket.off("user_left");
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Clear call error after 5 seconds
    if (callError) {
      const timer = setTimeout(() => {
        setCallError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [callError]);

  const joinRoom = () => {
    if (room.trim()) {
      socket.emit("join_room", room);
      setJoined(true);
    }
  };

  const sendMessage = () => {
    if (!message.trim()) return;

    const data = {
      room,
      message,
      author: socket.id,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    socket.emit("send_message", data);
    setMessages((prev) => [...prev, data]);
    setMessage("");
  };

  // WebRTC Functions
  const initializeMedia = async (type) => {
    try {
      setCallStatus("Accessing camera/microphone...");
      const constraints = {
        audio: true,
        video: type === "video" ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setCallStatus("Media initialized");
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setCallError("Failed to access camera/microphone. Please check permissions.");
      return null;
    }
  };

  const createPeerConnection = async () => {
    try {
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Add local stream to connection
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream);
        });
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice_candidate", {
            room,
            candidate: event.candidate,
          });
        }
      };

      // Handle connection state
      peerConnection.onconnectionstatechange = (event) => {
        console.log("Connection state:", peerConnection.connectionState);
        switch (peerConnection.connectionState) {
          case "connected":
            setCallStatus("Connected");
            break;
          case "disconnected":
          case "failed":
            setCallStatus("Connection failed");
            endCall();
            break;
          case "closed":
            endCall();
            break;
        }
      };

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log("Received remote stream");
        const remoteStream = event.streams[0];
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setIsCallActive(true);
        setCallStatus("Call active");
      };

      return peerConnection;
    } catch (error) {
      console.error("Error creating peer connection:", error);
      setCallError("Failed to create connection");
      return null;
    }
  };

  const startCall = async (type) => {
    try {
      setCallError("");
      setCallType(type);
      setCallStatus("Starting call...");

      // Get media stream
      const stream = await initializeMedia(type);
      if (!stream) {
        return;
      }

      // Create peer connection
      const peerConnection = await createPeerConnection();
      if (!peerConnection) {
        return;
      }

      // Create and send offer
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === "video",
      });
      
      await peerConnection.setLocalDescription(offer);

      socket.emit("call_user", {
        room,
        offer,
        callType: type,
      });

      setCallStatus("Calling...");
    } catch (error) {
      console.error("Error starting call:", error);
      setCallError("Failed to start call");
      setCallStatus("Call failed");
      endCall();
    }
  };

  const answerCall = async () => {
    try {
      if (!incomingCall) return;

      setCallError("");
      setCallType(incomingCall.callType);
      setCallStatus("Answering call...");

      // Get media stream
      const stream = await initializeMedia(incomingCall.callType);
      if (!stream) {
        return;
      }

      // Create peer connection
      const peerConnection = await createPeerConnection();
      if (!peerConnection) {
        return;
      }

      // Set remote description from offer
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(incomingCall.offer)
      );

      // Create and send answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit("answer_call", {
        room,
        answer,
      });

      setIsCallActive(true);
      setIncomingCall(null);
      setCallStatus("Call connected");
    } catch (error) {
      console.error("Error answering call:", error);
      setCallError("Failed to answer call");
      setCallStatus("Answer failed");
      endCall();
    }
  };

  const rejectCall = () => {
    socket.emit("reject_call", { room });
    setIncomingCall(null);
    setCallStatus("Call rejected");
  };

  const endCall = () => {
    console.log("Ending call...");
    
    // Emit end call event
    socket.emit("end_call", { room });

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    // Clear remote stream
    setRemoteStream(null);

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Reset state
    setIsCallActive(false);
    setIncomingCall(null);
    setCallType(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setCallStatus("");
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      {/* Call Error Notification */}
      {callError && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-slideDown">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {callError}
          </div>
        </div>
      )}

      {/* Incoming Call Modal */}
      {incomingCall && !isCallActive && (
        <CallModal incomingCall={incomingCall} room={room} rejectCall={rejectCall} answerCall={answerCall} />
      )}

      {/* Call Interface */}
      <CallInterface   isCallActive={isCallActive} callType={callType} localVideoRef={localVideoRef} isMuted={isMuted} isVideoOff={isVideoOff} toggleMute={toggleMute} toggleVideo={toggleVideo} endCall={endCall} callStatus={callStatus} />

      {!joined ? (
        // Join Room UI (same as before)
       <div className="">
        <CreateChatRoom room={room} setRoom={setRoom} joinRoom={joinRoom} />
       </div>
      ) : (
        /* CHAT ROOM */
        <div className="relative w-full max-w-4xl">
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-3xl blur-xl opacity-10 animate-gradient-xy"></div>
          
          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4">
              <div className="flex flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-white font-semibold">Room: <span className="font-bold">{room}</span></h2>
                    <p className="text-white/80 text-sm">{messages.length} messages</p>
                  </div>
                </div>
                
                {/* Call Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => startCall("audio")}
                    disabled={isCallActive}
                    className="px-2 py-2 bg-green-500 text-white font-semibold rounded-full hover:bg-green-600 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    
                  </button>
                  
                  <button
                    onClick={() => startCall("video")}
                    disabled={isCallActive}
                    className="px-2 py-2 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    
                  </button>
                  
                  <button
                    onClick={() => {
                      socket.emit("end_call", { room });
                      endCall();
                      setJoined(false);
                      setMessages([]);
                    }}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-all duration-300"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Chat and Messages Container */}
            <div className="flex flex-col md:flex-row h-[500px]">
              {/* Messages Container */}
              <div className="flex-1 px-4 py-4 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-gray-100/50">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center animate-fadeIn">
                      <div className="inline-block p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mb-4">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <p className="text-gray-400">Send your first message!</p>
                      <p className="text-sm text-gray-300 mt-1">Messages will appear here</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${
                          msg.author === socket.id ? "justify-end" : "justify-start"
                        } animate-messageSlide`}
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <div className="max-w-[85%]">
                          {msg.author !== socket.id && (
                            <div className="flex items-center mb-1 ml-1">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 mr-2"></div>
                              <span className="text-xs text-gray-500">User</span>
                            </div>
                          )}
                          <div
                            className={`px-4 py-3 rounded-2xl shadow-sm ${
                              msg.author === socket.id
                                ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                                : "bg-white text-gray-800 border border-gray-100"
                            } transition-all duration-300 hover:shadow-md`}
                          >
                           <div className="flex items-center h-full gap-1">
                             <p className="text-sm w-full leading-relaxed break-words">{msg.message}</p>
                            <div className={`flex justify-between items-center text-xs ${
                              msg.author === socket.id ? "text-white/70" : "text-gray-400"
                            }`}>
                              <span className="w-14">{msg.time}</span>
                            </div>
                           </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

            </div>

            {/* Input Area */}
            <div className="border-t border-gray-100 bg-white px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur opacity-0 group-focus-within:opacity-30 transition duration-300"></div>
                  <input
                    className="relative w-full px-5 py-3 bg-gray-50 border-0 rounded-full text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-inner transition-all duration-300"
                    placeholder="Type your message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!message.trim()}
                  className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              <div className="mt-2 text-center">
                <p className="text-xs text-gray-400">Press Enter to send • Click the plane to send</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
// App.js
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaPhoneSlash,
  FaPhoneAlt,
  FaComments,
  FaSignInAlt,
  FaSignOutAlt,
  FaPaperPlane,
  FaExclamationCircle,
} from "react-icons/fa";

const socket = io("https://chatingapplicationandcallbackend.onrender.com");

const App = () => {
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

  // NEW: call duration
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef(null);

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

  // ---- Call timer helpers ----
  const startCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setCallDuration(0);
  };

  const formatCallDuration = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
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

    // Call accepted listener (caller side)
    socket.on("call_accepted", async ({ answer, from }) => {
      console.log("Call accepted by:", from);
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
          setCallStatus("Call connected");
          // Timer will start when remote track is received (ontrack)
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
      setCallStatus(reason || "Call ended");
      endCall(); // endCall will stop timer
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

      // Clear timer on unmount
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
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
        video:
          type === "video"
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : false,
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
      setCallError(
        "Failed to access camera/microphone. Please check permissions."
      );
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
      peerConnection.onconnectionstatechange = () => {
        console.log(
          "Connection state:",
          peerConnection.connectionState
        );
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
          default:
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
        setIsCallActive((prev) => {
          if (!prev) {
            startCallTimer(); // start timing when remote media is received
          }
          return true;
        });
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

      setIsCallActive(true); // timer starts on ontrack
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

    // Inform server (both local end and when remote triggers call_ended
    // will call this; server safely ignores if not in a call)
    socket.emit("end_call", { room });

    // Stop timer
    stopCallTimer();

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
            <FaExclamationCircle className="mr-2" size={18} />
            {callError}
          </div>
        </div>
      )}

      {/* Incoming Call Modal */}
      {incomingCall && !isCallActive && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full transform animate-slideDown">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                {incomingCall.callType === "video" ? (
                  <FaVideo className="text-white" size={40} />
                ) : (
                  <FaPhoneAlt className="text-white" size={40} />
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Incoming{" "}
                {incomingCall.callType === "video" ? "Video" : "Audio"} Call
              </h2>
              <p className="text-gray-600">Room: {room}</p>
              <p className="text-sm text-gray-500 mt-2">
                From: {incomingCall.from?.substring(0, 8)}...
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={rejectCall}
                className="flex-1 px-6 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                <span className="flex items-center justify-center">
                  <FaPhoneSlash className="mr-2" size={18} />
                  Decline
                </span>
              </button>
              <button
                onClick={answerCall}
                className="flex-1 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                <span className="flex items-center justify-center">
                  <FaPhoneAlt className="mr-2" size={18} />
                  Accept
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Interface */}
      {isCallActive && (
        <div className="fixed inset-0 bg-black z-40 flex flex-col">
          <div className="flex-1 relative bg-black">
            {/* Remote Video / Audio UI */}
            {callType === "video" ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <div className="flex items-center justify-center h-full">
                  <div className="text-white text-xl font-semibold">
                    Audio Call
                  </div>
                </div>
                {/* Hidden video element still used for audio stream */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="hidden"
                />
              </>
            )}

            {/* Local Video Preview */}
            {callType === "video" && (
              <div className="absolute bottom-4 right-4 w-48 h-32 rounded-xl overflow-hidden shadow-2xl border-2 border-white">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Call Controls */}
            <div className="absolute bottom-8 left-0 right-0">
              <div className="flex justify-center items-center gap-6">
                {/* Mute/Unmute */}
                <button
                  onClick={toggleMute}
                  className={`p-4 rounded-full ${
                    isMuted ? "bg-red-500" : "bg-gray-800/70"
                  } hover:scale-110 transition-all duration-300`}
                >
                  {isMuted ? (
                    <FaMicrophoneSlash className="text-white" size={22} />
                  ) : (
                    <FaMicrophone className="text-white" size={22} />
                  )}
                </button>

                {/* Video On/Off (only for video calls) */}
                {callType === "video" && (
                  <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-full ${
                      isVideoOff ? "bg-red-500" : "bg-gray-800/70"
                    } hover:scale-110 transition-all duration-300`}
                  >
                    {isVideoOff ? (
                      <FaVideoSlash className="text-white" size={22} />
                    ) : (
                      <FaVideo className="text-white" size={22} />
                    )}
                  </button>
                )}

                {/* End Call */}
                <button
                  onClick={endCall}
                  className="p-4 bg-red-500 rounded-full hover:bg-red-600 hover:scale-110 transition-all duration-300"
                >
                  <FaPhoneSlash className="text-white" size={22} />
                </button>
              </div>
            </div>

            {/* Call Status + Timer */}
            <div className="absolute top-8 left-0 right-0 text-center">
              <div className="inline-block bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full">
                <span>
                  {callStatus ||
                    (callType === "video" ? "Video Call" : "Audio Call")}
                </span>
                {isCallActive && callDuration > 0 && (
                  <span className="ml-2 text-sm text-gray-200">
                    • {formatCallDuration(callDuration)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!joined ? (
        // Join Room UI
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur-lg opacity-10 animate-pulse"></div>
          <div className="relative bg-white/95 backdrop-blur-sm w-full max-w-md p-10 rounded-2xl shadow-2xl border border-gray-100 transform transition-all duration-300 hover:scale-[1.02]">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-4 animate-bounce">
                <FaComments className="text-white" size={32} />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2 animate-slideDown">
                Join Chat Room
              </h1>
              <p className="text-gray-500">
                Enter a room ID to start chatting
              </p>
            </div>

            <div className="space-y-6">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                <input
                  className="relative w-full px-6 py-4 bg-white border-0 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm transition-all duration-300"
                  placeholder="Enter Room ID"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                />
              </div>

              <button
                onClick={joinRoom}
                disabled={!room.trim()}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow"
              >
                <span className="flex items-center justify-center">
                  <FaSignInAlt className="mr-2" size={18} />
                  Enter Chat Room
                </span>
              </button>
            </div>

            <div className="mt-8 text-center">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
                <div className="h-px w-12 bg-gray-200"></div>
                <span>Example: general-room</span>
                <div className="h-px w-12 bg-gray-200"></div>
              </div>
            </div>
          </div>
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
                    <FaComments className="text-white" size={20} />
                  </div>
                  <div>
                    <h2 className="text-white font-semibold">
                      Room: <span className="font-bold">{room}</span>
                    </h2>
                    <p className="text-white/80 text-sm">
                      {messages.length} messages
                    </p>
                  </div>
                </div>

                {/* Call Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => startCall("audio")}
                    disabled={isCallActive}
                    className="px-2 py-2 bg-green-500 text-white font-semibold rounded-full hover:bg-green-600 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                  >
                    <FaPhoneAlt size={16} />
                  </button>

                  <button
                    onClick={() => startCall("video")}
                    disabled={isCallActive}
                    className="px-2 py-2 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                  >
                    <FaVideo size={16} />
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
                    <FaSignOutAlt className="text-white" size={18} />
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
                        <FaComments
                          className="text-gray-400"
                          size={32}
                        />
                      </div>
                      <p className="text-gray-400">
                        Send your first message!
                      </p>
                      <p className="text-sm text-gray-300 mt-1">
                        Messages will appear here
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${
                          msg.author === socket.id
                            ? "justify-end"
                            : "justify-start"
                        } animate-messageSlide`}
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <div className="max-w-[85%]">
                          {msg.author !== socket.id && (
                            <div className="flex items-center mb-1 ml-1">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 mr-2"></div>
                              <span className="text-xs text-gray-500">
                                User
                              </span>
                            </div>
                          )}
                          <div
                            className={`px-4 py-3 rounded-2xl shadow-sm ${
                              msg.author === socket.id
                                ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                                : "bg-white text-gray-800 border border-gray-100"
                            } transition-all duration-300 hover:shadow-md`}
                          >
                            <div className="flex items-center h-full gap-2">
                              <p className="text-sm w-full leading-relaxed break-words">
                                {msg.message}
                              </p>
                              <div
                                className={`flex justify-between items-center text-xs ${
                                  msg.author === socket.id
                                    ? "text-white/70"
                                    : "text-gray-400"
                                }`}
                              >
                                <span className="w-14">
                                  {msg.time}
                                </span>
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
                  <FaPaperPlane size={18} />
                </button>
              </div>
              <div className="mt-2 text-center">
                <p className="text-xs text-gray-400">
                  Press Enter to send • Click the plane to send
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animations / styles */}
      <style jsx>{`
        @keyframes gradient-xy {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes messageSlide {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-gradient-xy {
          animation: gradient-xy 3s ease-in-out infinite;
          background-size: 400% 400%;
        }

        .animate-slideDown {
          animation: slideDown 0.6s ease-out;
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }

        .animate-messageSlide {
          animation: messageSlide 0.3s ease-out forwards;
          opacity: 0;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #7c3aed);
        }
      `}</style>
    </div>
  );
};

export default App;
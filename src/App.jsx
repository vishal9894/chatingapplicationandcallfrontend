import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("https://chatformobileresponsevebackend.onrender.com");

const App = () => {
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => socket.off("receive_message");
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  return (
    <div className=" h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      {!joined ? (
        /* JOIN ROOM - Enhanced with animations */
        <div className="relative">
          {/* Background decorative elements */}
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur-lg opacity-10 animate-pulse"></div>
          <div className="relative bg-white/95 backdrop-blur-sm w-full p-10 rounded-2xl shadow-2xl border border-gray-100 transform transition-all duration-300 hover:scale-[1.02]">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-4 animate-bounce">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2 animate-slideDown">
                Join Chat Room
              </h1>
              <p className="text-gray-500">Enter a room ID to start chatting</p>
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
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
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
        /* CHAT ROOM - Enhanced with animations */
        <div className="relative w-full max-w">
          {/* Animated background effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-3xl blur-xl opacity-10 animate-gradient-xy"></div>
          
          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4">
              <div className="flex items-center justify-between">
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
                <button
                  onClick={() => {
                    socket.emit("leave_room", room);
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

            {/* Messages Container */}
            <div className="h-[400px] px-4 py-4 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-gray-100/50">
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
                          className={`px-4 py-3 rounded-2xl  shadow-sm ${
                            msg.author === socket.id
                              ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                              : "bg-white text-gray-800 border border-gray-100"
                          } transition-all duration-300 hover:shadow-md`}
                        >
                         <div className=" flex  items-center h-full  gap-2">
                           <p className="text-sm addelips w-full leading-relaxed">{msg.message}</p>
                          <div className={`flex justify-between items-center  text-xs ${
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

      {/* Add custom CSS for animations */}
      <style jsx>{`
        @keyframes gradient-xy {
          0%, 100% {
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
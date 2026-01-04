import React from "react";

const CreateChatRoom = ({ room, setRoom, joinRoom }) => {
  return (
    <div>
      <div className="relative">
        {/* Background decorative elements */}
        <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur-lg opacity-10 animate-pulse"></div>
        <div className="relative bg-white/95 backdrop-blur-sm w-full max-w-md p-10 rounded-2xl shadow-2xl border border-gray-100 transform transition-all duration-300 hover:scale-[1.02]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-4 animate-bounce">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
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
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
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
    </div>
  );
};

export default CreateChatRoom;

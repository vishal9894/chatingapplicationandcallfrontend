import React from "react";

const CallInterface = ({
  isCallActive,
  callType,
  localVideoRef,
  remoteVideoRef,
  isMuted,
  isVideoOff,
  toggleMute,
  toggleVideo,
  endCall,
  callStatus
}) => {
  if (!isCallActive) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Remote Video */}
      <div className="flex-1 relative bg-black">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        
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
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072M12 6a9 9 0 010 12m4.5-15.5a13 13 0 010 19M5 8.5l5.293 5.293a1 1 0 001.414 0L17 8.5" />
                </svg>
              )}
            </button>

            {/* Video On/Off */}
            {callType === "video" && (
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full ${
                  isVideoOff ? "bg-red-500" : "bg-gray-800/70"
                } hover:scale-110 transition-all duration-300`}
              >
                {isVideoOff ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            )}

            {/* End Call */}
            <button
              onClick={endCall}
              className="p-4 bg-red-500 rounded-full hover:bg-red-600 hover:scale-110 transition-all duration-300"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Call Status */}
        <div className="absolute top-8 left-0 right-0 text-center">
          <div className="inline-block bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full">
            {callStatus || (callType === "video" ? "Video Call" : "Audio Call")}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallInterface;
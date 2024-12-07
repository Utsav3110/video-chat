import React, { useCallback, useEffect, useState } from 'react';
import { useSocket } from '../context/SocketProvider';
import peer from '../service/peer';
import { useNavigate, useParams } from 'react-router-dom';

const Room = () => {
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [incomingCall, setIncomingCall] = useState(false);
  const [callStatus, setCallStatus] = useState('idle'); // 'idle', 'calling', 'in-call'
  const socket = useSocket();
  const navigate = useNavigate();
  const { roomId } = useParams();

  const handleUserJoin = useCallback(({ email, id }) => {
    console.log(`User ${email} joined the room`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      setMyStream(stream);
      setCallStatus('calling');
      
      stream.getTracks().forEach((track) => peer.peer.addTrack(track, stream));

      const offer = await peer.getOffer();
      socket.emit('user:call', { to: remoteSocketId, offer, room: roomId });
    } catch (error) {
      console.error('Error setting up call:', error);
      setCallStatus('idle');
    }
  }, [socket, remoteSocketId, roomId]);

  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      setIncomingCall(true);
      socket.emit('call:incoming', { to: from, room: roomId });
    },
    [socket, roomId]
  );

  const handleAcceptCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      setMyStream(stream);
      setCallStatus('in-call');
      
      stream.getTracks().forEach((track) => peer.peer.addTrack(track, stream));

      const offer = await peer.getOffer();
      socket.emit('call:accepted', { 
        to: remoteSocketId, 
        ans: offer, 
        room: roomId 
      });
      
      setIncomingCall(false);
    } catch (error) {
      console.error('Error accepting call:', error);
      handleEndCall();
    }
  }, [socket, remoteSocketId, roomId]);

  const handleDeclineCall = useCallback(() => {
    socket.emit('call:declined', { 
      to: remoteSocketId, 
      room: roomId 
    });
    handleEndCall();
  }, [socket, remoteSocketId, roomId]);

  const handleEndCall = useCallback(() => {
    // Stop all tracks in my stream
    if (myStream) {
      myStream.getTracks().forEach(track => track.stop());
    }
    
    // Stop all tracks in remote stream
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }

    // Reset states
    setMyStream(null);
    setRemoteStream(null);
    setCallStatus('idle');
    setIncomingCall(false);
    setRemoteSocketId(null);

    // Close peer connection
    peer.peer.close();
    // Reinitialize peer connection
    peer.reinitializePeer();
  }, [myStream, remoteStream]);

  const handleCallAccepted = useCallback(
    async ({ ans }) => {
      await peer.setLocalDescription(ans);
      setCallStatus('in-call');
      console.log('Call accepted');
    },
    []
  );

  const handleCallDeclined = useCallback(() => {
    handleEndCall();
    alert('Call was declined');
  }, [handleEndCall]);

  const handleNegotiationNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit('peer:nego:needed', { 
      offer, 
      to: remoteSocketId, 
      room: roomId 
    });
  }, [socket, remoteSocketId, roomId]);

  const handleNegotiationIncoming = useCallback(
    async ({ from, offer }) => {
      const answer = await peer.getAnswer(offer);
      socket.emit('peer:nego:done', { 
        to: from, 
        ans: answer, 
        room: roomId 
      });
    },
    [socket, roomId]
  );

  const handleNegoFinal = useCallback(
    async ({ ans }) => {
      await peer.setLocalDescription(ans);
    },
    []
  );

  useEffect(() => {
    peer.peer.addEventListener('track', (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    });

    peer.peer.addEventListener('negotiationneeded', handleNegotiationNeeded);

    return () => {
      peer.peer.removeEventListener('track', () => {});
      peer.peer.removeEventListener('negotiationneeded', handleNegotiationNeeded);
    };
  }, [handleNegotiationNeeded]);

  useEffect(() => {
    socket.on('user:joined', handleUserJoin);
    socket.on('incoming:call', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:declined', handleCallDeclined);
    socket.on('peer:nego:needed', handleNegotiationIncoming);
    socket.on('peer:nego:final', handleNegoFinal);

    return () => {
      socket.off('user:joined', handleUserJoin);
      socket.off('incoming:call', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:declined', handleCallDeclined);
      socket.off('peer:nego:needed', handleNegotiationIncoming);
      socket.off('peer:nego:final', handleNegoFinal);
    };
  }, [
    socket,
    handleUserJoin,
    handleIncomingCall,
    handleCallAccepted,
    handleCallDeclined,
    handleNegotiationIncoming,
    handleNegoFinal,
  ]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="container mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-center">
          {remoteSocketId ? 'Connected' : 'No one in the room yet'}
        </h1>
        
        {/* Incoming Call Notification */}
        {incomingCall && (
          <div className="flex justify-center mb-4">
            <div className="bg-yellow-600 text-white px-4 py-2 rounded-md flex items-center space-x-4">
              <span>Incoming Call</span>
              <button 
                onClick={handleAcceptCall} 
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded transition duration-300"
              >
                Accept Call
              </button>
              <button 
                onClick={handleDeclineCall} 
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded transition duration-300"
              >
                Decline
              </button>
            </div>
          </div>
        )}
        
        {/* Call Controls */}
        {remoteSocketId && !incomingCall && callStatus === 'idle' && (
          <div className="flex justify-center mb-4">
            <button 
              onClick={handleCallUser} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300"
            >
              Call
            </button>
          </div>
        )}
        
        {/* Call in Progress Controls */}
        {callStatus === 'in-call' && (
          <div className="flex justify-center mb-4">
            <button 
              onClick={handleEndCall} 
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-300"
            >
              End Call
            </button>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4 text-center">My Video</h2>
            {myStream && (
              <div className="flex justify-center">
                <video
                  className="rounded-lg shadow-lg"
                  height="300"
                  width="500"
                  playsInline
                  muted
                  autoPlay
                  ref={(video) => {
                    if (video) video.srcObject = myStream;
                  }}
                />
              </div>
            )}
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4 text-center">Remote Video</h2>
            {remoteStream && (
              <div className="flex justify-center">
                <video
                  className="rounded-lg shadow-lg"
                  height="300"
                  width="500"
                  playsInline
                  autoPlay
                  ref={(video) => {
                    if (video) video.srcObject = remoteStream;
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;
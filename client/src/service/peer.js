class PeerService {
  constructor() {
    this.peer = null;
    this.stream = null;
    this.initializePeer();
  }

  initializePeer() {
    this.peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            'stun:stun.l.google.com:19302',
            'stun:global.stun.twilio.com:3478',
          ],
        },
      ],
    });

    // Clear any existing tracks
    this.peer.ontrack = null;
    this.peer.onicecandidate = null;
  }

  async getStream() {
    if (!this.stream) {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
    }
    return this.stream;
  }

  async getOffer() {
    if (!this.peer) {
      this.initializePeer();
    }

    // Clear existing tracks
    this.peer.getSenders().forEach(sender => this.peer.removeTrack(sender));

    // Add tracks from stream
    const stream = await this.getStream();
    stream.getTracks().forEach(track => {
      this.peer.addTrack(track, stream);
    });

    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(new RTCSessionDescription(offer));
    return offer;
  }

  async getAnswer(offer) {
    if (!this.peer) {
      this.initializePeer();
    }

    // Clear existing tracks
    this.peer.getSenders().forEach(sender => this.peer.removeTrack(sender));

    // Add tracks from stream
    const stream = await this.getStream();
    stream.getTracks().forEach(track => {
      this.peer.addTrack(track, stream);
    });

    await this.peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peer.createAnswer();
    await this.peer.setLocalDescription(new RTCSessionDescription(answer));
    return answer;
  }

  async setLocalDescription(answer) {
    if (this.peer) {
      try {
        await this.peer.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error setting remote description:', error);
      }
    }
  }

  // Add a method to stop all tracks
  stopTracks() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  // Add a method to reset peer connection
  resetPeerConnection() {
    this.stopTracks();
    
    if (this.peer) {
      this.peer.close();
    }
    
    this.initializePeer();
  }
}

export default new PeerService();
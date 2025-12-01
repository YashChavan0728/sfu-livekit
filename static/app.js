class LiveKitConference {
    constructor() {
        this.room = null;
        this.videoEnabled = true;
        this.audioEnabled = true;
        this.screenShare = null;
        this.participants = new Map();
        
        this.init();
    }

    init() {
        // Generate random user name if not set
        const userNameInput = document.getElementById('userName');
        if (!userNameInput.value) {
            userNameInput.value = 'User-' + Math.random().toString(36).substring(7);
        }

        // Event listeners
        document.getElementById('joinBtn').addEventListener('click', () => this.joinRoom());
        document.getElementById('leaveBtn').addEventListener('click', () => this.leaveRoom());
        document.getElementById('videoBtn').addEventListener('click', () => this.toggleVideo());
        document.getElementById('audioBtn').addEventListener('click', () => this.toggleAudio());
        document.getElementById('screenBtn').addEventListener('click', () => this.toggleScreenShare());
    }

    updateStatus(message, type = '') {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = 'status ' + type;
    }

    async joinRoom() {
        const roomName = document.getElementById('roomName').value.trim();
        const userName = document.getElementById('userName').value.trim();

        if (!roomName || !userName) {
            alert('Please enter both room name and your name');
            return;
        }

        document.getElementById('joinBtn').disabled = true;
        this.updateStatus('Connecting...', 'connecting');

        try {
            // Get access token from API
            const response = await fetch('/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    roomName: roomName,
                    identity: userName,
                    name: userName
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get access token');
            }

            const data = await response.json();
            console.log('Token received:', data);

            // Connect to LiveKit room
            await this.connectToRoom(data.url, data.token);

            // Update UI
            document.getElementById('joinBtn').style.display = 'none';
            document.getElementById('leaveBtn').style.display = 'inline-block';
            document.getElementById('mediaControls').classList.add('active');
            document.getElementById('roomInfo').classList.add('active');
            document.getElementById('currentRoom').textContent = roomName;
            
            this.updateStatus('Connected to room: ' + roomName, 'connected');

        } catch (error) {
            console.error('Error joining room:', error);
            this.updateStatus('Failed to join: ' + error.message, 'error');
            document.getElementById('joinBtn').disabled = false;
        }
    }

    async connectToRoom(url, token) {
        this.room = new LivekitClient.Room({
            adaptiveStream: true,
            dynacast: true,
            videoCaptureDefaults: {
                resolution: LivekitClient.VideoPresets.h720.resolution,
            },
        });

        // Set up event listeners
        this.room
            .on(LivekitClient.RoomEvent.TrackSubscribed, this.handleTrackSubscribed.bind(this))
            .on(LivekitClient.RoomEvent.TrackUnsubscribed, this.handleTrackUnsubscribed.bind(this))
            .on(LivekitClient.RoomEvent.ParticipantConnected, this.handleParticipantConnected.bind(this))
            .on(LivekitClient.RoomEvent.ParticipantDisconnected, this.handleParticipantDisconnected.bind(this))
            .on(LivekitClient.RoomEvent.Disconnected, this.handleDisconnected.bind(this))
            .on(LivekitClient.RoomEvent.LocalTrackPublished, this.handleLocalTrackPublished.bind(this))
            .on(LivekitClient.RoomEvent.ConnectionQualityChanged, this.handleConnectionQualityChanged.bind(this))
            .on(LivekitClient.RoomEvent.ActiveSpeakersChanged, this.handleActiveSpeakersChanged.bind(this));

        // Connect and enable camera & microphone
        await this.room.connect(url, token);
        console.log('Connected to room:', this.room.name);

        await this.room.localParticipant.enableCameraAndMicrophone();
        console.log('Camera and microphone enabled');

        // Render local participant
        this.renderParticipant(this.room.localParticipant, true);

        // Render existing participants and subscribe to their tracks
        if (this.room.remoteParticipants && this.room.remoteParticipants.size > 0) {
            this.room.remoteParticipants.forEach(participant => {
                console.log('Rendering existing participant:', participant.identity);
                this.renderParticipant(participant, false);
                
                // Subscribe to existing tracks
                participant.trackPublications.forEach(publication => {
                    if (publication.isSubscribed && publication.track) {
                        console.log('Attaching existing track:', publication.kind, participant.identity);
                        this.attachTrackToParticipant(publication.track, participant);
                    }
                });
            });
        }

        this.updateParticipantCount();
    }

    handleTrackSubscribed(track, publication, participant) {
        console.log('Track subscribed:', track.kind, participant.identity);
        this.attachTrackToParticipant(track, participant);
    }

    handleTrackUnsubscribed(track, publication, participant) {
        console.log('Track unsubscribed:', track.kind, participant.identity);
        track.detach();
    }

    handleParticipantConnected(participant) {
        console.log('Participant connected:', participant.identity);
        this.renderParticipant(participant, false);
        this.updateParticipantCount();
    }

    handleParticipantDisconnected(participant) {
        console.log('Participant disconnected:', participant.identity);
        this.removeParticipant(participant.identity);
        this.updateParticipantCount();
    }

    handleDisconnected() {
        console.log('Disconnected from room');
        this.updateStatus('Disconnected from room', 'error');
        this.cleanup();
    }

    handleLocalTrackPublished(publication, participant) {
        console.log('Local track published:', publication.kind);
    }

    handleConnectionQualityChanged(quality, participant) {
        this.updateConnectionQuality(participant.identity, quality);
    }

    handleActiveSpeakersChanged(speakers) {
        // Reset all speaking indicators
        document.querySelectorAll('.audio-indicator').forEach(el => {
            el.classList.remove('speaking');
        });

        // Highlight active speakers
        speakers.forEach(speaker => {
            const indicator = document.querySelector(`[data-participant="${speaker.identity}"] .audio-indicator`);
            if (indicator) {
                indicator.classList.add('speaking');
            }
        });
    }

    renderParticipant(participant, isLocal = false) {
        const existingElement = document.querySelector(`[data-participant="${participant.identity}"]`);
        if (existingElement) {
            console.log('Participant already rendered:', participant.identity);
            return; // Already rendered
        }

        const participantDiv = document.createElement('div');
        participantDiv.className = 'participant' + (isLocal ? ' local' : '');
        participantDiv.setAttribute('data-participant', participant.identity);

        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true; // Always mute video element (audio handled separately)

        const info = document.createElement('div');
        info.className = 'participant-info';
        info.innerHTML = `
            <div>
                <span class="participant-name">${participant.name || participant.identity}</span>
                <span class="audio-indicator">🎤</span>
                ${isLocal ? '<span style="opacity: 0.7;"> (You)</span>' : ''}
            </div>
            <div class="connection-quality" data-quality="excellent">
                <div class="quality-bar active"></div>
                <div class="quality-bar active"></div>
                <div class="quality-bar active"></div>
            </div>
        `;

        participantDiv.appendChild(video);
        participantDiv.appendChild(info);
        document.getElementById('videoGrid').appendChild(participantDiv);

        this.participants.set(participant.identity, { element: participantDiv, video: video });

        // Attach existing tracks (for initial render)
        participant.videoTracks.forEach(publication => {
            if (publication.track && publication.isSubscribed) {
                console.log('Attaching video track for:', participant.identity);
                publication.track.attach(video);
            }
        });

        participant.audioTracks.forEach(publication => {
            if (publication.track && publication.isSubscribed && !isLocal) {
                console.log('Attaching audio track for:', participant.identity);
                const audioElement = publication.track.attach();
                if (audioElement) {
                    audioElement.volume = 1.0; // Ensure full volume
                    audioElement.autoplay = true;
                }
            }
        });
    }

    attachTrackToParticipant(track, participant) {
        // Check if this is a local participant (to avoid echo)
        const isLocal = this.room && participant.sid === this.room.localParticipant.sid;
        
        if (isLocal && track.kind === 'audio') {
            console.log('Skipping local audio track to prevent echo');
            return; // Never attach local audio
        }

        const participantData = this.participants.get(participant.identity);
        if (!participantData) {
            console.warn('Participant element not found for:', participant.identity);
            // Render the participant if not found
            const isLocalParticipant = this.room && participant.sid === this.room.localParticipant.sid;
            this.renderParticipant(participant, isLocalParticipant);
            // Try again after rendering
            setTimeout(() => this.attachTrackToParticipant(track, participant), 100);
            return;
        }

        if (track.kind === 'video') {
            console.log('Attaching video track to element for:', participant.identity);
            track.attach(participantData.video);
        } else if (track.kind === 'audio') {
            console.log('Attaching audio track for:', participant.identity);
            const audioElement = track.attach();
            if (audioElement) {
                audioElement.volume = 1.0; // Ensure full volume
                audioElement.autoplay = true;
            }
        }
    }

    removeParticipant(identity) {
        const participantData = this.participants.get(identity);
        if (participantData) {
            participantData.element.remove();
            this.participants.delete(identity);
        }
    }

    updateParticipantCount() {
        const count = this.room ? this.room.numParticipants : 0;
        document.getElementById('participantCount').textContent = count;
    }

    updateConnectionQuality(identity, quality) {
        const qualityDiv = document.querySelector(`[data-participant="${identity}"] .connection-quality`);
        if (!qualityDiv) return;

        qualityDiv.setAttribute('data-quality', quality);
        const bars = qualityDiv.querySelectorAll('.quality-bar');
        
        let activeBars = 0;
        switch (quality) {
            case LivekitClient.ConnectionQuality.Excellent:
                activeBars = 3;
                break;
            case LivekitClient.ConnectionQuality.Good:
                activeBars = 2;
                break;
            case LivekitClient.ConnectionQuality.Poor:
                activeBars = 1;
                break;
            default:
                activeBars = 0;
        }

        bars.forEach((bar, index) => {
            if (index < activeBars) {
                bar.classList.add('active');
            } else {
                bar.classList.remove('active');
            }
        });
    }

    async toggleVideo() {
        if (!this.room) return;

        const btn = document.getElementById('videoBtn');
        this.videoEnabled = !this.videoEnabled;

        await this.room.localParticipant.setCameraEnabled(this.videoEnabled);

        btn.textContent = this.videoEnabled ? '🎥 Video On' : '📹 Video Off';
        btn.className = this.videoEnabled ? 'btn-video on' : 'btn-video off';
        
        console.log('Video toggled:', this.videoEnabled);
    }

    async toggleAudio() {
        if (!this.room) return;

        const btn = document.getElementById('audioBtn');
        this.audioEnabled = !this.audioEnabled;

        await this.room.localParticipant.setMicrophoneEnabled(this.audioEnabled);

        btn.textContent = this.audioEnabled ? '🎤 Audio On' : '🔇 Audio Off';
        btn.className = this.audioEnabled ? 'btn-audio on' : 'btn-audio off';
        
        console.log('Audio toggled:', this.audioEnabled);
    }

    async toggleScreenShare() {
        if (!this.room) return;

        const btn = document.getElementById('screenBtn');

        // Check if screen sharing is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            alert('Screen sharing is not supported. Please use:\n' +
                  '• HTTPS connection, or\n' +
                  '• Access via localhost/127.0.0.1\n\n' +
                  'Current URL: ' + window.location.href);
            return;
        }

        try {
            if (!this.screenShare) {
                // Start screen share
                await this.room.localParticipant.setScreenShareEnabled(true);
                this.screenShare = true;
                btn.textContent = '🛑 Stop Sharing';
                btn.style.background = '#ef4444';
                console.log('Screen share started');
            } else {
                // Stop screen share
                await this.room.localParticipant.setScreenShareEnabled(false);
                this.screenShare = false;
                btn.textContent = '📺 Share Screen';
                btn.style.background = '#f59e0b';
                console.log('Screen share stopped');
            }
        } catch (error) {
            console.error('Screen share error:', error);
            let errorMessage = 'Screen sharing failed: ' + error.message;
            
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Screen sharing permission denied. Please allow screen sharing when prompted.';
            } else if (error.message.includes('getDisplayMedia')) {
                errorMessage = 'Screen sharing requires HTTPS or localhost access.\n' +
                              'Current URL: ' + window.location.href + '\n\n' +
                              'Try accessing via: http://localhost:3000';
            }
            
            alert(errorMessage);
        }
    }

    async leaveRoom() {
        if (this.room) {
            // Detach all tracks before disconnecting
            this.participants.forEach((data, identity) => {
                if (data.video) {
                    const tracks = data.video.srcObject?.getTracks();
                    if (tracks) {
                        tracks.forEach(track => track.stop());
                    }
                }
            });
            
            await this.room.disconnect();
            console.log('Left room');
        }
        this.cleanup();
    }

    cleanup() {
        // Clear video grid
        document.getElementById('videoGrid').innerHTML = '';
        this.participants.clear();
        
        // Clear room reference
        this.room = null;

        // Reset UI
        document.getElementById('joinBtn').style.display = 'inline-block';
        document.getElementById('joinBtn').disabled = false;
        document.getElementById('leaveBtn').style.display = 'none';
        document.getElementById('mediaControls').classList.remove('active');
        document.getElementById('roomInfo').classList.remove('active');
        
        // Reset buttons
        const videoBtn = document.getElementById('videoBtn');
        videoBtn.textContent = '🎥 Video On';
        videoBtn.className = 'btn-video on';
        
        const audioBtn = document.getElementById('audioBtn');
        audioBtn.textContent = '🎤 Audio On';
        audioBtn.className = 'btn-audio on';
        
        const screenBtn = document.getElementById('screenBtn');
        screenBtn.textContent = '📺 Share Screen';
        screenBtn.style.background = '#f59e0b';

        this.videoEnabled = true;
        this.audioEnabled = true;
        this.screenShare = false;

        this.updateStatus('', '');
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new LiveKitConference();
});

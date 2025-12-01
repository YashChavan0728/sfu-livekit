# LiveKit Production Video Conferencing

A production-ready video conferencing solution using LiveKit with Go backend and JavaScript/Flutter clients.

## 🚀 Features

✅ **Multi-user video conferencing** - Unlimited participants per room
✅ **Real-time audio & video** - High-quality WebRTC streams
✅ **Screen sharing** - Share your screen with participants
✅ **Connection quality indicators** - Real-time network quality monitoring
✅ **Active speaker detection** - Visual indicators for who's speaking
✅ **Adaptive streaming** - Automatic quality adjustment based on bandwidth
✅ **Token-based authentication** - Secure room access
✅ **Room management** - Create/join multiple rooms
✅ **Production-ready** - Scalable architecture with LiveKit

## 📋 Prerequisites

- **Go 1.21+** - For API server
- **LiveKit Server** - Download from https://github.com/livekit/livekit/releases
- **Modern browser** - Chrome, Firefox, Edge, or Safari

## 🛠️ Installation & Setup

### Step 1: Download LiveKit Server

**Windows:**
```powershell
# Download from: https://github.com/livekit/livekit/releases
# Extract livekit-server.exe to this directory
```

**Or use Docker:**
```powershell
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp -p 50000-60000:50000-60000/udp -v ${PWD}/config.yaml:/livekit.yaml livekit/livekit-server --config /livekit.yaml
```

### Step 2: Configure Environment

```powershell
# Copy example env file
copy .env.example .env

# Edit .env with your settings (defaults work for local testing)
```

### Step 3: Install Go Dependencies

```powershell
cd c:\Yash\GoWorkSpace\totalHer\testing\videoConferencing\livekit
go mod download
```

### Step 4: Start LiveKit Server

**Option A: Local Binary**
```powershell
# Start LiveKit server in a terminal
.\livekit-server.exe --config config.yaml
```

**Option B: Docker**
```powershell
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp livekit/livekit-server --dev
```

You should see:
```
INFO    starting livekit server    {"version": "..."}
INFO    WebRTC config              {"portTCP": 7881, "portUDP": 7882}
```

### Step 5: Start API Server

```powershell
# In a new terminal, run the Go API server
go run main.go
```

You should see:
```
API Server starting on http://localhost:3000
LiveKit URL: ws://localhost:7880
```

### Step 6: Open the Web Client

Navigate to: **http://localhost:3000**

## 🎮 Usage

### Web Client (Testing)

1. Open `http://localhost:3000` in your browser
2. Enter a **Room Name** (e.g., "test-room")
3. Enter your **Name**
4. Click **Join Room**
5. Grant camera/microphone permissions
6. Open the same URL in another tab/browser to test multi-user

### Controls

- **🎥 Video On/Off** - Toggle your camera
- **🎤 Audio On/Off** - Toggle your microphone
- **📺 Share Screen** - Share your screen with others
- **Leave Room** - Disconnect from the conference

### Flutter Integration (Production)

Add to `pubspec.yaml`:
```yaml
dependencies:
  livekit_client: ^2.0.0
```

Example Flutter code:
```dart
import 'package:livekit_client/livekit_client.dart';

// Get token from your API server
final response = await http.post(
  Uri.parse('https://your-api.com/token'),
  body: json.encode({
    'roomName': 'test-room',
    'identity': 'user123',
    'name': 'John Doe'
  }),
);

final data = json.decode(response.body);

// Connect to LiveKit room
final room = Room();
await room.connect(data['url'], data['token']);

// Enable camera and microphone
await room.localParticipant?.setCameraEnabled(true);
await room.localParticipant?.setMicrophoneEnabled(true);

// Listen to events
room.addListener(() {
  // Handle room events
});
```

## 🏗️ Architecture

```
┌─────────────┐
│   Flutter   │ ←→ WebSocket + WebRTC
│   Client    │
└─────────────┘
       ↓
┌─────────────┐
│  API Server │ ←→ Token Generation
│   (Go)      │
└─────────────┘
       ↓
┌─────────────┐
│  LiveKit    │ ←→ SFU Media Routing
│   Server    │     STUN/TURN built-in
└─────────────┘
```

## 📁 Project Structure

```
livekit/
├── main.go              # API server (token generation)
├── config.yaml          # LiveKit server configuration
├── .env.example         # Environment variables template
├── go.mod               # Go dependencies
└── static/
    ├── index.html       # Web client UI
    └── app.js           # LiveKit client logic
```

## 🔐 Security & Production Deployment

### 1. Change Default Keys

Edit `config.yaml` and `.env`:
```yaml
keys:
  your-api-key: your-secret-key-here
```

### 2. Use HTTPS/WSS

Update `.env`:
```
LIVEKIT_URL=wss://your-domain.com
```

### 3. Deploy LiveKit Server

**Recommended: Use LiveKit Cloud** (easiest)
- Sign up at https://livekit.io/cloud
- Get your credentials
- Update `.env` with cloud URL and keys

**Or Self-Host:**
```bash
# Deploy to your VPS/cloud
# Ensure ports are open: 7880, 7881, 7882, 50000-60000
# Use a reverse proxy (nginx) for HTTPS
```

### 4. Deploy API Server

```bash
# Build for production
go build -o api-server main.go

# Run with environment variables
export LIVEKIT_URL=wss://your-domain.com
export LIVEKIT_API_KEY=your-key
export LIVEKIT_API_SECRET=your-secret
./api-server
```

### 5. CORS Configuration

Update `main.go` for production:
```go
AllowedOrigins: []string{"https://your-domain.com"},
```

## 🌐 Using with Ngrok (Testing)

```powershell
# Terminal 1: LiveKit Server
livekit-server.exe --dev

# Terminal 2: API Server
go run main.go

# Terminal 3: Ngrok
ngrok http 3000
```

Share the ngrok URL with others for remote testing!

## 🔧 Troubleshooting

**"Failed to get access token"**
- Ensure API server is running on port 3000
- Check browser console for errors

**"Connection failed"**
- Ensure LiveKit server is running on port 7880
- Check firewall settings
- Verify WebSocket connection (not HTTP/HTTPS mismatch)

**"No video/audio"**
- Grant browser permissions for camera/microphone
- Check if devices are available
- Try in a different browser

**"Can't connect from remote location"**
- Use ngrok or deploy with HTTPS
- Ensure TURN servers are configured
- Check firewall/NAT settings

## 📊 Monitoring

LiveKit provides built-in monitoring at: `http://localhost:7880/debug/pprof/`

## 🔗 Useful Links

- **LiveKit Docs**: https://docs.livekit.io/
- **Flutter SDK**: https://pub.dev/packages/livekit_client
- **LiveKit Cloud**: https://livekit.io/cloud
- **GitHub**: https://github.com/livekit

## 📝 API Endpoints

### POST /token
Generate access token for a room

**Request:**
```json
{
  "roomName": "test-room",
  "identity": "user123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "url": "ws://localhost:7880",
  "roomName": "test-room",
  "identity": "user123"
}
```

### GET /health
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "time": "2025-12-01T12:00:00Z"
}
```

## 🚦 Next Steps for Production

1. ✅ Set up LiveKit Cloud or self-hosted server with HTTPS
2. ✅ Implement user authentication (JWT, OAuth)
3. ✅ Add database for room management
4. ✅ Implement room permissions/roles
5. ✅ Add recording capabilities
6. ✅ Set up monitoring and logging
7. ✅ Configure CDN for static files
8. ✅ Implement rate limiting
9. ✅ Add chat/messaging
10. ✅ Deploy Flutter app with proper credentials

## 📄 License

This is a demo/production starter template for educational purposes.

---

**Built with ❤️ using LiveKit** - The open-source WebRTC infrastructure platform

package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/livekit/protocol/auth"
	"github.com/rs/cors"
)

type TokenRequest struct {
	RoomName string `json:"roomName"`
	Identity string `json:"identity"`
	Name     string `json:"name,omitempty"`
}

type TokenResponse struct {
	Token    string `json:"token"`
	URL      string `json:"url"`
	RoomName string `json:"roomName"`
	Identity string `json:"identity"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

var (
	livekitURL       string
	livekitAPIKey    string
	livekitAPISecret string
)

func main() {
	// Load environment variables
	godotenv.Load()
	loadEnv()

	router := mux.NewRouter()

	// API endpoints
	router.HandleFunc("/token", generateTokenHandler).Methods("POST")
	router.HandleFunc("/health", healthCheckHandler).Methods("GET")

	// Serve static files
	router.PathPrefix("/").Handler(http.FileServer(http.Dir("./static")))

	// CORS middleware
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	handler := c.Handler(router)

	port := os.Getenv("API_PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("API Server starting on http://localhost:%s", port)
	log.Printf("LiveKit URL: %s", livekitURL)

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal("Server failed:", err)
	}
}

func loadEnv() {
	livekitURL = getEnv("LIVEKIT_URL", "ws://localhost:7880")
	livekitAPIKey = getEnv("LIVEKIT_API_KEY", "devkey")
	livekitAPISecret = getEnv("LIVEKIT_API_SECRET", "APIsecretkey123")
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

func generateTokenHandler(w http.ResponseWriter, r *http.Request) {
	var req TokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate request
	if req.RoomName == "" || req.Identity == "" {
		respondWithError(w, http.StatusBadRequest, "roomName and identity are required")
		return
	}

	// Generate token
	token, err := generateAccessToken(req.RoomName, req.Identity, req.Name)
	if err != nil {
		log.Printf("Error generating token: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	response := TokenResponse{
		Token:    token,
		URL:      livekitURL,
		RoomName: req.RoomName,
		Identity: req.Identity,
	}

	respondWithJSON(w, http.StatusOK, response)
}

func generateAccessToken(roomName, identity, name string) (string, error) {
	at := auth.NewAccessToken(livekitAPIKey, livekitAPISecret)

	canPublish := true
	canSubscribe := true

	grant := &auth.VideoGrant{
		RoomJoin:     true,
		Room:         roomName,
		CanPublish:   &canPublish,
		CanSubscribe: &canSubscribe,
	}

	at.AddGrant(grant).
		SetIdentity(identity).
		SetValidFor(24 * time.Hour) // Token valid for 24 hours

	if name != "" {
		at.SetName(name)
	}

	return at.ToJWT()
}

func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	respondWithJSON(w, http.StatusOK, map[string]string{
		"status": "ok",
		"time":   time.Now().Format(time.RFC3339),
	})
}

func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(payload)
}

func respondWithError(w http.ResponseWriter, code int, message string) {
	respondWithJSON(w, code, ErrorResponse{Error: message})
}

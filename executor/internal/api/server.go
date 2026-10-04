// Package api expone el ejecutor en la red interna. Nunca acepta imágenes ni límites.
package api

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"taller/executor/internal/sandbox"
)

type Executor interface {
	Execute(ctx context.Context, language string, program []byte) (sandbox.Result, error)
}

type Server struct {
	Token      string
	Exec       Executor
	Slots      chan struct{} // semáforo: su capacidad es la concurrencia máxima
	MaxBody    int64
	MaxProgram int
	QueueWait  time.Duration
	Languages  map[string]bool
}

type runRequest struct {
	Language string `json:"language"`
	Program  string `json:"program"`
}

// Handler arma las rutas. Hace panic ante una configuración insegura: un token corto o un
// semáforo sin lugares son errores de programación, no de un pedido.
func (s *Server) Handler() http.Handler {
	if len(s.Token) < 32 {
		panic("api: el token debe tener al menos 32 bytes")
	}
	if cap(s.Slots) == 0 {
		panic("api: Slots necesita al menos un lugar")
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("POST /v1/run", s.requireToken(s.run))
	return mux
}

func (s *Server) requireToken(next http.HandlerFunc) http.HandlerFunc {
	expected := []byte("Bearer " + s.Token)
	return func(w http.ResponseWriter, r *http.Request) {
		if subtle.ConstantTimeCompare([]byte(r.Header.Get("Authorization")), expected) != 1 {
			w.Header().Set("WWW-Authenticate", "Bearer")
			writeError(w, http.StatusUnauthorized, "token inválido")
			return
		}
		next(w, r)
	}
}

func (s *Server) run(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, s.MaxBody)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	var req runRequest
	if err := decoder.Decode(&req); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			writeError(w, http.StatusRequestEntityTooLarge, "programa demasiado grande")
			return
		}
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	// Un solo objeto y nada más: leer hasta el EOF también deja que Go detecte si el cliente se fue.
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			writeError(w, http.StatusRequestEntityTooLarge, "programa demasiado grande")
			return
		}
		writeError(w, http.StatusBadRequest, "JSON inválido: hay datos después del objeto")
		return
	}
	switch {
	case !s.Languages[req.Language]:
		writeError(w, http.StatusBadRequest, "lenguaje no soportado")
		return
	case strings.TrimSpace(req.Program) == "":
		writeError(w, http.StatusBadRequest, "programa vacío")
		return
	case len(req.Program) > s.MaxProgram:
		writeError(w, http.StatusRequestEntityTooLarge, "programa demasiado grande")
		return
	}

	wait, cancel := context.WithTimeout(r.Context(), s.QueueWait)
	defer cancel()
	select {
	case s.Slots <- struct{}{}:
		defer func() { <-s.Slots }()
	case <-wait.Done():
		// Nada corrió todavía: el llamador puede reintentar sin repetir una ejecución. Si el
		// pedido se canceló (el ejecutor se apaga), también se responde: con el cliente ya ido no
		// tiene efecto, y sin respuesta net/http mandaría un 200 vacío.
		w.Header().Set("Retry-After", "1")
		message := "ejecutor ocupado"
		if r.Context().Err() != nil {
			message = "el ejecutor se está apagando"
		}
		writeError(w, http.StatusServiceUnavailable, message)
		return
	}

	result, err := s.Exec.Execute(r.Context(), req.Language, []byte(req.Program))
	if err != nil {
		// 500 y no 503: el programa pudo haber llegado a correr, así que no se reintenta solo.
		// Vale también si el pedido se canceló (cliente que se fue o apagado del ejecutor).
		if r.Context().Err() != nil {
			log.Printf("ejecución cancelada (cliente que se fue o apagado): %v", err)
		} else {
			log.Printf("ejecución fallida: %v", err)
		}
		writeError(w, http.StatusInternalServerError, "no se pudo ejecutar en el sandbox")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

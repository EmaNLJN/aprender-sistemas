// Package output acota lo que un programa del alumno puede imprimir.
package output

import (
	"strings"
	"sync"
)

// Limited guarda hasta Max bytes y descarta el resto sin bloquear al escritor: el programa
// puede imprimir sin fin y el contenedor no debe quedar trabado esperando que leamos.
type Limited struct {
	Max       int
	mu        sync.Mutex
	buf       []byte
	truncated bool
}

func (l *Limited) Write(p []byte) (int, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	room := l.Max - len(l.buf)
	switch {
	case len(p) <= room:
		l.buf = append(l.buf, p...)
	case room > 0:
		l.buf = append(l.buf, p[:room]...)
		l.truncated = true
	case len(p) > 0:
		l.truncated = true
	}
	return len(p), nil
}

// String devuelve lo guardado como UTF-8 válido: un carácter cortado por el tope o bytes
// inválidos se reemplazan por U+FFFD, así el JSON de la respuesta nunca se rompe.
func (l *Limited) String() string {
	l.mu.Lock()
	defer l.mu.Unlock()
	return strings.ToValidUTF8(string(l.buf), "�")
}

func (l *Limited) Truncated() bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.truncated
}

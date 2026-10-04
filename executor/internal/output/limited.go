// Package output acota lo que un programa del alumno puede imprimir.
package output

import (
	"strings"
	"sync"
	"unicode/utf8"
)

// Limited guarda hasta Max bytes y descarta el resto sin bloquear al escritor: el programa
// puede imprimir sin fin y el contenedor no debe quedar trabado esperando que leamos.
type Limited struct {
	Max       int
	mu        sync.Mutex
	buf       []byte
	truncated bool
}

// Write guarda lo que entra hasta el tope y descarta el resto. Siempre informa que aceptó
// todo, sin error, para que el programa nunca se trabe ni falle por escribir de más.
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

// String devuelve lo guardado como UTF-8 válido. Si el tope cortó un carácter por la mitad,
// lo quita entero; los bytes inválidos que imprimió el programa se reemplazan por U+FFFD.
// Con salida UTF-8 válida el resultado nunca supera Max bytes; con bytes inválidos puede
// crecer hasta el triple, porque cada reemplazo ocupa 3 bytes.
func (l *Limited) String() string {
	l.mu.Lock()
	defer l.mu.Unlock()
	kept := l.buf
	if l.truncated {
		kept = withoutCutRune(kept)
	}
	return strings.ToValidUTF8(string(kept), "\uFFFD")
}

// Truncated informa si se descartó algún byte por el tope.
func (l *Limited) Truncated() bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.truncated
}

// withoutCutRune quita del final los bytes de un carácter incompleto. Sólo se usa si hubo
// truncado: ahí el final del buffer es el punto de corte y no algo que imprimió el programa.
func withoutCutRune(b []byte) []byte {
	// Un carácter UTF-8 ocupa hasta utf8.UTFMax bytes: alcanza con mirar los últimos.
	for i := len(b) - 1; i >= 0 && i >= len(b)-utf8.UTFMax; i-- {
		if !utf8.RuneStart(b[i]) {
			continue
		}
		if utf8.FullRune(b[i:]) {
			return b
		}
		return b[:i]
	}
	return b
}

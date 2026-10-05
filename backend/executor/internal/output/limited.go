package output

import (
	"strings"
	"sync"
	"unicode/utf8"
)

type Limited struct {
	Max       int
	mu        sync.Mutex
	buf       []byte
	truncated bool
}

// Write never fails or blocks: a program that prints forever must not stall the container.
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

// String can exceed Max up to double when the program prints invalid bytes: each run of them
// becomes a 3-byte U+FFFD.
func (l *Limited) String() string {
	l.mu.Lock()
	defer l.mu.Unlock()
	kept := l.buf
	if l.truncated {
		kept = withoutCutRune(kept)
	}
	return strings.ToValidUTF8(string(kept), "\uFFFD")
}

func (l *Limited) Truncated() bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.truncated
}

func withoutCutRune(b []byte) []byte {
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

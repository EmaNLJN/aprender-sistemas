// Package output bounds what a student's program can print.
package output

import (
	"strings"
	"sync"
	"unicode/utf8"
)

// Limited keeps up to Max bytes and discards the rest without blocking the writer: the program
// may print forever and the container must not stall waiting for us to read.
type Limited struct {
	Max       int
	mu        sync.Mutex
	buf       []byte
	truncated bool
}

// Write always reports that it accepted everything, without error, so the program never stalls
// or fails for writing too much.
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

// String returns what was kept as valid UTF-8. If the cap cut a character in half, it drops it
// whole; invalid bytes the program printed are replaced by U+FFFD. With valid UTF-8 output the
// result never exceeds Max bytes; with invalid bytes it can grow up to double: each run of
// invalid bytes becomes a 3-byte U+FFFD, and the worst case alternates an invalid byte with a
// valid one.
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

// withoutCutRune drops the trailing bytes of an incomplete character. It is only used after
// truncation: then the buffer end is the cut point, not something the program printed.
func withoutCutRune(b []byte) []byte {
	// A UTF-8 character takes up to utf8.UTFMax bytes: looking at the last ones is enough.
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

package output

import (
	"encoding/json"
	"strings"
	"testing"
	"unicode/utf8"
)

func TestLimitedKeepsEverythingUnderTheCap(t *testing.T) {
	l := &Limited{Max: 10}
	n, err := l.Write([]byte("hola"))
	if n != 4 || err != nil {
		t.Fatalf("Write = %d, %v; quiero 4, nil", n, err)
	}
	if l.String() != "hola" || l.Truncated() {
		t.Fatalf("String = %q, Truncated = %v", l.String(), l.Truncated())
	}
}

func TestLimitedCutsAtTheCapWithoutBlockingTheWriter(t *testing.T) {
	l := &Limited{Max: 5}
	l.Write([]byte("abc"))
	n, err := l.Write([]byte("defgh"))
	if n != 5 || err != nil {
		t.Fatalf("Write debe aceptar todo sin error para no trabar al programa: %d, %v", n, err)
	}
	if got := l.String(); got != "abcde" {
		t.Fatalf("String = %q; quiero %q", got, "abcde")
	}
	if !l.Truncated() {
		t.Fatal("Truncated = false; quiero true")
	}
	if n, err := l.Write([]byte("más")); n != len("más") || err != nil {
		t.Fatalf("después del tope Write sigue aceptando: %d, %v", n, err)
	}
	if got := l.String(); got != "abcde" {
		t.Fatalf("después del tope no se guarda nada más: %q", got)
	}
}

func TestLimitedNeverReturnsInvalidUTF8(t *testing.T) {
	l := &Limited{Max: 2}
	l.Write([]byte("añb")) // "ñ" ocupa 2 bytes: el tope cae en el medio del carácter
	got := l.String()
	if !utf8.ValidString(got) {
		t.Fatalf("String = %q no es UTF-8 válido", got)
	}
	if !strings.HasPrefix(got, "a") {
		t.Fatalf("se perdió el prefijo válido: %q", got)
	}
	if _, err := json.Marshal(got); err != nil {
		t.Fatal(err)
	}
}

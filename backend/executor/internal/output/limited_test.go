package output

import "testing"

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

func TestLimitedMarksTruncationOnlyWhenSomethingIsDropped(t *testing.T) {
	l := &Limited{Max: 5}
	l.Write([]byte("abcde"))
	if l.Truncated() {
		t.Fatal("llenar justo el tope no es truncar: Truncated = true")
	}
	l.Write([]byte("f"))
	if !l.Truncated() {
		t.Fatal("con el buffer lleno, descartar un byte debe marcar Truncated")
	}
	if got := l.String(); got != "abcde" {
		t.Fatalf("String = %q; quiero %q", got, "abcde")
	}
}

func TestLimitedDropsACharacterCutByTheCap(t *testing.T) {
	cases := []struct {
		name  string
		max   int
		input string
		want  string
	}{
		// a(1) ñ(2) ñ(2) o(1): el tope de 4 bytes deja sólo el primer byte de la segunda "ñ".
		{"ñ cortada tras su primer byte", 4, "añño", "añ"},
		// "€" ocupa 3 bytes: el tope de 3 deja la "a" y dos bytes del "€".
		{"€ cortado tras su segundo byte", 3, "a€", "a"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			l := &Limited{Max: c.max}
			l.Write([]byte(c.input))
			if got := l.String(); got != c.want || !l.Truncated() {
				t.Fatalf("String = %q, Truncated = %v; quiero %q y true, sin un U+FFFD que el programa no imprimió",
					got, l.Truncated(), c.want)
			}
		})
	}
}

func TestLimitedKeepsACompleteCharacterAtTheCap(t *testing.T) {
	l := &Limited{Max: 3}
	l.Write([]byte("añb")) // "añ" ocupa justo 3 bytes: el corte cae entre dos caracteres
	if got := l.String(); got != "añ" {
		t.Fatalf("String = %q; quiero %q", got, "añ")
	}
}

func TestLimitedReplacesInvalidBytesFromTheProgram(t *testing.T) {
	l := &Limited{Max: 10}
	l.Write([]byte("a\xffb"))
	if got := l.String(); got != "a\uFFFDb" {
		t.Fatalf("String = %q; quiero %q", got, "a\uFFFDb")
	}
	if l.Truncated() {
		t.Fatal("no se descartó nada: Truncated debe ser false")
	}
}

package output

import "testing"

func TestLimitedKeepsEverythingUnderTheCap(t *testing.T) {
	l := &Limited{Max: 10}
	n, err := l.Write([]byte("test"))
	if n != 4 || err != nil {
		t.Fatalf("Write = %d, %v; want 4, nil", n, err)
	}
	if l.String() != "test" || l.Truncated() {
		t.Fatalf("String = %q, Truncated = %v", l.String(), l.Truncated())
	}
}

func TestLimitedCutsAtTheCapWithoutBlockingTheWriter(t *testing.T) {
	l := &Limited{Max: 5}
	l.Write([]byte("abc"))
	n, err := l.Write([]byte("defgh"))
	if n != 5 || err != nil {
		t.Fatalf("Write must accept everything without error so the program never stalls: %d, %v", n, err)
	}
	if got := l.String(); got != "abcde" {
		t.Fatalf("String = %q; want %q", got, "abcde")
	}
	if !l.Truncated() {
		t.Fatal("Truncated = false; want true")
	}
	if n, err := l.Write([]byte("más")); n != len("más") || err != nil {
		t.Fatalf("after the cap Write keeps accepting: %d, %v", n, err)
	}
	if got := l.String(); got != "abcde" {
		t.Fatalf("after the cap nothing else is kept: %q", got)
	}
}

func TestLimitedMarksTruncationOnlyWhenSomethingIsDropped(t *testing.T) {
	l := &Limited{Max: 5}
	l.Write([]byte("abcde"))
	if l.Truncated() {
		t.Fatal("filling the cap exactly is not truncating: Truncated = true")
	}
	l.Write([]byte("f"))
	if !l.Truncated() {
		t.Fatal("with a full buffer, dropping a byte must set Truncated")
	}
	if got := l.String(); got != "abcde" {
		t.Fatalf("String = %q; want %q", got, "abcde")
	}
}

func TestLimitedDropsACharacterCutByTheCap(t *testing.T) {
	cases := []struct {
		name  string
		max   int
		input string
		want  string
	}{
		// a(1) ñ(2) ñ(2) o(1): a 4-byte cap leaves only the first byte of the second "ñ".
		{"ñ cut after its first byte", 4, "añño", "añ"},
		// "€" takes 3 bytes: a 3-byte cap leaves the "a" and two bytes of the "€".
		{"€ cut after its second byte", 3, "a€", "a"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			l := &Limited{Max: c.max}
			l.Write([]byte(c.input))
			if got := l.String(); got != c.want || !l.Truncated() {
				t.Fatalf("String = %q, Truncated = %v; want %q and true, with no U+FFFD the program did not print",
					got, l.Truncated(), c.want)
			}
		})
	}
}

func TestLimitedKeepsACompleteCharacterAtTheCap(t *testing.T) {
	l := &Limited{Max: 3}
	l.Write([]byte("añb")) // "añ" takes exactly 3 bytes: the cut falls between two characters
	if got := l.String(); got != "añ" {
		t.Fatalf("String = %q; want %q", got, "añ")
	}
}

func TestLimitedReplacesInvalidBytesFromTheProgram(t *testing.T) {
	l := &Limited{Max: 10}
	l.Write([]byte("a\xffb"))
	if got := l.String(); got != "a\uFFFDb" {
		t.Fatalf("String = %q; want %q", got, "a\uFFFDb")
	}
	if l.Truncated() {
		t.Fatal("nothing was dropped: Truncated must be false")
	}
}

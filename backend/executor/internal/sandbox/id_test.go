package sandbox

import (
	"regexp"
	"testing"
)

func TestRandomIDIsHexAndDistinct(t *testing.T) {
	first, second := RandomID(), RandomID()
	if !regexp.MustCompile(`^[0-9a-f]{16}$`).MatchString(first) {
		t.Fatalf("RandomID = %q", first)
	}
	if first == second {
		t.Fatal("dos IDs seguidos no pueden coincidir")
	}
}

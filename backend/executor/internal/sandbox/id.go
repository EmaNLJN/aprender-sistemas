package sandbox

import (
	"crypto/rand"
	"encoding/hex"
)

// RandomID names the resources of a submission. 8 random bytes are enough to avoid collisions.
func RandomID() string {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

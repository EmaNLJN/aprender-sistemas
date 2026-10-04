package sandbox

import (
	"crypto/rand"
	"encoding/hex"
)

// RandomID nombra los recursos de un envío. 8 bytes aleatorios bastan para no chocar.
func RandomID() string {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

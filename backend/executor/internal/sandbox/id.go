package sandbox

import (
	"crypto/rand"
	"encoding/hex"
)

func RandomID() string {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

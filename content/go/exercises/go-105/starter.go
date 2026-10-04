package main

func CheckPayload(payload []byte, want uint32) bool {
    return crc32.ChecksumIEEE(nil) == want
}
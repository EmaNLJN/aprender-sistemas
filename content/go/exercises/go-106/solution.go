package main

// Ayudante provisto: las pruebas solo lo llaman con payloads de hasta 65535 bytes.
func BuildFrame(payload []byte) []byte {
    frame := make([]byte, 7 + len(payload))
    frame[0] = 0x47
    binary.BigEndian.PutUint16(frame[1:3], uint16(len(payload)))
    copy(frame[3:], payload)
    binary.BigEndian.PutUint32(frame[3+len(payload):], crc32.ChecksumIEEE(payload))
    return frame
}
func DecodeFrame(frame []byte) ([]byte, error) {
    if len(frame) < 7 { return nil, fmt.Errorf("trama corta") }
    if frame[0] != 0x47 { return nil, fmt.Errorf("marca inválida") }
    size := int(binary.BigEndian.Uint16(frame[1:3]))
    if len(frame) != size + 7 { return nil, fmt.Errorf("longitud inconsistente") }
    payload := frame[3:3+size]
    want := binary.BigEndian.Uint32(frame[3+size:])
    if crc32.ChecksumIEEE(payload) != want { return nil, fmt.Errorf("CRC incorrecto") }
    copyOfPayload := make([]byte, size)
    copy(copyOfPayload, payload)
    return copyOfPayload, nil
}
package main

type BrokenReader struct{}
func (BrokenReader) Read(p []byte) (int,error) { return 0, fmt.Errorf("fuente rota") }
func ReadText(r io.Reader) (string,error) {
    data, err := io.ReadAll(r)
    if err != nil { return "", err }
    return string(data), nil
}
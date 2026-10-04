package main

var ErrMissing = errors.New("clave ausente")
func ReadValue(data map[string]string, key string) (string, error) {
    value, ok := data[key]
    if !ok { return "", fmt.Errorf("leer %q: %w", key, ErrMissing) }
    return value, nil
}
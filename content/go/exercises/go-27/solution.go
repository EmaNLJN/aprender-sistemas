package main

func ParsePort(text string) (int, error) {
    port, err := strconv.Atoi(text)
    if err != nil { return 0, err }
    if port < 1 || port > 65535 { return 0, fmt.Errorf("puerto fuera de rango: %d", port) }
    return port, nil
}
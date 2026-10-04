package main

func PackTag(kind, priority uint8) (byte, error) {
    if kind > 7 || priority > 31 { return 0, fmt.Errorf("campo fuera de rango") }
    return kind << 3 | priority, nil
}
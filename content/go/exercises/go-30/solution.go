package main

func SumText(values []string) (int, error) {
    total := 0
    for i, text := range values {
        n, err := strconv.Atoi(text)
        if err != nil { return 0, fmt.Errorf("posición %d: %w", i, err) }
        total += n
    }
    return total, nil
}
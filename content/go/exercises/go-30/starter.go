package main

func SumText(values []string) (int, error) {
    total := 0
    for _, text := range values {
        n, _ := strconv.Atoi(text)
        total += n
    }
    return total, nil
}
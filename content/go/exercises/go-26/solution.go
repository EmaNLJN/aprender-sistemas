package main

func Quotient(a, b int) (int, error) {
    if b == 0 { return 0, errors.New("divisor cero") }
    return a / b, nil
}
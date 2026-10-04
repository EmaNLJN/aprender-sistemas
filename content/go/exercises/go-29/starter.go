package main

type LimitError struct { Got, Max int }
func (e *LimitError) Error() string {
    return fmt.Sprintf("tamaño %d supera %d", e.Got, e.Max)
}
func CheckSize(size, max int) error {
    return nil
}
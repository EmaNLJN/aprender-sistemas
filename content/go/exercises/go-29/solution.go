package main

type LimitError struct { Got, Max int }
func (e *LimitError) Error() string {
    return fmt.Sprintf("tamaño %d supera %d", e.Got, e.Max)
}
func CheckSize(size, max int) error {
    if size > max { return &LimitError{Got:size, Max:max} }
    return nil
}
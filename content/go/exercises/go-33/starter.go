package main

type Millis int
func (m Millis) String() string {
    return "0ms"
}
func Render(value fmt.Stringer) string { return value.String() }
package main

type Millis int
func (m Millis) String() string {
    return fmt.Sprintf("%dms", int(m))
}
func Render(value fmt.Stringer) string { return value.String() }
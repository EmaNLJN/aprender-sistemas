package main

func Label(text string) string {
    return strings.Join(strings.Fields(text), "-")
}
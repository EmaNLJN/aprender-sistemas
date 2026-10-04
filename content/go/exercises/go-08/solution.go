package main

func Category(code int) string {
    switch {
    case code >= 200 && code < 300: return "ok"
    case code >= 400 && code < 500: return "cliente"
    case code >= 500 && code < 600: return "servidor"
    default: return "otro"
    }
}
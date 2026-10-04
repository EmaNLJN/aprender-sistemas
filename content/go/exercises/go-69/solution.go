package main

func Health(w http.ResponseWriter,r *http.Request) {
    if r.URL.Path!="/health" {http.NotFound(w,r);return}
    if r.Method!=http.MethodGet {w.Header().Set("Allow","GET");http.Error(w,"método no permitido",http.StatusMethodNotAllowed);return}
    w.Header().Set("Content-Type","application/json")
    w.WriteHeader(http.StatusOK)
    fmt.Fprint(w,`{"status":"ok"}`)
}
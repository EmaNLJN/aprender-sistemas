package main

func Health(w http.ResponseWriter,r *http.Request) {
    w.WriteHeader(http.StatusOK)
    fmt.Fprint(w,"ok")
}
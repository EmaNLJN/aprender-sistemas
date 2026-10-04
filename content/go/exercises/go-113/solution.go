package main

func SimularLRU(accesos []int, capacidad int) ([]int, int, int) {
    orden := make([]int, 0)
    hits, misses := 0, 0
    for _, clave := range accesos {
        index := -1
        for i, x := range orden { if x == clave { index = i; break } }
        if index >= 0 {
            hits++
            orden = append(orden[:index], orden[index+1:]...)
            orden = append(orden, clave)
        } else {
            misses++
            if capacidad > 0 {
                if len(orden) == capacidad { orden = orden[1:] }
                orden = append(orden, clave)
            }
        }
    }
    return orden, hits, misses
}
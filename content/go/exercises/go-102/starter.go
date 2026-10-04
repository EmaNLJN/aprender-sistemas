package main

func PackCargo(weights []int, capacity int) ([]int, int) {
    var picked []int
    for i, weight := range weights {
        if weight > capacity { break } // ¿hay otras cajas más pequeñas después?
        picked = append(picked, i)
        capacity -= weight
    }
    return picked, capacity
}
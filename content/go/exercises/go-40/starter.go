package main

func ForEach(values []int, use, release func(int)) {
    for _, value := range values {
        defer release(value)
        use(value)
    }
}
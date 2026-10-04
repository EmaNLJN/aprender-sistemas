package main

func ForEach(values []int, use, release func(int)) {
    for _, value := range values {
        func(n int) {
            defer release(n)
            use(n)
        }(value)
    }
}
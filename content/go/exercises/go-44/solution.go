package main

func TryReceive(ch <-chan int) (int, bool) {
    select {
    case value, ok := <-ch:
        return value, ok
    default:
        return 0, false
    }
}
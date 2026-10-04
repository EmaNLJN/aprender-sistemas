package main

type Item struct {
    Price int
    Quantity int
}
func Cost(item Item) int {
    return item.Price
}
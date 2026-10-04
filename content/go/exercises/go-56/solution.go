package main

type Node struct { Value int; Next *Node }
func Prepend(head **Node,value int) {
    *head=&Node{Value:value,Next:*head}
}
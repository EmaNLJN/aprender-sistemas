package main

type Node struct { Value int; Next *Node }
func Prepend(head **Node,value int) {
    node:=&Node{Value:value,Next:*head}
    head=&node
}
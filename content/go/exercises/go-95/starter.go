package main

type Event struct { ID string;Delta int }
func Replay(events []Event)(int,error){
    total:=0
    for _,event:=range events{total+=event.Delta}
    return total,nil
}
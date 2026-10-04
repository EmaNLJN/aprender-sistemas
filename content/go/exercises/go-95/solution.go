package main

type Event struct { ID string;Delta int }
func Replay(events []Event)(int,error){
    seen:=make(map[string]int)
    total:=0
    for _,event:=range events {
        if event.ID==""{return 0,fmt.Errorf("ID vacío")}
        if previous,ok:=seen[event.ID];ok{if previous!=event.Delta{return 0,fmt.Errorf("ID en conflicto: %s",event.ID)};continue}
        seen[event.ID]=event.Delta;total+=event.Delta
    }
    return total,nil
}
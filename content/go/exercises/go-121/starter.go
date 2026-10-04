package main

type Record struct { Tx int; Key string; Value int; Commit bool }
func RecoverWAL(log []Record, durable int) (map[string]int,error) {
    if durable < 0 || durable > len(log) { return nil,fmt.Errorf("durable inválido") }
    state := make(map[string]int)
    for _,record := range log[:durable] { if !record.Commit { state[record.Key] = record.Value } }
    return state,nil
}
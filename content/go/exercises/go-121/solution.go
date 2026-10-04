package main

type Record struct { Tx int; Key string; Value int; Commit bool }
func RecoverWAL(log []Record, durable int) (map[string]int,error) {
    if durable < 0 || durable > len(log) { return nil,fmt.Errorf("durable inválido") }
    state := make(map[string]int)
    pending := make(map[int]map[string]int)
    for _,record := range log[:durable] {
        if record.Commit {
            for key,value := range pending[record.Tx] { state[key] = value }
            delete(pending,record.Tx)
        } else {
            if pending[record.Tx] == nil { pending[record.Tx] = make(map[string]int) }
            pending[record.Tx][record.Key] = record.Value
        }
    }
    return state,nil
}
package main

func Lamport(local,remote uint64,isReceive bool)(uint64,error) {
    if isReceive && remote>local { local=remote }
    if local==^uint64(0) { return 0,fmt.Errorf("overflow") }
    return local+1,nil
}
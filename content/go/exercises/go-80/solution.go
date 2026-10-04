package main

func Overlap(aStart,aEnd,bStart,bEnd int)(int,int,bool){
    if aStart>=aEnd || bStart>=bEnd{return 0,0,false}
    start,end:=aStart,aEnd
    if bStart>start{start=bStart}
    if bEnd<end{end=bEnd}
    if start>=end{return 0,0,false}
    return start,end,true
}
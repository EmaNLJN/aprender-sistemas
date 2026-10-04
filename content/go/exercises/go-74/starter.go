package main

var JoinedSink string
func JoinParts(parts []string) string {
    out:=""
    for _,part:=range parts {out=strings.Join([]string{out,part},"")}
    return out
}
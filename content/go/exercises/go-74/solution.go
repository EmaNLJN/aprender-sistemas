package main

var JoinedSink string
func JoinParts(parts []string) string {
    total:=0
    for _,part:=range parts {total+=len(part)}
    var builder strings.Builder
    builder.Grow(total)
    for _,part:=range parts {builder.WriteString(part)}
    return builder.String()
}
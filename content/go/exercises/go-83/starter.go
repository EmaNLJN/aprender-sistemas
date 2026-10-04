package main

func WordCounts(text string) map[string]int {
    words:=strings.FieldsFunc(strings.ToLower(text),func(r rune)bool{return !unicode.IsLetter(r) && !unicode.IsDigit(r)})
    out:=make(map[string]int)
    for _,word:=range words{out[word]=1}
    return out
}
package main

import (
    "fmt"
{{#imports}}
    "{{name}}"
{{/imports}}
)

{{code}}

func __tallerCheck(id string, test func() bool) {
    passed := false
    func() {
        defer func() { _ = recover() }()
        passed = test()
    }()
    if passed {
        fmt.Println("__TALLER_TEST__{{nonce}}:" + id + ":PASS")
    } else {
        fmt.Println("__TALLER_TEST__{{nonce}}:" + id + ":FAIL")
    }
}

func main() {
{{#tests}}
    __tallerCheck("{{id}}", func() bool { return {{expression}} })
{{/tests}}
    fmt.Println("__TALLER_END__{{nonce}}:{{count}}")
}

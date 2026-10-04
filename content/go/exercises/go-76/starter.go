package main

func FizzBuzz(n int) string {
    if n%3==0{return "Fizz"}
    if n%5==0{return "Buzz"}
    return fmt.Sprintf("%d",n)
}
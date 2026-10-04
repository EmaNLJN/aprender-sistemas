fn elegir<'a>(a: &'a str, b: &'a str, usar_a: bool) -> &'a str {
    if usar_a { a } else { b }
}
fn anagramas(a: &str, b: &str) -> bool {
    let mut a: Vec<char> = a.chars().collect();
    let mut b: Vec<char> = b.chars().collect();
    a.sort_unstable();
    b.sort_unstable();
    a == b
}
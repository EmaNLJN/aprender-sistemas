fn normalizar(texto: &str) -> String {
    texto.to_lowercase()
}
#[cfg(test)]
mod tests {
    use super::normalizar;
    #[test]
    fn conserva_interior() { assert_eq!(normalizar(" A  B "), "a  b"); }
}
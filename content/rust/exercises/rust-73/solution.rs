use std::borrow::Cow;
fn minusculas_ascii(texto: &str) -> Cow<'_, str> {
    if texto.bytes().any(|b| b.is_ascii_uppercase()) {
        Cow::Owned(texto.to_ascii_lowercase())
    } else {
        Cow::Borrowed(texto)
    }
}
use std::ops::Deref;
struct Texto(String);
impl Deref for Texto {
    type Target = str;
    fn deref(&self) -> &str { self.0.as_str() }
}
fn medir_str(s: &str) -> usize { s.len() }
fn medir_wrapper(texto: &Texto) -> usize { medir_str(texto) }
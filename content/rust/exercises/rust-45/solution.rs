struct Vista<'a> { texto: &'a str }
impl<'a> Vista<'a> {
    fn bytes(&self) -> usize { self.texto.len() }
}
fn crear_vista(texto: &str) -> Vista<'_> {
    Vista { texto: texto.trim() }
}
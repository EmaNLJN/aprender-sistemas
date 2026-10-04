struct Vista<'a> { texto: &'a str }
impl<'a> Vista<'a> {
    fn bytes(&self) -> usize { todo!() }
}
fn crear_vista(texto: &str) -> Vista<'_> {
    todo!()
}
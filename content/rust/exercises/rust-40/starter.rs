struct Cuenta(u32);
impl Iterator for Cuenta {
    type Item = u32;
    fn next(&mut self) -> Option<u32> {
        todo!()
    }
}
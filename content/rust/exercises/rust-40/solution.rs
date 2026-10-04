struct Cuenta(u32);
impl Iterator for Cuenta {
    type Item = u32;
    fn next(&mut self) -> Option<u32> {
        if self.0 == 0 { return None; }
        let actual = self.0;
        self.0 -= 1;
        Some(actual)
    }
}
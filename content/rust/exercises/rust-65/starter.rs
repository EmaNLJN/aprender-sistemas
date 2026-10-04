#[derive(Debug, PartialEq)]
struct Puerto(u16);
impl TryFrom<u16> for Puerto {
    type Error = &'static str;
    fn try_from(n: u16) -> Result<Self, Self::Error> { todo!() }
}
impl Puerto { fn numero(&self) -> u16 { self.0 } }
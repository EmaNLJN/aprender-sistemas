struct Rectangulo { ancho: u32, alto: u32 }
impl Rectangulo {
    fn area(&self) -> u32 { self.ancho * self.alto }
    fn es_cuadrado(&self) -> bool { self.ancho == self.alto }
}
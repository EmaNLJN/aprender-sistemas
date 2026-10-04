fn bytes_de<T: AsRef<[u8]> + ?Sized>(dato: &T) -> usize {
    dato.as_ref().len()
}
fn mayor<T: Ord>(datos: &[T]) -> Option<&T> {
    datos.iter().max()
}
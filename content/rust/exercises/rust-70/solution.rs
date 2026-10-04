fn eco_en_thread<T: Send + 'static>(valor: T) -> T {
    std::thread::spawn(move || valor).join().expect("el eco no debería fallar")
}
fn requiere_sync<T: Sync>() {}
fn bytes_en_thread(texto: String) -> usize {
    let trabajo = std::thread::spawn(move || texto.len());
    trabajo.join().expect("el trabajo de lectura no debería fallar")
}
fn transmitir(n: u32) -> Vec<u32> {
    let (tx, rx) = std::sync::mpsc::channel();
    let productor = std::thread::spawn(move || {
        for i in 0..n { tx.send(i).expect("receptor disponible"); }
    });
    let salida = rx.into_iter().collect();
    productor.join().expect("productor sin panic");
    salida
}
use std::sync::{Arc, Mutex};
fn contador_compartido(veces: u32) -> u32 {
    let contador = Arc::new(Mutex::new(0u32));
    let mut workers = Vec::new();
    for _ in 0..4 {
        let contador = Arc::clone(&contador);
        workers.push(std::thread::spawn(move || {
            for _ in 0..veces {
                *contador.lock().expect("mutex sano") += 1;
            }
        }));
    }
    for worker in workers { worker.join().expect("worker sano"); }
    let total = *contador.lock().expect("mutex sano");
    total
}
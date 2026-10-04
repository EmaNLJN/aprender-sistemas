use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};
struct Aviso;
impl Wake for Aviso { fn wake(self: Arc<Self>) {} }
fn waker_didactico() -> Waker { Waker::from(Arc::new(Aviso)) }
fn observar_async(n: i32) -> (usize, Option<i32>, usize) {
    let visitas = std::cell::Cell::new(0usize);
    let futuro = async { todo!("incrementar, await y calcular") };
    let antes = visitas.get();
    let mut futuro = Box::pin(futuro);
    let waker = waker_didactico();
    let mut cx = Context::from_waker(&waker);
    let valor = match futuro.as_mut().poll(&mut cx) { Poll::Ready(x) => Some(x), Poll::Pending => None };
    (antes, valor, visitas.get())
}
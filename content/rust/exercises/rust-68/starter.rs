use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};
struct Aviso;
impl Wake for Aviso { fn wake(self: Arc<Self>) {} }
fn waker_didactico() -> Waker { Waker::from(Arc::new(Aviso)) }
struct DosPasos { visitado: bool, valor: i32 }
impl Future for DosPasos {
    type Output = i32;
    fn poll(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<i32> {
        todo!()
    }
}
fn dos_polls(valor: i32) -> (bool, Option<i32>) {
    let mut f = Box::pin(DosPasos { visitado: false, valor });
    let w = waker_didactico();
    let mut cx = Context::from_waker(&w);
    let pendiente = matches!(f.as_mut().poll(&mut cx), Poll::Pending);
    let salida = match f.as_mut().poll(&mut cx) { Poll::Ready(x) => Some(x), Poll::Pending => None };
    (pendiente, salida)
}
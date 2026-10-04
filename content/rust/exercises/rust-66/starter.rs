use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};
struct Aviso;
impl Wake for Aviso { fn wake(self: Arc<Self>) {} }
fn waker_didactico() -> Waker { Waker::from(Arc::new(Aviso)) }
fn consultar_listo(n: i32) -> Option<i32> {
    todo!()
}
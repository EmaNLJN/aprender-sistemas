macro_rules! sumar {
    ($($x:expr),* $(,)?) => {{
        let mut total: i32 = 0;
        $(total += $x;)*
        total
    }};
}
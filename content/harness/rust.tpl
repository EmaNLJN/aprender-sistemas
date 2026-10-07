{{code}}

fn main() {
    std::panic::set_hook(Box::new(|_| {}));
{{#tests}}
    let passed = std::panic::catch_unwind(|| { {{expression}} }).unwrap_or(false);
    println!("__TALLER_TEST__{{nonce}}:{{id}}:{}", if passed { "PASS" } else { "FAIL" });
{{/tests}}
    println!("__TALLER_END__{{nonce}}:{{count}}");
}

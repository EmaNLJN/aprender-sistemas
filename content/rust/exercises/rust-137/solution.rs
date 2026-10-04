fn ejecutar_pc(accesos: &[(u8, Option<u8>)]) -> ([u8; 12], u8, usize, Vec<&'static str>) {
    let mut ram = [10,11,12,13,20,21,22,23,0,0,0,0];
    let mut tabla = [Some((1usize, false)), Some((0usize, true)), None];
    let mut tlb: [Option<(usize, bool)>; 3] = [None; 3];
    let (mut acc, mut retiradas) = (0, 0);
    let mut traza = Vec::new();
    'programa: for &(va, valor) in accesos {
        if va >= 12 { traza.push("range"); break; }
        let pagina = va as usize / 4;
        loop {
            let (marco, escritura) = if let Some(entrada) = tlb[pagina] {
                traza.push("hit"); entrada
            } else {
                traza.push("miss");
                if let Some(entrada) = tabla[pagina] {
                    traza.push("walk"); tlb[pagina] = Some(entrada); entrada
                } else {
                    traza.push("fault");
                    ram[8..12].fill(0);
                    tabla[pagina] = Some((2, true)); tlb[pagina] = None;
                    traza.push("map"); traza.push("retry"); continue;
                }
            };
            if valor.is_some() && !escritura {
                traza.push("protection"); break 'programa;
            }
            let fisica = marco * 4 + va as usize % 4;
            if let Some(nuevo) = valor { ram[fisica] = nuevo; traza.push("store"); }
            else { acc = ram[fisica]; traza.push("load"); }
            retiradas += 1; break;
        }
    }
    (ram, acc, retiradas, traza)
}
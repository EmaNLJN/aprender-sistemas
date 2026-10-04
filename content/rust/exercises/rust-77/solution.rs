fn bisiesto(anio: u32) -> bool {
    anio % 400 == 0 || (anio % 4 == 0 && anio % 100 != 0)
}
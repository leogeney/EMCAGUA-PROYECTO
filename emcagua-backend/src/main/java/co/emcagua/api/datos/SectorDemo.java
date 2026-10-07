package co.emcagua.api.datos;

/** Sectores usados solo para generar los datos de demostración (los reales están en la tabla sector). */
enum SectorDemo {
    CENTRO("Centro"), LIBANO("Líbano"), PIQUE_TIERRA("Pique Tierra"), CALLE_NUEVA("Calle Nueva"), SAN_LUIS("San Luis");

    private final String nombre;

    SectorDemo(String nombre) { this.nombre = nombre; }

    String nombre() { return nombre; }
}

package co.emcagua.api.datos;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import co.emcagua.api.caja.Egreso;
import co.emcagua.api.caja.EgresoRepositorio;
import co.emcagua.api.comun.EmcaguaProps;
import co.emcagua.api.comun.Periodo;
import co.emcagua.api.documentos.VerificacionServicio;
import co.emcagua.api.empresa.ConfiguracionServicio;
import co.emcagua.api.facturacion.Factura;
import co.emcagua.api.facturacion.FacturaRepositorio;
import co.emcagua.api.facturacion.Pago;
import co.emcagua.api.facturacion.PagoRepositorio;
import co.emcagua.api.facturacion.Tarifa;
import co.emcagua.api.facturacion.TarifaRepositorio;
import co.emcagua.api.facturacion.TarifaServicio;
import co.emcagua.api.inventario.Material;
import co.emcagua.api.inventario.MaterialRepositorio;
import co.emcagua.api.nomina.Empleado;
import co.emcagua.api.nomina.EmpleadoRepositorio;
import co.emcagua.api.nomina.ParametrosNomina;
import co.emcagua.api.nomina.ParametrosNominaRepositorio;
import co.emcagua.api.perdidas.Macromedicion;
import co.emcagua.api.perdidas.MacromedicionRepositorio;
import co.emcagua.api.pqr.Pqr;
import co.emcagua.api.pqr.PqrServicio;
import co.emcagua.api.seguridad.Cuenta;
import co.emcagua.api.seguridad.CuentaRepositorio;
import co.emcagua.api.seguridad.Modulos;
import co.emcagua.api.seguridad.Rol;
import co.emcagua.api.seguridad.RolRepositorio;
import co.emcagua.api.suscriptores.AlarmaMedidor;
import co.emcagua.api.suscriptores.AlarmaRepositorio;
import co.emcagua.api.suscriptores.Sector;
import co.emcagua.api.suscriptores.SectorRepositorio;
import co.emcagua.api.suscriptores.Lectura;
import co.emcagua.api.suscriptores.LecturaRepositorio;
import co.emcagua.api.suscriptores.Medidor;
import co.emcagua.api.suscriptores.MedidorRepositorio;
import co.emcagua.api.suscriptores.Predio;
import co.emcagua.api.suscriptores.PredioRepositorio;
import co.emcagua.api.suscriptores.Propietario;
import co.emcagua.api.suscriptores.PropietarioRepositorio;

/**
 * Al arrancar por primera vez (base de datos vacía) crea lo mínimo para trabajar: roles, cuentas, configuración,
 * tarifa, inventario y parámetros de nómina. Con emcagua.datos-demo=true además crea suscriptores con 12 meses
 * de lecturas, facturas y pagos, iguales en espíritu a los datos de demostración del frontend.
 */
@Component
@org.springframework.core.annotation.Order(2)
public class DatosIniciales implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DatosIniciales.class);
    private static final ZoneId ZONA = ZoneId.of("America/Bogota");
    /** Contraseña de las cuentas de prueba. Cambiarla al entrar por primera vez. */
    public static final String CLAVE_DEMO = "Emcagua2026*";

    private final RolRepositorio roles;
    private final CuentaRepositorio cuentas;
    private final PasswordEncoder cifrador;
    private final ConfiguracionServicio config;
    private final TarifaRepositorio tarifas;
    private final TarifaServicio tarifaServicio;
    private final MaterialRepositorio materiales;
    private final EmpleadoRepositorio empleados;
    private final ParametrosNominaRepositorio parametros;
    private final PropietarioRepositorio propietarios;
    private final PredioRepositorio predios;
    private final MedidorRepositorio medidores;
    private final LecturaRepositorio lecturas;
    private final AlarmaRepositorio alarmas;
    private final FacturaRepositorio facturas;
    private final PagoRepositorio pagos;
    private final EgresoRepositorio egresos;
    private final MacromedicionRepositorio macro;
    private final PqrServicio pqrs;
    private final VerificacionServicio verificacion;
    private final EmcaguaProps props;
    private final SectorRepositorio sectores;

    public DatosIniciales(RolRepositorio roles, CuentaRepositorio cuentas, PasswordEncoder cifrador, ConfiguracionServicio config, TarifaRepositorio tarifas,
        TarifaServicio tarifaServicio, MaterialRepositorio materiales, EmpleadoRepositorio empleados, ParametrosNominaRepositorio parametros,
        PropietarioRepositorio propietarios, PredioRepositorio predios, MedidorRepositorio medidores, LecturaRepositorio lecturas, AlarmaRepositorio alarmas,
        FacturaRepositorio facturas, PagoRepositorio pagos, EgresoRepositorio egresos, MacromedicionRepositorio macro, PqrServicio pqrs,
        VerificacionServicio verificacion, EmcaguaProps props, SectorRepositorio sectores) {
        this.sectores = sectores;
        this.roles = roles;
        this.cuentas = cuentas;
        this.cifrador = cifrador;
        this.config = config;
        this.tarifas = tarifas;
        this.tarifaServicio = tarifaServicio;
        this.materiales = materiales;
        this.empleados = empleados;
        this.parametros = parametros;
        this.propietarios = propietarios;
        this.predios = predios;
        this.medidores = medidores;
        this.lecturas = lecturas;
        this.alarmas = alarmas;
        this.facturas = facturas;
        this.pagos = pagos;
        this.egresos = egresos;
        this.macro = macro;
        this.pqrs = pqrs;
        this.verificacion = verificacion;
        this.props = props;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (roles.count() > 0) return; // ya hay datos: no se toca nada
        log.info("Base de datos vacía: creando datos iniciales…");
        Map<String, Rol> r = crearRoles();
        Map<String, Cuenta> c = crearCuentas(r);
        config.actual();
        crearTarifa();
        crearMateriales();
        crearNomina();
        if (props.datosDemo()) crearDemo(c);
        log.info("Listo. Entra con usuario admin y contraseña {} (cámbiala).", CLAVE_DEMO);
    }

    /* ------------------------------ Seguridad ------------------------------ */

    private Map<String, Rol> crearRoles() {
        var lista = List.of(
            new Rol("gerente", "Gerente", "Acceso a todo el sistema.", true, Set.copyOf(Modulos.TODOS)),
            new Rol("secretaria", "Atención al usuario", "Recibe usuarios, PQR y prepara documentos.", false, Set.of("mi-dia", "dashboard", "asistente", "usuarios", "facturacion", "pqr", "documentos", "redes", "avisos")),
            new Rol("cajera", "Cajera", "Cobra facturas y hace el arqueo diario.", false, Set.of("mi-dia", "asistente", "usuarios", "facturacion", "pagos")),
            new Rol("tecnico", "Técnico / fontanero", "Medidores, fugas, materiales y visitas.", false, Set.of("mi-dia", "asistente", "usuarios", "lecturas", "perdidas", "inventario", "pqr")),
            new Rol("contador", "Contador", "Caja, gastos, tarifas, reportes y nómina.", false, Set.of("mi-dia", "dashboard", "analitica", "asistente", "reporte", "facturacion", "pagos", "gastos", "tarifas", "sui", "nomina")));
        var m = new java.util.HashMap<String, Rol>();
        for (Rol rol : roles.saveAll(lista)) m.put(rol.getCodigo(), rol);
        return m;
    }

    private Map<String, Cuenta> crearCuentas(Map<String, Rol> r) {
        String hash = cifrador.encode(CLAVE_DEMO);
        // Sin datos de demostración solo existe el administrador; las demás cuentas las crea el gerente en Cuentas y roles
        if (!props.datosDemo()) {
            Cuenta admin = cuentas.save(new Cuenta("admin", "Administrador", "Gerencia", r.get("gerente"), hash));
            return Map.of("admin", admin);
        }
        var lista = List.of(
            new Cuenta("admin", "Administrador", "Gerencia", r.get("gerente"), hash),
            new Cuenta("yaneth", "Yaneth Quintero", "Tesorera / Cajera", r.get("cajera"), hash),
            new Cuenta("diana", "Diana Carrascal", "Secretaria", r.get("secretaria"), hash),
            new Cuenta("alvaro", "Álvaro Pacheco", "Fontanero", r.get("tecnico"), hash),
            new Cuenta("martha", "Martha Ascanio", "Contadora", r.get("contador"), hash));
        var m = new java.util.HashMap<String, Cuenta>();
        for (Cuenta c : cuentas.saveAll(lista)) m.put(c.getUsuario(), c);
        return m;
    }

    /* ------------------------------ Operación ------------------------------ */

    private void crearTarifa() {
        // Valores de EJEMPLO: la empresa carga los de su estudio de costos aprobado.
        Tarifa t = new Tarifa();
        t.setDesdeAnio(2026);
        t.setDesdeMes(1);
        t.setAcueductoCargoFijo(8500);
        t.setAcueductoPorM3(1950);
        t.setAlcantarilladoCargoFijo(4200);
        t.setAlcantarilladoPorM3(950);
        t.setConsumoBasico(13);
        t.setSubsidioEstrato1(0.5);
        t.setSubsidioEstrato2(0.4);
        t.setSubsidioEstrato3(0.15);
        t.setSoporte("Tarifa de ejemplo para pruebas");
        tarifas.save(t);
    }

    private void crearMateriales() {
        var lista = List.of(
            new Material("M01", "Medidor volumétrico ½\"", Material.Categoria.MEDIDORES, "und", 6, 5, 145_000),
            new Material("M02", "Medidor inteligente ½\" (telemetría)", Material.Categoria.MEDIDORES, "und", 2, 3, 420_000),
            new Material("M03", "Tubo PVC presión ½\"", Material.Categoria.TUBERIA_Y_ACCESORIOS, "tubo 6 m", 24, 10, 18_500),
            new Material("M04", "Tubo PVC presión 2\"", Material.Categoria.TUBERIA_Y_ACCESORIOS, "tubo 6 m", 8, 4, 96_000),
            new Material("M05", "Codo PVC ½\"", Material.Categoria.TUBERIA_Y_ACCESORIOS, "und", 40, 20, 1_200),
            new Material("M06", "Unión de reparación 2\"", Material.Categoria.TUBERIA_Y_ACCESORIOS, "und", 3, 4, 38_000),
            new Material("M07", "Llave de paso ½\"", Material.Categoria.TUBERIA_Y_ACCESORIOS, "und", 15, 8, 14_500),
            new Material("M08", "Sello / precinto de corte", Material.Categoria.TUBERIA_Y_ACCESORIOS, "und", 30, 15, 2_500),
            new Material("M09", "Cinta teflón", Material.Categoria.TUBERIA_Y_ACCESORIOS, "rollo", 18, 10, 2_000),
            new Material("M10", "Hipoclorito de calcio 70 %", Material.Categoria.QUIMICOS_DE_PLANTA, "kg", 85, 60, 14_000),
            new Material("M11", "Sulfato de aluminio", Material.Categoria.QUIMICOS_DE_PLANTA, "bulto 25 kg", 7, 10, 68_000),
            new Material("M12", "Reactivo DPD (cloro residual)", Material.Categoria.QUIMICOS_DE_PLANTA, "sobre", 120, 50, 900),
            new Material("M13", "Botas de caucho", Material.Categoria.DOTACION_Y_HERRAMIENTAS, "par", 4, 3, 42_000),
            new Material("M14", "Guantes de nitrilo", Material.Categoria.DOTACION_Y_HERRAMIENTAS, "caja", 2, 4, 25_000));
        // Sin demostración el catálogo arranca en cero: las existencias reales se cargan con un ajuste de inventario
        if (!props.datosDemo()) lista.forEach(m -> m.setStock(0));
        materiales.saveAll(lista);
    }

    private void crearNomina() {
        ParametrosNomina p = new ParametrosNomina();
        p.setAnio(2026);
        p.setSmmlv(1_750_905);
        p.setAuxilioTransporte(249_095);
        parametros.save(p);
        if (!props.datosDemo()) return; // los empleados reales se registran en Nómina
        Object[][] e = {
            { "88152430", "Rodrigo Pallares", "Gerente", "A", 4_800_000, "2019-02-01", "I", 1, "Nueva EPS", "Colpensiones", 105 },
            { "37325118", "Martha Ascanio", "Contadora", "A", 3_400_000, "2020-06-16", "I", 1, "Sanitas", "Porvenir", 75 },
            { "1091660245", "Yaneth Quintero", "Tesorera / Cajera", "A", 2_150_000, "2021-03-01", "I", 1, "Nueva EPS", "Protección", 60 },
            { "1091672903", "Diana Carrascal", "Secretaria", "A", 1_900_000, "2022-08-08", "I", 1, "Coosalud", "Colfondos", 30 },
            { "1004912330", "Kevin Bayona", "Auxiliar administrativo", "A", 1_750_905, "2025-11-03", "F", 1, "Nueva EPS", "Porvenir", 0 },
            { "13380774", "Álvaro Pacheco", "Fontanero", "O", 1_950_000, "2018-01-15", "I", 4, "Nueva EPS", "Colpensiones", 120 },
            { "1091655012", "Jhon Navarro", "Fontanero", "O", 1_950_000, "2020-09-01", "I", 4, "Coosalud", "Porvenir", 75 },
            { "88270551", "Luis Vergel", "Operador de planta", "O", 2_050_000, "2017-05-02", "I", 3, "Sanitas", "Protección", 120 },
            { "1091640880", "Edwin Galvis", "Operador de planta", "O", 2_050_000, "2021-07-12", "I", 3, "Nueva EPS", "Colfondos", 60 },
            { "1004877214", "Wilmer Durán", "Lector de medidores", "O", 1_750_905, "2023-02-20", "F", 2, "Coosalud", "Porvenir", 30 },
            { "13375902", "Óscar Picón", "Celador", "O", 1_750_905, "2016-10-01", "I", 4, "Nueva EPS", "Colpensiones", 135 },
            { "37330476", "Gloria Arévalo", "Auxiliar de servicios generales", "A", 1_750_905, "2022-01-10", "I", 1, "Coosalud", "Colpensiones", 45 } };
        List<Empleado> lista = new ArrayList<>();
        for (Object[] x : e) {
            Empleado em = new Empleado();
            em.setCedula((String) x[0]);
            em.setNombre((String) x[1]);
            em.setCargo((String) x[2]);
            em.setArea("A".equals(x[3]) ? Empleado.Area.ADMINISTRATIVA : Empleado.Area.OPERATIVA);
            em.setSalario(((Number) x[4]).longValue());
            em.setFechaIngreso(LocalDate.parse((String) x[5]));
            em.setContrato("I".equals(x[6]) ? Empleado.Contrato.INDEFINIDO : Empleado.Contrato.TERMINO_FIJO);
            em.setRiesgoArl((Integer) x[7]);
            em.setEps((String) x[8]);
            em.setPension((String) x[9]);
            em.setDiasVacacionesDisfrutados((Integer) x[10]);
            lista.add(em);
        }
        empleados.saveAll(lista);
    }

    /* ------------------------------ Demostración ------------------------------ */

    /** Semilla de un predio de demostración. debeDesde: periodos atrás desde que no paga (null = al día). */
    private record Semilla(String codigo, String nombre, String cedula, String telefono, SectorDemo barrio, int estrato, int base, Integer debeDesde, boolean cortado, Double pico, String ocupante) {}

    private static final String[] NOMBRES = { "Luis", "Carmen", "José", "Rosa", "Miguel", "Elena", "Javier", "Gloria", "Ricardo", "Patricia", "Héctor", "Luz", "Óscar", "Marta", "Camilo", "Yolanda", "Edwin", "Sandra", "Wilson", "Claudia", "Hernán", "Paola", "Iván", "Nelly" };
    private static final String[] APELLIDOS = { "Quintero", "Sánchez", "Rincón", "Pacheco", "Navarro", "Vergel", "Bayona", "Pallares", "Ascanio", "Carrascal", "Galvis", "Velásquez", "Ovallos", "Jaime", "Arévalo", "Durán", "Picón", "Claro" };
    /** Consumo de cada mes frente al promedio: los meses secos se consume más. */
    private static final double[] FACTOR_MES = { 1.08, 1.12, 1.1, 0.98, 0.94, 0.96, 1.05, 1.1, 1.02, 0.95, 0.92, 1.0 };
    /** Pérdida base de cada sector (más alta donde la red es más vieja). */
    private static final Map<SectorDemo, Double> PERDIDA = Map.of(SectorDemo.CENTRO, 0.29, SectorDemo.LIBANO, 0.46, SectorDemo.PIQUE_TIERRA, 0.33, SectorDemo.CALLE_NUEVA, 0.38, SectorDemo.SAN_LUIS, 0.35);

    private List<Semilla> semillas(Random rnd) {
        List<Semilla> s = new ArrayList<>(List.of(
            new Semilla("10234", "Juan Pérez", "88123451", "3104567890", SectorDemo.CENTRO, 2, 18, null, false, null, null),
            new Semilla("10235", "María López", "37211045", "3122345678", SectorDemo.LIBANO, 1, 32, 1, true, null, null),
            new Semilla("10236", "Carlos Ruiz", "92727405", "3156789012", SectorDemo.PIQUE_TIERRA, 3, 12, null, false, null, null),
            new Semilla("10237", "Ana Torres", "37290113", "3201112233", SectorDemo.CENTRO, 2, 45, 1, true, null, null),
            new Semilla("10238", "Jorge Gómez", "88200761", "3184445566", SectorDemo.CALLE_NUEVA, 1, 8, null, false, null, null),
            new Semilla("10239", "Lucía Martínez", "60390221", "3117778899", SectorDemo.LIBANO, 2, 28, 2, true, null, null),
            new Semilla("10240", "Pedro Díaz", "13470552", "3169990011", SectorDemo.CENTRO, 3, 15, null, false, null, null),
            new Semilla("10241", "Sofía Ramírez", "1091650734", "3132223344", SectorDemo.CALLE_NUEVA, 2, 38, 1, true, null, null),
            new Semilla("10242", "Andrés Castro", "1091663890", "3195556677", SectorDemo.PIQUE_TIERRA, 1, 22, null, false, null, null),
            new Semilla("10243", "Diana Herrera", "94477643", "3178889900", SectorDemo.CENTRO, 3, 14, null, false, null, null),
            new Semilla("10244", "Fernando Ortiz", "92136268", "3143334455", SectorDemo.LIBANO, 2, 41, 1, false, null, null),
            new Semilla("10245", "Valentina Ríos", "1004871233", "3226667788", SectorDemo.CALLE_NUEVA, 1, 9, 1, true, null, null),
            new Semilla("10246", "Ejemplo Deuda Marzo", "88999001", "3001234567", SectorDemo.CENTRO, 2, 22, 6, true, null, null),
            new Semilla("10247", "Usuario WhatsApp", "88999002", "3123244168", SectorDemo.CENTRO, 2, 19, null, false, null, null),
            new Semilla("10248", "Mariana Muñoz", "1091677402", "3134685430", SectorDemo.CENTRO, 2, 21, null, false, null, null),
            new Semilla("10249", "Alto Consumo Al Día", "88999003", "3159998877", SectorDemo.CALLE_NUEVA, 2, 52, null, false, null, null),
            // Propietarios con más de un predio
            new Semilla("10294", "Juan Pérez", "88123451", "3104567890", SectorDemo.LIBANO, 1, 14, null, false, null, "Rosa Bayona|3119023344"),
            new Semilla("10295", "Fernando Ortiz", "92136268", "3143334455", SectorDemo.CENTRO, 2, 24, 2, false, null, "Camilo Durán|3204551290"),
            new Semilla("10296", "Diana Herrera", "94477643", "3178889900", SectorDemo.PIQUE_TIERRA, 3, 11, null, false, null, null),
            new Semilla("10297", "Diana Herrera", "94477643", "3178889900", SectorDemo.CENTRO, 3, 6, 1, false, null, "Local comercial (bajos)|3178889900")));
        SectorDemo[] barrios = SectorDemo.values();
        for (int i = 0; i < 44; i++) {
            double r = rnd.nextDouble();
            int estrato = r < 0.45 ? 1 : r < 0.85 ? 2 : 3;
            boolean alto = rnd.nextDouble() < 0.08;
            int base = alto ? 34 + (int) Math.round(rnd.nextDouble() * 16) : Math.max(6, (int) Math.round(10 + rnd.nextDouble() * 16 + (estrato - 1) * 2));
            double d = rnd.nextDouble();
            Integer debe = null;
            boolean cortado = false;
            if (d < 0.1) { debe = 1; cortado = true; }
            else if (d < 0.16) debe = 1;
            else if (d < 0.19) { debe = 2 + rnd.nextInt(2); cortado = true; }
            String nombre = NOMBRES[rnd.nextInt(NOMBRES.length)] + " " + APELLIDOS[rnd.nextInt(APELLIDOS.length)];
            String tel = "3" + (rnd.nextInt(3) + 1) + rnd.nextInt(10) + (100 + rnd.nextInt(900)) + (1000 + rnd.nextInt(9000));
            String cedula = String.valueOf(1_091_600_000L + rnd.nextInt(90_000));
            Double pico = rnd.nextDouble() < 0.05 ? 2 + rnd.nextDouble() * 0.6 : null;
            s.add(new Semilla(String.valueOf(10250 + i), nombre, cedula, tel, barrios[rnd.nextInt(barrios.length)], estrato, base, debe, cortado, pico, null));
        }
        return s;
    }

    private static String direccion(String codigo, SectorDemo b, Random rnd) {
        String via = b == SectorDemo.LIBANO || b == SectorDemo.CALLE_NUEVA ? "Carrera" : "Calle";
        return "%s %d # %d-%d".formatted(via, 2 + rnd.nextInt(12), 1 + rnd.nextInt(15), 10 + rnd.nextInt(80));
    }

    private Sector sectorDe(SectorDemo d) {
        return sectores.findByNombreIgnoreCase(d.nombre()).orElseGet(() -> sectores.save(new Sector(d.nombre(), d.ordinal() + 1)));
    }

    private void crearDemo(Map<String, Cuenta> cuentasDemo) {
        Random rnd = new Random(20260930L);
        LocalDate hoy = LocalDate.now(ZONA);
        // Último periodo ya facturado: aquel cuya fecha de generación ya pasó
        Periodo ultimo = Periodo.de(hoy);
        while (ultimo.generacion().isAfter(hoy)) ultimo = ultimo.anterior();
        List<Periodo> periodos = new ArrayList<>();
        for (Periodo p = ultimo; periodos.size() < 12; p = p.anterior()) periodos.add(0, p);
        List<Cuenta> cajeros = List.of(cuentasDemo.get("yaneth"), cuentasDemo.get("diana"));

        Map<String, Propietario> duenos = new java.util.HashMap<>();
        List<Pago> listaPagos = new ArrayList<>();
        Map<SectorDemo, long[]> facturadoSector = new EnumMap<>(SectorDemo.class); // por periodo: m³ facturados
        List<Medidor> sinSenal = new ArrayList<>();
        int n = 0;
        for (Semilla s : semillas(rnd)) {
            Propietario dueno = duenos.computeIfAbsent(s.cedula(), k -> propietarios.save(new Propietario(s.cedula(), s.nombre(), s.telefono())));
            Predio predio = new Predio(s.codigo(), dueno, direccion(s.codigo(), s.barrio(), rnd), sectorDe(s.barrio()), s.estrato());
            if (s.ocupante() != null) { String[] o = s.ocupante().split("\\|"); predio.setOcupanteNombre(o[0]); predio.setOcupanteTelefono(o[1]); }
            if (s.cortado()) predio.setEstado(Predio.Estado.CORTADO);
            predio.setConMedidor(true); // la demostración simula medidores inteligentes
            predio = predios.save(predio);
            Medidor m = new Medidor("MED-" + s.codigo(), predio, LocalDate.of(2024, 3, 1).plusDays(rnd.nextInt(400)));
            m.setSenal(70 + rnd.nextInt(30));
            boolean comunica = n++ % 17 != 5;
            m.setUltimaComunicacion(comunica ? Instant.now().minusSeconds(60L * rnd.nextInt(120)) : Instant.now().minusSeconds(86_400L * 4));
            m = medidores.save(m);
            if (!comunica && !s.cortado()) sinSenal.add(m);

            Integer idxDeuda = s.debeDesde() == null ? null : periodos.size() - 1 - s.debeDesde();
            BigDecimal acumulado = BigDecimal.valueOf(200 + rnd.nextInt(800));
            lecturas.save(new Lectura(m, periodos.get(0).anterior().generacion().minusDays(1).atTime(LocalTime.of(23, 0)).atZone(ZONA).toInstant(), acumulado, Lectura.Origen.TELEMETRIA, "Telemetría"));
            for (int i = 0; i < periodos.size(); i++) {
                Periodo p = periodos.get(i);
                int consumo = Math.max(4, (int) Math.round(s.base() * FACTOR_MES[p.mes() - 1]) + rnd.nextInt(7) - 3);
                if (s.pico() != null && i == periodos.size() - 1) consumo = (int) Math.round(s.base() * s.pico());
                boolean suspendido = idxDeuda != null && i > idxDeuda && s.cortado();
                Factura f = new Factura();
                f.setPredio(predio);
                f.setAnio(p.anio());
                f.setMes(p.mes());
                f.setEstrato(s.estrato());
                f.setNumero("FAC-%d-%02d-%s".formatted(p.anio(), p.mes(), s.codigo()));
                f.setEmision(p.generacion());
                f.setVencimiento(p.vencimiento());
                if (suspendido) {
                    f.setEstado(Factura.Estado.SUSPENDIDO);
                } else {
                    BigDecimal anterior = acumulado;
                    acumulado = acumulado.add(BigDecimal.valueOf(consumo));
                    lecturas.save(new Lectura(m, p.generacion().minusDays(1).atTime(LocalTime.of(23, 0)).atZone(ZONA).toInstant(), acumulado, Lectura.Origen.TELEMETRIA, "Telemetría"));
                    f.setLecturaAnterior(anterior);
                    f.setLecturaActual(acumulado);
                    f.setConsumo(consumo);
                    var liq = tarifaServicio.liquidar(consumo, s.estrato(), p);
                    f.setCargoFijo(liq.cargoFijo());
                    f.setValorConsumo(liq.valorConsumo());
                    f.setSubsidio(liq.subsidio());
                    f.setTotal(liq.total());
                    facturadoSector.computeIfAbsent(s.barrio(), k -> new long[12])[i] += consumo;
                    boolean debe = idxDeuda != null && i >= idxDeuda;
                    boolean ultimoSinPagar = i == periodos.size() - 1 && !p.vencimiento().isBefore(hoy) && rnd.nextDouble() < 0.42;
                    if (!debe && !ultimoSinPagar) {
                        LocalDate limite = p.vencimiento().isBefore(hoy) ? p.vencimiento() : hoy;
                        long span = Math.max(0, limite.toEpochDay() - p.generacion().toEpochDay());
                        LocalDate dia = p.generacion().plusDays(span == 0 ? 0 : rnd.nextLong(span + 1));
                        Instant fecha = dia.atTime(8 + rnd.nextInt(9), rnd.nextInt(60)).atZone(ZONA).toInstant();
                        if (fecha.isAfter(Instant.now())) fecha = Instant.now().minusSeconds(rnd.nextInt(3600));
                        f.setEstado(Factura.Estado.PAGADA);
                        f.setFechaPago(fecha);
                    }
                }
                f.setCodigoVerificacion(verificacion.codigoFactura(f.getNumero(), predio.getCodigo(), f.getTotal()));
                f = facturas.save(f);
                if (f.getEstado() == Factura.Estado.PAGADA) {
                    Pago pago = new Pago();
                    pago.setPredio(predio);
                    pago.setFacturas(new LinkedHashSet<>(List.of(f)));
                    pago.setConcepto("Factura " + p.nombre());
                    pago.setMonto(f.getTotal());
                    boolean efectivo = rnd.nextDouble() < 0.65;
                    pago.setMetodo(efectivo ? Pago.Metodo.EFECTIVO : Pago.Metodo.TRANSFERENCIA);
                    if (efectivo) { long rec = (long) Math.ceil(f.getTotal() / 10_000.0) * 10_000; pago.setRecibido(rec); pago.setVueltos(rec - f.getTotal()); }
                    pago.setCajero(cajeros.get(rnd.nextDouble() < 0.7 ? 0 : 1));
                    pago.setFecha(f.getFechaPago());
                    listaPagos.add(pago);
                }
            }
            // Lectura de hoy (periodo en curso) para los que comunican
            if (comunica && !s.cortado()) lecturas.save(new Lectura(m, Instant.now().minusSeconds(60L * rnd.nextInt(180)), acumulado.add(BigDecimal.valueOf(Math.round(s.base() * 0.15))), Lectura.Origen.TELEMETRIA, "Telemetría"));
            if ("10242".equals(s.codigo())) alarmas.save(new AlarmaMedidor(m, AlarmaMedidor.Tipo.FUGA, "Caudal mínimo nocturno de 31 L/h ≈ 22 m³ al mes perdidos", Instant.now().minusSeconds(86_400L * 3)));
        }
        for (Medidor m : sinSenal) alarmas.save(new AlarmaMedidor(m, AlarmaMedidor.Tipo.SIN_COMUNICACION, "Último reporte hace 4 días", m.getUltimaComunicacion()));

        // Recibos numerados en orden de fecha
        listaPagos.sort(Comparator.comparing(Pago::getFecha));
        int k = 1;
        for (Pago p : listaPagos) {
            p.setNumero("PAG-%05d".formatted(k++));
            p.setCodigoVerificacion(verificacion.codigoRecibo(p.getNumero(), p.getPredio().getCodigo(), p.getMonto(), p.getFecha()));
        }
        pagos.saveAll(listaPagos);

        // Agua que entró a cada sector (estimada): facturado ÷ (1 − pérdida)
        for (int i = 0; i < periodos.size(); i++) {
            Periodo p = periodos.get(i);
            for (SectorDemo b : SectorDemo.values()) {
                long fact = facturadoSector.getOrDefault(b, new long[12])[i];
                double perdida = Math.min(0.6, Math.max(0.12, PERDIDA.get(b) + ((p.clave() * 37 + b.ordinal() * 11) % 13 - 6) / 200.0 - i * 0.002));
                Macromedicion mm = new Macromedicion();
                mm.setAnio(p.anio());
                mm.setMes(p.mes());
                mm.setSector(sectorDe(b));
                mm.setVolumen(Math.round(fact / (1 - perdida)));
                macro.save(mm);
            }
        }

        // Gastos de los últimos meses
        Object[][] base = { { Egreso.Categoria.ENERGIA_Y_SERVICIOS, "Energía eléctrica planta y bombeo", "CENS", 1_850_000 },
            { Egreso.Categoria.QUIMICOS_Y_MATERIALES, "Sulfato de aluminio (10 bultos)", "Químicos del Oriente", 680_000 },
            { Egreso.Categoria.QUIMICOS_Y_MATERIALES, "Hipoclorito de calcio (45 kg)", "Químicos del Oriente", 630_000 },
            { Egreso.Categoria.COMBUSTIBLE_Y_TRANSPORTE, "Gasolina moto de cuadrilla", "EDS El Carmen", 240_000 },
            { Egreso.Categoria.MANTENIMIENTO_DE_PLANTA, "Mantenimiento bomba dosificadora", "Taller Hidráulico Ocaña", 450_000 },
            { Egreso.Categoria.PAPELERIA_Y_OFICINA, "Papel e impresión de facturas", "Papelería Central", 310_000 },
            { Egreso.Categoria.HONORARIOS_Y_ASESORIAS, "Revisoría fiscal", "Contador externo", 900_000 } };
        for (int mAtras = 5; mAtras >= 0; mAtras--) {
            LocalDate d = hoy.withDayOfMonth(1).minusMonths(mAtras);
            for (int i = 0; i < base.length; i++) {
                if (mAtras == 0 && i > 3) continue;
                LocalDate f = d.withDayOfMonth(Math.min(3 + i * 4, 27));
                if (f.isAfter(hoy)) continue;
                long valor = Math.round(((Number) base[i][3]).longValue() * (0.88 + ((mAtras * 7 + i * 3) % 10) / 40.0) / 1000.0) * 1000;
                Egreso e = new Egreso();
                e.setFecha(f);
                e.setCategoria((Egreso.Categoria) base[i][0]);
                e.setDescripcion((String) base[i][1]);
                e.setProveedor((String) base[i][2]);
                e.setValor(valor);
                e.setMedio(valor < 300_000 ? Egreso.Medio.EFECTIVO_CAJA : Egreso.Medio.TRANSFERENCIA);
                e.setRegistradoPor("Martha Ascanio");
                egresos.save(e);
            }
        }

        // Algunas PQR
        pqrs.radicar(new PqrServicio.Radicacion(Pqr.Tipo.RECLAMO, null, Pqr.Canal.PRESENCIAL, "10237", "Ana Torres", "3201112233", null, "La factura de este mes llegó muy alta y en la casa no ha cambiado nada."), "Diana Carrascal");
        pqrs.radicar(new PqrServicio.Radicacion(Pqr.Tipo.QUEJA, null, Pqr.Canal.WHATSAPP, null, "Vecino del barrio", "3001112233", "Guamalito", "Hay una fuga grande en la calle frente a la escuela desde hace dos días."), "Diana Carrascal");
        pqrs.radicar(new PqrServicio.Radicacion(Pqr.Tipo.PETICION, null, Pqr.Canal.PORTAL_WEB, "10236", "Carlos Ruiz", "3156789012", null, "Solicito un certificado de paz y salvo para la venta del inmueble."), "Portal web");
        log.info("Datos de demostración: {} predios, {} facturas, {} pagos", predios.count(), facturas.count(), pagos.count());
    }
}

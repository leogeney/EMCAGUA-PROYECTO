package co.emcagua.api.datos;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import co.emcagua.api.comun.EmcaguaProps;
import co.emcagua.api.nomina.Empleado;
import co.emcagua.api.nomina.EmpleadoRepositorio;
import co.emcagua.api.nomina.NovedadNomina;
import co.emcagua.api.nomina.NovedadNominaRepositorio;
import co.emcagua.api.nomina.PeriodoNomina;
import co.emcagua.api.nomina.PeriodoNominaRepositorio;

/**
 * Demostración: si la nómina no tiene meses guardados, crea los últimos 8 meses ya pagados y el mes actual en borrador,
 * para que la pantalla de nómina muestre historial y tendencias desde el primer día.
 */
@Component
@Order(3)
public class NominaDemo implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(NominaDemo.class);
    private static final ZoneId ZONA = ZoneId.of("America/Bogota");

    private final PeriodoNominaRepositorio periodos;
    private final NovedadNominaRepositorio novedades;
    private final EmpleadoRepositorio empleados;
    private final EmcaguaProps props;

    public NominaDemo(PeriodoNominaRepositorio periodos, NovedadNominaRepositorio novedades, EmpleadoRepositorio empleados, EmcaguaProps props) {
        this.periodos = periodos;
        this.novedades = novedades;
        this.empleados = empleados;
        this.props = props;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!props.datosDemo() || periodos.count() > 0 || empleados.count() == 0) return;
        LocalDate hoy = LocalDate.now(ZONA);
        for (int i = 8; i >= 0; i--) {
            LocalDate d = hoy.withDayOfMonth(1).minusMonths(i);
            LocalDate fin = d.withDayOfMonth(d.lengthOfMonth());
            PeriodoNomina p = new PeriodoNomina();
            p.setAnio(d.getYear());
            p.setMes(d.getMonthValue());
            p.setEstado(i == 0 ? PeriodoNomina.Estado.BORRADOR : PeriodoNomina.Estado.PAGADA);
            p.getBitacora().add(evento(d.withDayOfMonth(1), 8, "sistema", "Nómina creada con las novedades del mes"));
            if (i > 0) {
                p.getBitacora().add(evento(d.withDayOfMonth(Math.min(26, fin.getDayOfMonth())), 10, "Administrador", "Nómina aprobada"));
                p.getBitacora().add(evento(fin, 15, "Administrador", "Nómina marcada como pagada"));
                p.setAprobadaPor("Administrador");
            }
            p = periodos.save(p);
            int mes = d.getMonthValue();
            for (Empleado e : empleados.findAll()) {
                if (!e.isActivo() || e.getFechaIngreso().isAfter(fin)) continue;
                NovedadNomina n = new NovedadNomina();
                n.setPeriodo(p);
                n.setEmpleado(e);
                // Horas extra del personal operativo, distintas cada mes (determinístico)
                if (e.getArea() == Empleado.Area.OPERATIVA) {
                    long k = e.getId() * 7 + mes * 3;
                    n.setHed(k % 9);
                    n.setHen(k % 4);
                    n.setHeddf(mes % 3 == 0 ? 4 : 0);
                    n.setRn(k % 5 == 0 ? 8 : 0);
                }
                novedades.save(n);
            }
        }
        log.info("Nómina de demostración: 8 meses pagados y el mes actual en borrador");
    }

    private static PeriodoNomina.Evento evento(LocalDate dia, int hora, String usuario, String accion) {
        PeriodoNomina.Evento e = new PeriodoNomina.Evento(usuario, accion);
        e.setFecha(ZonedDateTime.of(dia.atTime(hora, 0), ZONA).toInstant());
        return e;
    }
}

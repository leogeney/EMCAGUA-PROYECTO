package co.emcagua.api.comun;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

/**
 * Mes facturado (año + mes 1-12) y su calendario:
 * la factura vence el primer viernes del mes siguiente y se genera 14 días antes.
 */
public record Periodo(int anio, int mes) implements Comparable<Periodo> {

    private static final String[] MESES = { "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre" };

    public Periodo {
        if (mes < 1 || mes > 12) throw new IllegalArgumentException("Mes inválido: " + mes);
    }

    public static Periodo de(LocalDate fecha) { return new Periodo(fecha.getYear(), fecha.getMonthValue()); }

    public int clave() { return anio * 12 + (mes - 1); }

    public Periodo siguiente() { return mes == 12 ? new Periodo(anio + 1, 1) : new Periodo(anio, mes + 1); }

    public Periodo anterior() { return mes == 1 ? new Periodo(anio - 1, 12) : new Periodo(anio, mes - 1); }

    public LocalDate vencimiento() {
        LocalDate primeroSiguiente = LocalDate.of(anio, mes, 1).plusMonths(1);
        return primeroSiguiente.with(TemporalAdjusters.firstInMonth(DayOfWeek.FRIDAY));
    }

    public LocalDate generacion() { return vencimiento().minusDays(14); }

    public String nombre() { return MESES[mes - 1] + " " + anio; }

    @Override
    public int compareTo(Periodo o) { return Integer.compare(clave(), o.clave()); }

    @Override
    public String toString() { return "%d-%02d".formatted(anio, mes); }
}

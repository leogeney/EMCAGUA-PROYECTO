package co.emcagua.api.comun;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Set;

/** Días hábiles de Colombia (sin sábados, domingos ni festivos). Se usa para el plazo legal de las PQR. */
public final class DiasHabiles {
    private DiasHabiles() {}

    /** Festivos de Colombia 2026 (Ley 51 de 1983). Agregar los de cada año nuevo. */
    private static final Set<LocalDate> FESTIVOS = Set.of(
        LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 12), LocalDate.of(2026, 3, 23), LocalDate.of(2026, 4, 2), LocalDate.of(2026, 4, 3),
        LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 18), LocalDate.of(2026, 6, 8), LocalDate.of(2026, 6, 15), LocalDate.of(2026, 6, 29),
        LocalDate.of(2026, 7, 20), LocalDate.of(2026, 8, 7), LocalDate.of(2026, 8, 17), LocalDate.of(2026, 10, 12), LocalDate.of(2026, 11, 2),
        LocalDate.of(2026, 11, 16), LocalDate.of(2026, 12, 8), LocalDate.of(2026, 12, 25));

    public static boolean esHabil(LocalDate d) {
        return d.getDayOfWeek() != DayOfWeek.SATURDAY && d.getDayOfWeek() != DayOfWeek.SUNDAY && !FESTIVOS.contains(d);
    }

    /** Fecha que resulta de sumar n días hábiles (el día de inicio no cuenta). */
    public static LocalDate sumar(LocalDate desde, int n) {
        LocalDate d = desde;
        int c = 0;
        while (c < n) {
            d = d.plusDays(1);
            if (esHabil(d)) c++;
        }
        return d;
    }

    /** Días hábiles que faltan hasta la fecha límite (negativo si ya venció). */
    public static int restantes(LocalDate hoy, LocalDate vence) {
        int signo = vence.isBefore(hoy) ? -1 : 1;
        LocalDate ini = signo > 0 ? hoy : vence, fin = signo > 0 ? vence : hoy;
        int c = 0;
        for (LocalDate d = ini.plusDays(1); !d.isAfter(fin); d = d.plusDays(1)) if (esHabil(d)) c++;
        return signo * c;
    }
}

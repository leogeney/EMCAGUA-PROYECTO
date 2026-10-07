package co.emcagua.api.facturacion;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

import co.emcagua.api.comun.Periodo;

/** Liquida el valor de una factura con la tarifa vigente en ese periodo. */
@Service
public class TarifaServicio {
    /** Tarifa simple anterior a la CRA ($/m³ por estrato), para periodos sin tarifa CRA cargada. */
    private static final Map<Integer, Long> TARIFA_SIMPLE = Map.of(1, 1800L, 2, 2600L, 3, 3400L);

    private final TarifaRepositorio repo;

    public TarifaServicio(TarifaRepositorio repo) { this.repo = repo; }

    public record Linea(String concepto, String cantidad, long valor) {}

    public record Liquidacion(long cargoFijo, long valorConsumo, long subsidio, long total, boolean cra, List<Linea> lineas) {}

    public Optional<Tarifa> vigente(Periodo p) {
        Tarifa v = null;
        for (Tarifa t : repo.findAllByOrderByDesdeAnioAscDesdeMesAsc()) if (t.desde().compareTo(p) <= 0) v = t;
        return Optional.ofNullable(v);
    }

    public Liquidacion liquidar(int consumo, int estrato, Periodo p) {
        return vigente(p).map(t -> conTarifa(t, consumo, estrato)).orElseGet(() -> simple(consumo, estrato));
    }

    private Liquidacion simple(int consumo, int estrato) {
        long total = consumo * TARIFA_SIMPLE.getOrDefault(estrato, 3400L);
        return new Liquidacion(0, total, 0, total, false, List.of(new Linea("Consumo × tarifa estrato " + estrato, consumo + " m³", total)));
    }

    /** El subsidio cubre el cargo fijo y el consumo básico; el consumo complementario se paga completo. */
    static Liquidacion conTarifa(Tarifa t, int consumo, int estrato) {
        int basico = Math.min(consumo, t.getConsumoBasico());
        int compl = Math.max(0, consumo - t.getConsumoBasico());
        double pct = t.subsidio(estrato);
        List<Linea> lineas = new ArrayList<>();
        long cf = 0, vc = 0, sub = 0;
        long[][] servicios = { { t.getAcueductoCargoFijo(), t.getAcueductoPorM3() }, { t.getAlcantarilladoCargoFijo(), t.getAlcantarilladoPorM3() } };
        String[] nombres = { "Acueducto", "Alcantarillado" };
        for (int i = 0; i < 2; i++) {
            long fijo = servicios[i][0], m3 = servicios[i][1];
            lineas.add(new Linea(nombres[i] + " · cargo fijo", null, fijo));
            lineas.add(new Linea(nombres[i] + " · consumo básico", basico + " m³", Math.round(basico * (double) m3)));
            if (compl > 0) lineas.add(new Linea(nombres[i] + " · consumo complementario", compl + " m³", Math.round(compl * (double) m3)));
            cf += fijo;
            vc += Math.round(consumo * (double) m3);
            sub += Math.round((fijo + basico * (double) m3) * pct);
        }
        if (sub > 0) lineas.add(new Linea("Subsidio estrato " + estrato + " (" + Math.round(pct * 100) + " %)", null, -sub));
        return new Liquidacion(cf, vc, sub, cf + vc - sub, true, lineas);
    }
}

package co.emcagua.api.caja;

import org.springframework.data.rest.core.annotation.HandleAfterCreate;
import org.springframework.data.rest.core.annotation.HandleBeforeCreate;
import org.springframework.data.rest.core.annotation.RepositoryEventHandler;
import org.springframework.stereotype.Component;

import co.emcagua.api.auditoria.AuditoriaServicio;
import co.emcagua.api.seguridad.Sesion;

@Component
@RepositoryEventHandler
public class EgresoEventos {
    private final AuditoriaServicio auditoria;

    public EgresoEventos(AuditoriaServicio auditoria) {
        this.auditoria = auditoria;
    }

    @HandleBeforeCreate
    public void antesDeCrear(Egreso e) {
        e.setRegistradoPor(Sesion.nombre());
    }

    @HandleAfterCreate
    public void despuesDeCrear(Egreso e) {
        auditoria.registrar("gastos", "EGRESO_REGISTRADO", "Registró gasto/egreso de $" + e.getValor() + ": " + e.getDescripcion(), "Egreso", e.getId() != null ? e.getId().toString() : null, "{\"valor\":" + e.getValor() + ",\"medio\":\"" + e.getMedio() + "\"}");
    }
}

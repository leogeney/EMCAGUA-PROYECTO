package co.emcagua.api.nomina;

import org.springframework.data.rest.core.annotation.HandleBeforeCreate;
import org.springframework.data.rest.core.annotation.HandleBeforeDelete;
import org.springframework.data.rest.core.annotation.HandleBeforeSave;
import org.springframework.data.rest.core.annotation.RepositoryEventHandler;
import org.springframework.stereotype.Component;

import co.emcagua.api.comun.ErrorNegocio;

/** Una nómina aprobada o pagada queda cerrada: ya no se le cambian novedades. */
@Component
@RepositoryEventHandler
public class NominaEventos {
    private static void abierta(NovedadNomina n) {
        if (n.getPeriodo() != null && n.getPeriodo().getEstado() != PeriodoNomina.Estado.BORRADOR)
            throw new ErrorNegocio("La nómina de ese mes ya fue aprobada; no se puede modificar");
    }

    @HandleBeforeCreate public void crear(NovedadNomina n) { abierta(n); }
    @HandleBeforeSave public void guardar(NovedadNomina n) { abierta(n); }
    @HandleBeforeDelete public void borrar(NovedadNomina n) { abierta(n); }
}

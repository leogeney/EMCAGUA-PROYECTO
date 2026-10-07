package co.emcagua.api.caja;

import org.springframework.data.rest.core.annotation.HandleBeforeCreate;
import org.springframework.data.rest.core.annotation.RepositoryEventHandler;
import org.springframework.stereotype.Component;

import co.emcagua.api.seguridad.Sesion;

@Component
@RepositoryEventHandler
public class EgresoEventos {
    @HandleBeforeCreate
    public void antesDeCrear(Egreso e) { e.setRegistradoPor(Sesion.nombre()); }
}

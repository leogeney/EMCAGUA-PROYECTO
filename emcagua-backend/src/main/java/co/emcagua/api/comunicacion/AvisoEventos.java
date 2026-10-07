package co.emcagua.api.comunicacion;

import java.time.Instant;

import org.springframework.data.rest.core.annotation.HandleBeforeCreate;
import org.springframework.data.rest.core.annotation.RepositoryEventHandler;
import org.springframework.stereotype.Component;

import co.emcagua.api.seguridad.Sesion;

@Component
@RepositoryEventHandler
public class AvisoEventos {
    @HandleBeforeCreate
    public void antesDeCrear(AvisoEnviado a) {
        a.setEnviadoPor(Sesion.nombre());
        if (a.getFecha() == null) a.setFecha(Instant.now());
    }
}

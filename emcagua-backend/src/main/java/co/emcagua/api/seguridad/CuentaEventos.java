package co.emcagua.api.seguridad;

import org.springframework.data.rest.core.annotation.HandleBeforeCreate;
import org.springframework.data.rest.core.annotation.HandleBeforeDelete;
import org.springframework.data.rest.core.annotation.HandleBeforeSave;
import org.springframework.data.rest.core.annotation.RepositoryEventHandler;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import co.emcagua.api.comun.ErrorNegocio;

/** Reglas al crear o editar cuentas y roles desde la API. */
@Component
@RepositoryEventHandler
public class CuentaEventos {
    private final PasswordEncoder cifrador;

    public CuentaEventos(PasswordEncoder cifrador) { this.cifrador = cifrador; }

    @HandleBeforeCreate
    public void antesDeCrear(Cuenta c) {
        if (c.getClave() == null || c.getClave().length() < 8) throw new ErrorNegocio("La contraseña debe tener al menos 8 caracteres");
        c.setClaveHash(cifrador.encode(c.getClave()));
    }

    @HandleBeforeSave
    public void antesDeGuardar(Cuenta c) {
        if (c.getClave() != null && !c.getClave().isBlank()) {
            if (c.getClave().length() < 8) throw new ErrorNegocio("La contraseña debe tener al menos 8 caracteres");
            c.setClaveHash(cifrador.encode(c.getClave()));
        }
    }

    @HandleBeforeDelete
    public void antesDeBorrarRol(Rol r) {
        if (r.isFijo()) throw new ErrorNegocio("El rol de Gerente no se puede borrar");
    }
}

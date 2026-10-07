package co.emcagua.api.comun;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Error que se le muestra tal cual al usuario (por ejemplo "La factura ya está pagada"). */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class ErrorNegocio extends RuntimeException {
    public ErrorNegocio(String mensaje) { super(mensaje); }
}

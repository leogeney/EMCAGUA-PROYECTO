package co.emcagua.api.seguridad;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import co.emcagua.api.comun.ErrorNegocio;

/** Acceso rápido a la cuenta del funcionario que hace la petición. */
public final class Sesion {
    private Sesion() {}

    public static Cuenta cuenta() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a != null && a.getPrincipal() instanceof Cuenta c) return c;
        throw new ErrorNegocio("No hay una sesión activa");
    }

    public static String nombre() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        return a != null && a.getPrincipal() instanceof Cuenta c ? c.getNombre() : "Sistema";
    }
}

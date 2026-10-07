package co.emcagua.api.seguridad;

import java.io.IOException;

import org.springframework.http.HttpMethod;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Cada recurso de la API pertenece a un módulo (ver Modulos). Si el rol del funcionario no tiene ese módulo,
 * la petición se rechaza con 403, igual que el menú del frontend no se lo muestra.
 */
@Component
public class FiltroPermisos extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain cadena) throws ServletException, IOException {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        String ruta = req.getRequestURI().substring(req.getContextPath().length());
        if (a != null && a.getPrincipal() instanceof Cuenta c && ruta.startsWith("/api/")) {
            String recurso = ruta.substring(5).split("[/?]")[0];
            String modulo = Modulos.moduloDe(recurso);
            boolean soloLee = HttpMethod.GET.matches(req.getMethod());
            if (modulo != null && !c.getRol().puede(modulo) && !(soloLee && Modulos.lecturaLibre(recurso))) {
                res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                res.setContentType("application/json;charset=UTF-8");
                res.getWriter().write("{\"error\":\"Tu rol no tiene permiso para el módulo " + modulo + "\"}");
                return;
            }
        }
        cadena.doFilter(req, res);
    }
}

package co.emcagua.api.seguridad;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Lee "Authorization: Bearer <token>" y deja la cuenta como usuario autenticado de la petición. */
@Component
public class FiltroJwt extends OncePerRequestFilter {
    private final JwtServicio jwt;
    private final CuentaRepositorio cuentas;

    public FiltroJwt(JwtServicio jwt, CuentaRepositorio cuentas) {
        this.jwt = jwt;
        this.cuentas = cuentas;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain cadena) throws ServletException, IOException {
        String h = req.getHeader(HttpHeaders.AUTHORIZATION);
        if (h != null && h.startsWith("Bearer ") && SecurityContextHolder.getContext().getAuthentication() == null) {
            String usuario = jwt.usuarioDe(h.substring(7));
            if (usuario != null) {
                cuentas.findByUsuario(usuario).filter(Cuenta::isActivo).ifPresent(c -> {
                    var auth = new UsernamePasswordAuthenticationToken(c, null, List.of(new SimpleGrantedAuthority("ROLE_" + c.getRol().getCodigo().toUpperCase())));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                });
            }
        }
        cadena.doFilter(req, res);
    }
}

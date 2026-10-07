package co.emcagua.api.seguridad;

import java.time.Instant;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.emcagua.api.comun.ErrorNegocio;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Sesión", description = "Entrar, ver la cuenta actual y cambiar la contraseña")
public class AuthControlador {
    private final CuentaRepositorio cuentas;
    private final PasswordEncoder cifrador;
    private final JwtServicio jwt;

    public AuthControlador(CuentaRepositorio cuentas, PasswordEncoder cifrador, JwtServicio jwt) {
        this.cuentas = cuentas;
        this.cifrador = cifrador;
        this.jwt = jwt;
    }

    public record Ingreso(@NotBlank String usuario, @NotBlank String clave) {}

    public record CuentaVista(Long id, String usuario, String nombre, String cargo, String rol, String rolNombre, boolean fijo, java.util.Set<String> permisos) {
        static CuentaVista de(Cuenta c) {
            return new CuentaVista(c.getId(), c.getUsuario(), c.getNombre(), c.getCargo(), c.getRol().getCodigo(), c.getRol().getNombre(), c.getRol().isFijo(), c.getRol().getPermisos());
        }
    }

    @Operation(summary = "Entrar con usuario y contraseña; devuelve el token de sesión")
    @PostMapping("/login")
    @Transactional
    public ResponseEntity<?> login(@Valid @RequestBody Ingreso i) {
        Cuenta c = cuentas.findByUsuario(i.usuario().trim().toLowerCase()).orElse(null);
        // Mismo mensaje si no existe o si la clave está mal: no se revela qué usuarios existen
        if (c == null || !cifrador.matches(i.clave(), c.getClaveHash())) return ResponseEntity.status(401).body(Map.of("error", "Usuario o contraseña incorrectos"));
        if (!c.isActivo()) return ResponseEntity.status(403).body(Map.of("error", "Esta cuenta está desactivada. Habla con el gerente."));
        c.setUltimoAcceso(Instant.now());
        return ResponseEntity.ok(Map.of("token", jwt.crear(c), "expiraEnSegundos", jwt.segundosDeVida(), "cuenta", CuentaVista.de(c)));
    }

    @Operation(summary = "Datos y permisos de la cuenta con la que se entró")
    @GetMapping("/yo")
    public CuentaVista yo() { return CuentaVista.de(Sesion.cuenta()); }

    public record CambioClave(@NotBlank String actual, @NotBlank String nueva) {}

    @Operation(summary = "Cambiar la contraseña propia")
    @PostMapping("/clave")
    @Transactional
    public Map<String, String> cambiarClave(@Valid @RequestBody CambioClave cc) {
        Cuenta c = cuentas.findById(Sesion.cuenta().getId()).orElseThrow();
        if (!cifrador.matches(cc.actual(), c.getClaveHash())) throw new ErrorNegocio("La contraseña actual no es correcta");
        if (cc.nueva().length() < 8) throw new ErrorNegocio("La nueva contraseña debe tener al menos 8 caracteres");
        c.setClaveHash(cifrador.encode(cc.nueva()));
        return Map.of("mensaje", "Contraseña actualizada");
    }
}

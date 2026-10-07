package co.emcagua.api.seguridad;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Service;

import co.emcagua.api.comun.EmcaguaProps;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/** Crea y valida el token de sesión (JWT) que el frontend envía en cada petición. */
@Service
public class JwtServicio {
    private final SecretKey clave;
    private final Duration duracion;

    public JwtServicio(EmcaguaProps props) {
        byte[] bytes = props.secreto().getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) throw new IllegalStateException("emcagua.secreto debe tener al menos 32 caracteres");
        this.clave = Keys.hmacShaKeyFor(bytes);
        this.duracion = Duration.ofHours(Math.max(1, props.sesionHoras()));
    }

    public String crear(Cuenta c) {
        Instant ahora = Instant.now();
        return Jwts.builder()
            .subject(c.getUsuario())
            .claim("rol", c.getRol().getCodigo())
            .claim("nombre", c.getNombre())
            .issuedAt(Date.from(ahora))
            .expiration(Date.from(ahora.plus(duracion)))
            .signWith(clave)
            .compact();
    }

    /** Devuelve el usuario del token, o null si es inválido o venció. */
    public String usuarioDe(String token) {
        try {
            Claims c = Jwts.parser().verifyWith(clave).build().parseSignedClaims(token).getPayload();
            return c.getSubject();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    public long segundosDeVida() { return duracion.toSeconds(); }
}

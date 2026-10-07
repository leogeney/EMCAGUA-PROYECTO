package co.emcagua.api.seguridad;

import java.util.List;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import co.emcagua.api.comun.EmcaguaProps;

@Configuration
public class SeguridadConfig {

    @Bean
    PasswordEncoder cifrador() { return new BCryptPasswordEncoder(); }

    @Bean
    SecurityFilterChain cadena(HttpSecurity http, FiltroJwt jwt, FiltroPermisos permisos) throws Exception {
        http
            .csrf(c -> c.disable())
            .cors(c -> {})
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                // Públicos: entrar, verificar documentos (QR), portal del usuario y documentación de la API
                .requestMatchers("/api/auth/login", "/api/verificar/**", "/api/portal/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/configuracion/publica").permitAll()
                .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**", "/error").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // Las pantallas del frontend (index.html, JS, imágenes) son públicas; los datos están en /api y piden sesión
                .requestMatchers(req -> !req.getRequestURI().startsWith("/api/")).permitAll()
                .anyRequest().authenticated())
            .exceptionHandling(e -> e.authenticationEntryPoint((req, res, ex) -> {
                res.setStatus(401);
                res.setContentType("application/json;charset=UTF-8");
                res.getWriter().write("{\"error\":\"Inicia sesión para continuar\"}");
            }))
            .addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(permisos, FiltroJwt.class);
        return http.build();
    }

    /** Los filtros son @Component: se desactiva su registro automático para que solo corran dentro de la cadena de seguridad. */
    @Bean
    FilterRegistrationBean<FiltroJwt> noRegistrarJwt(FiltroJwt f) { var r = new FilterRegistrationBean<>(f); r.setEnabled(false); return r; }

    @Bean
    FilterRegistrationBean<FiltroPermisos> noRegistrarPermisos(FiltroPermisos f) { var r = new FilterRegistrationBean<>(f); r.setEnabled(false); return r; }

    /** El nombre del bean debe ser "corsConfigurationSource" para que .cors() de Spring Security lo use. */
    @Bean
    CorsConfigurationSource corsConfigurationSource(EmcaguaProps props) {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOriginPatterns(List.of((props.frontend() + ",http://localhost:*,http://127.0.0.1:*").split(",")));
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("*"));
        c.setExposedHeaders(List.of("Location"));
        UrlBasedCorsConfigurationSource s = new UrlBasedCorsConfigurationSource();
        s.registerCorsConfiguration("/**", c);
        return s;
    }
}

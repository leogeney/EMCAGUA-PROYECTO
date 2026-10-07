package co.emcagua.api.empresa;

import java.util.Map;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/configuracion")
@Tag(name = "Configuración", description = "Datos de la empresa y parámetros de operación")
public class ConfiguracionControlador {
    private final ConfiguracionServicio servicio;
    private final ConfiguracionRepositorio repo;

    public ConfiguracionControlador(ConfiguracionServicio servicio, ConfiguracionRepositorio repo) {
        this.servicio = servicio;
        this.repo = repo;
    }

    @Operation(summary = "Configuración completa (funcionarios)")
    @GetMapping
    public Configuracion ver() { return servicio.actual(); }

    @Operation(summary = "Datos públicos de contacto (portal del usuario y verificación de documentos)")
    @GetMapping("/publica")
    public Map<String, String> publica() {
        Configuracion c = servicio.actual();
        // Map.of no acepta null: un campo vacío guardado como null tumbaría este servicio público
        return Map.of("nombre", txt(c.getNombre()), "ciudad", txt(c.getCiudad()), "telefono", txt(c.getTelefono()), "whatsapp", txt(c.getWhatsapp()), "horario", txt(c.getHorario()), "direccion", txt(c.getDireccion()), "correo", txt(c.getCorreo()));
    }

    private static String txt(String s) { return s == null ? "" : s; }

    @Operation(summary = "Guardar la configuración (módulo Configuración)")
    @PutMapping
    @Transactional
    public Configuracion guardar(@Valid @RequestBody Configuracion nueva) {
        Configuracion c = servicio.actual();
        nueva.setId(c.getId());
        nueva.setVersion(c.getVersion());
        nueva.setCreado(c.getCreado());
        return repo.save(nueva);
    }
}

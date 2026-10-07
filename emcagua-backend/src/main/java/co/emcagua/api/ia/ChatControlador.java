package co.emcagua.api.ia;

import java.time.Instant;
import java.util.List;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.emcagua.api.comun.NoEncontrado;
import co.emcagua.api.seguridad.Sesion;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/chats")
@Tag(name = "Asistente IA", description = "Conversaciones guardadas con Gotita (cada funcionario ve las suyas)")
public class ChatControlador {
    private final ConversacionRepositorio repo;

    public ChatControlador(ConversacionRepositorio repo) { this.repo = repo; }

    public record MensajeDto(String rol, String texto, String fuente) {}
    public record ChatDto(Long id, String titulo, Instant creada, Instant actualizada, List<MensajeDto> mensajes) {}
    public record Guardar(String titulo, List<MensajeDto> mensajes) {}

    private static ChatDto dto(Conversacion c, boolean conMensajes) {
        return new ChatDto(c.getId(), c.getTitulo(), c.getCreado(), c.getActualizado(),
            conMensajes ? c.getMensajes().stream().map(m -> new MensajeDto(m.getRol(), m.getTexto(), m.getFuente())).toList() : List.of());
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ChatDto> lista() { return repo.findTop60ByCuentaOrderByActualizadoDesc(Sesion.cuenta()).stream().map(c -> dto(c, true)).toList(); }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ChatDto ver(@PathVariable Long id) { return dto(buscar(id), true); }

    @PostMapping
    @Transactional
    public ChatDto crear(@RequestBody Guardar g) {
        Conversacion c = new Conversacion();
        c.setCuenta(Sesion.cuenta());
        llenar(c, g);
        return dto(repo.save(c), true);
    }

    @PutMapping("/{id}")
    @Transactional
    public ChatDto guardar(@PathVariable Long id, @RequestBody Guardar g) {
        Conversacion c = buscar(id);
        llenar(c, g);
        return dto(repo.save(c), true);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public void borrar(@PathVariable Long id) { repo.delete(buscar(id)); }

    private Conversacion buscar(Long id) { return repo.findByIdAndCuenta(id, Sesion.cuenta()).orElseThrow(() -> new NoEncontrado("No existe ese chat")); }

    private static void llenar(Conversacion c, Guardar g) {
        String t = g.titulo() == null || g.titulo().isBlank() ? "Chat" : g.titulo().trim();
        c.setTitulo(t.length() > 120 ? t.substring(0, 120) : t);
        if (g.mensajes() != null) {
            c.getMensajes().clear();
            g.mensajes().forEach(m -> c.getMensajes().add(new Conversacion.Mensaje(m.rol(), m.texto(), m.fuente())));
        }
    }
}

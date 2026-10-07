package co.emcagua.api.pqr;

import java.util.List;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.emcagua.api.seguridad.Sesion;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/pqr")
@Tag(name = "PQR", description = "Radicar, asignar, responder y cerrar PQR con su plazo legal")
public class PqrControlador {
    private final PqrServicio servicio;
    private final EventoPqrRepositorio eventos;

    public PqrControlador(PqrServicio servicio, EventoPqrRepositorio eventos) {
        this.servicio = servicio;
        this.eventos = eventos;
    }

    @Operation(summary = "Radicar una PQR (asigna radicado y fecha límite de 15 días hábiles)")
    @PostMapping("/radicar")
    public Pqr radicar(@RequestBody PqrServicio.Radicacion r) { return servicio.radicar(r, Sesion.nombre()); }

    public record Texto(String texto) {}

    @PostMapping("/{radicado}/asignar")
    public Pqr asignar(@PathVariable String radicado, @RequestBody Texto t) { return servicio.asignar(radicado, t.texto(), Sesion.nombre()); }

    @PostMapping("/{radicado}/responder")
    public Pqr responder(@PathVariable String radicado, @RequestBody Texto t) { return servicio.responder(radicado, t.texto(), Sesion.nombre()); }

    @PostMapping("/{radicado}/cerrar")
    public Pqr cerrar(@PathVariable String radicado) { return servicio.cerrar(radicado, Sesion.nombre()); }

    public record Evento(String fecha, String usuario, String accion) {}

    @Operation(summary = "Historial de una PQR")
    @GetMapping("/{radicado}/historial")
    @Transactional(readOnly = true)
    public List<Evento> historial(@PathVariable String radicado) {
        return eventos.findByPqrOrderByFechaAsc(servicio.buscar(radicado)).stream().map(e -> new Evento(e.getFecha().toString(), e.getUsuario(), e.getAccion())).toList();
    }
}

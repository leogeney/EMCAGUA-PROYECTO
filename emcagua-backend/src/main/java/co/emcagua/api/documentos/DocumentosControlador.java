package co.emcagua.api.documentos;

import java.time.Instant;
import java.time.Year;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.emcagua.api.comun.ErrorNegocio;
import co.emcagua.api.comun.NoEncontrado;
import co.emcagua.api.seguridad.Sesion;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@RestController
@RequestMapping("/api/emision")
@Tag(name = "Documentos", description = "Emitir documentos con consecutivo y QR, y anularlos")
public class DocumentosControlador {
    private final DocumentoRepositorio repo;
    private final VerificacionServicio verificacion;

    public DocumentosControlador(DocumentoRepositorio repo, VerificacionServicio verificacion) {
        this.repo = repo;
        this.verificacion = verificacion;
    }

    public record Emision(@NotBlank @Pattern(regexp = "[A-Z]{2,4}") String prefijo, @NotBlank String plantillaId, @NotBlank String nombre, @NotBlank String dirigidoA, String sujetoId, String formato, String contenido) {}

    @Operation(summary = "Emitir un documento: asigna el consecutivo (EMC-PS-2026-001) y su código de verificación")
    @PostMapping
    @Transactional
    public DocumentoEmitido emitir(@Valid @RequestBody Emision e) {
        String base = "EMC-%s-%d-".formatted(e.prefijo(), Year.now().getValue());
        DocumentoEmitido d = new DocumentoEmitido();
        d.setConsecutivo(base + "%03d".formatted(repo.countByConsecutivoStartingWith(base) + 1));
        d.setPlantillaId(e.plantillaId());
        d.setNombre(e.nombre());
        d.setDirigidoA(e.dirigidoA());
        d.setSujetoId(e.sujetoId());
        d.setFormato(e.formato());
        d.setContenido(e.contenido());
        d.setEmitido(Instant.now());
        d.setEmitidoPor(Sesion.nombre());
        d.setCodigoVerificacion(verificacion.codigoDocumento(d.getConsecutivo(), d.getPlantillaId(), d.getDirigidoA(), d.getEmitido()));
        return repo.save(d);
    }

    public record Anulacion(@NotBlank String motivo) {}

    @Operation(summary = "Anular un documento: quien escanee su QR verá que ya no es válido")
    @PostMapping("/{consecutivo}/anular")
    @Transactional
    public DocumentoEmitido anular(@PathVariable String consecutivo, @Valid @RequestBody Anulacion a) {
        DocumentoEmitido d = repo.findByConsecutivo(consecutivo).orElseThrow(() -> new NoEncontrado("No existe el documento " + consecutivo));
        if (d.getAnulado() != null) throw new ErrorNegocio("El documento ya estaba anulado");
        d.setAnulado(Instant.now());
        d.setAnuladoPor(Sesion.nombre());
        d.setMotivoAnulacion(a.motivo());
        return repo.save(d);
    }
}

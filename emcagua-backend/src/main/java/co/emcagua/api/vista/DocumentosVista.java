package co.emcagua.api.vista;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.emcagua.api.documentos.DocumentoEmitido;
import co.emcagua.api.documentos.DocumentoRepositorio;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Documentos emitidos (con su contenido para volver a descargarlos) como los usa la pantalla de Documentos. */
@RestController
@RequestMapping("/api/vista/documentos")
@Tag(name = "Vista (frontend)")
public class DocumentosVista {
    private final DocumentoRepositorio repo;

    public DocumentosVista(DocumentoRepositorio repo) { this.repo = repo; }

    static Map<String, Object> dto(DocumentoEmitido d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("consecutivo", d.getConsecutivo());
        m.put("plantillaId", d.getPlantillaId());
        m.put("nombre", d.getNombre());
        m.put("dirigidoA", d.getDirigidoA());
        if (d.getSujetoId() != null) m.put("sujetoId", d.getSujetoId());
        m.put("formato", d.getFormato() == null ? "docx" : d.getFormato());
        m.put("contenido", d.getContenido() == null ? "" : d.getContenido());
        m.put("ts", d.getEmitido().toEpochMilli());
        m.put("usuario", d.getEmitidoPor() == null ? "" : d.getEmitidoPor());
        m.put("codigo", d.getCodigoVerificacion() == null ? "" : d.getCodigoVerificacion());
        if (d.getAnulado() != null)
            m.put("anulado", Map.of("ts", d.getAnulado().toEpochMilli(), "usuario", d.getAnuladoPor() == null ? "" : d.getAnuladoPor(), "motivo", d.getMotivoAnulacion() == null ? "" : d.getMotivoAnulacion()));
        return m;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<Map<String, Object>> lista() {
        AdministracionVista.exigir("documentos");
        return repo.findAll().stream().sorted(Comparator.comparing(DocumentoEmitido::getEmitido).reversed()).map(DocumentosVista::dto).toList();
    }
}

package co.emcagua.api.respaldos;

import java.nio.file.Path;
import java.util.Map;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.emcagua.api.comun.ErrorNegocio;
import co.emcagua.api.seguridad.Sesion;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Copias de seguridad (solo el gerente): ver las que hay, hacer una ahora y descargarla. */
@RestController
@RequestMapping("/api/vista/respaldos")
@Tag(name = "Copias de seguridad")
public class RespaldoControlador {
    private final RespaldoServicio servicio;

    public RespaldoControlador(RespaldoServicio servicio) { this.servicio = servicio; }

    private static void soloGerente() {
        if (!Sesion.cuenta().getRol().isFijo()) throw new ErrorNegocio("Solo el gerente puede manejar las copias de seguridad");
    }

    @Operation(summary = "Copias guardadas, carpeta y último error")
    @GetMapping
    public RespaldoServicio.Estado estado() {
        soloGerente();
        return servicio.estado();
    }

    @Operation(summary = "Hacer una copia de seguridad ahora")
    @PostMapping
    public Map<String, Object> ahora() {
        soloGerente();
        var a = servicio.respaldar();
        return Map.of("nombre", a.nombre(), "bytes", a.bytes(), "fecha", a.fecha().toString());
    }

    @Operation(summary = "Descargar una copia (para guardarla en una memoria USB o en la nube)")
    @GetMapping("/{nombre}")
    public ResponseEntity<Resource> descargar(@PathVariable String nombre) {
        soloGerente();
        Path p = servicio.archivo(nombre);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + p.getFileName() + "\"")
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .body(new FileSystemResource(p));
    }
}

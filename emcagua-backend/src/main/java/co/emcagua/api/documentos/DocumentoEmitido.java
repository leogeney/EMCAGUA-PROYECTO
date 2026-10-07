package co.emcagua.api.documentos;

import java.time.Instant;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Documento oficial expedido (paz y salvo, certificado, carta de cobro...). Queda con su consecutivo y se puede anular. */
@Entity
@Table(name = "documento_emitido")
@Getter
@Setter
@NoArgsConstructor
public class DocumentoEmitido extends Entidad {
    /** EMC-PS-2026-001 */
    @Column(nullable = false, unique = true, length = 30)
    private String consecutivo;

    @Column(nullable = false, length = 40) private String plantillaId;
    @Column(nullable = false, length = 120) private String nombre;
    @Column(nullable = false, length = 200) private String dirigidoA;

    /** Código del predio, id del empleado o radicado de PQR al que se refiere. */
    @Column(length = 40) private String sujetoId;

    @Column(length = 20) private String formato;

    /** Contenido del documento (JSON del borrador: asunto, cuerpo, tabla, firmas). */
    @Column(columnDefinition = "text")
    private String contenido;

    @Column(nullable = false) private Instant emitido;
    @Column(length = 120) private String emitidoPor;
    @Column(length = 9) private String codigoVerificacion;

    private Instant anulado;
    @Column(length = 120) private String anuladoPor;
    @Column(length = 300) private String motivoAnulacion;
}

package co.emcagua.api.pqr;

import java.time.Instant;
import java.time.LocalDate;

import co.emcagua.api.comun.Entidad;
import co.emcagua.api.suscriptores.Predio;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Petición, queja, reclamo o recurso. Plazo legal de respuesta: 15 días hábiles (Ley 142, art. 158). */
@Entity
@Table(name = "pqr")
@Getter
@Setter
@NoArgsConstructor
public class Pqr extends Entidad {
    public enum Tipo { PETICION, QUEJA, RECLAMO, RECURSO, SUGERENCIA }
    public enum Categoria { FACTURACION, DANO_O_FUGA, CALIDAD_DEL_AGUA, CORTE_Y_RECONEXION, ATENCION, OTRO }
    public enum Canal { PRESENCIAL, TELEFONO, WHATSAPP, CORREO, PORTAL_WEB }
    public enum Estado { RADICADA, EN_TRAMITE, RESPONDIDA, CERRADA }

    /** PQR-2026-0001 */
    @Column(nullable = false, unique = true, length = 20)
    private String radicado;

    @NotNull @Enumerated(EnumType.STRING) @Column(nullable = false, length = 12) private Tipo tipo;
    @NotNull @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Categoria categoria;
    @NotNull @Enumerated(EnumType.STRING) @Column(nullable = false, length = 12) private Canal canal;

    /** Predio relacionado (puede ser null si la persona no es suscriptora). */
    @ManyToOne(fetch = FetchType.EAGER)
    private Predio predio;

    @NotBlank @Column(nullable = false, length = 120) private String nombre;
    @Column(length = 10) private String telefono;
    @Column(length = 40) private String barrio;

    @NotBlank
    @Column(nullable = false, columnDefinition = "text")
    private String descripcion;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 12) private Estado estado = Estado.RADICADA;

    @Column(nullable = false) private Instant radicadaEn;
    @Column(nullable = false) private LocalDate vence;
    @Column(length = 120) private String responsable;

    @Column(columnDefinition = "text")
    private String respuesta;
    private Instant respondidaEn;
}

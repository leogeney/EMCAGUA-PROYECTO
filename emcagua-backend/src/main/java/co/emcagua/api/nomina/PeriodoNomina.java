package co.emcagua.api.nomina;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Nómina de un mes: borrador → aprobada → pagada. Aprobada ya no se puede editar. */
@Entity
@Table(name = "periodo_nomina", uniqueConstraints = @UniqueConstraint(columnNames = { "anio", "mes" }))
@Getter
@Setter
@NoArgsConstructor
public class PeriodoNomina extends Entidad {
    public enum Estado { BORRADOR, APROBADA, PAGADA }

    @Min(2020) private int anio;
    @Min(1) @Max(12) private int mes;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 10) private Estado estado = Estado.BORRADOR;
    @Column(length = 120) private String aprobadaPor;
    private Instant aprobadaEn;
    /** Totales al aprobar (para reportes rápidos). */
    private long totalDevengado;
    private long totalDeducciones;
    private long totalNeto;
    private long costoEmpresa;

    /** Bitácora: quién creó, editó, aprobó o pagó la nómina. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "periodo_nomina_evento", joinColumns = @JoinColumn(name = "periodo_id"))
    @OrderColumn(name = "orden")
    private List<Evento> bitacora = new ArrayList<>();

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    public static class Evento {
        @Column(nullable = false) private Instant fecha;
        @Column(length = 120) private String usuario;
        @Column(nullable = false, length = 300) private String accion;

        public Evento(String usuario, String accion) {
            this.fecha = Instant.now();
            this.usuario = usuario;
            this.accion = accion.length() > 300 ? accion.substring(0, 300) : accion;
        }
    }
}

package co.emcagua.api.suscriptores;

import java.math.BigDecimal;
import java.time.Instant;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Lectura acumulada del medidor (m³). El consumo de un mes es la diferencia entre dos lecturas. */
@Entity
@Table(name = "lectura", indexes = @Index(name = "ix_lectura_medidor_fecha", columnList = "medidor_id, fecha"))
@Getter
@Setter
@NoArgsConstructor
public class Lectura extends Entidad {
    public enum Origen { TELEMETRIA, MANUAL }

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Medidor medidor;

    @NotNull
    @Column(nullable = false)
    private Instant fecha;

    @NotNull
    @PositiveOrZero
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal valor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Origen origen = Origen.TELEMETRIA;

    /** "Telemetría" o el funcionario que la tomó en sitio. */
    @Column(length = 120)
    private String lector;

    @Column(length = 300)
    private String nota;

    /** Foto del medidor (lecturas en sitio). */
    @Column(length = 300)
    private String fotoUrl;

    /** Foto del medidor tomada en sitio (data URL). */
    @Column(columnDefinition = "text")
    private String fotoImagen;

    public Lectura(Medidor medidor, Instant fecha, BigDecimal valor, Origen origen, String lector) {
        this.medidor = medidor;
        this.fecha = fecha;
        this.valor = valor;
        this.origen = origen;
        this.lector = lector;
    }
}

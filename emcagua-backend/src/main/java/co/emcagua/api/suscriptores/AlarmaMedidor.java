package co.emcagua.api.suscriptores;

import java.time.Instant;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Alarma reportada por un medidor inteligente (fuga, sin comunicación, manipulación...). */
@Entity
@Table(name = "alarma_medidor")
@Getter
@Setter
@NoArgsConstructor
public class AlarmaMedidor extends Entidad {
    public enum Tipo { FUGA, SIN_COMUNICACION, MANIPULACION, ATIPICO, FLUJO_INVERSO, SIN_CONSUMO }

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    private Medidor medidor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Tipo tipo;

    @Column(length = 300)
    private String detalle;

    @Column(nullable = false)
    private Instant detectada;

    /** Cuándo se atendió; null = sigue abierta. */
    private Instant resuelta;

    @Column(length = 120)
    private String resueltaPor;

    public AlarmaMedidor(Medidor medidor, Tipo tipo, String detalle, Instant detectada) {
        this.medidor = medidor;
        this.tipo = tipo;
        this.detalle = detalle;
        this.detectada = detectada;
    }
}

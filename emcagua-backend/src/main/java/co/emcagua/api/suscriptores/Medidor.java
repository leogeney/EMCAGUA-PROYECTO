package co.emcagua.api.suscriptores;

import java.time.Instant;
import java.time.LocalDate;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Medidor inteligente instalado en un predio. Reporta su lectura por telemetría. */
@Entity
@Table(name = "medidor")
@Getter
@Setter
@NoArgsConstructor
public class Medidor extends Entidad {
    public enum Tipo { INTELIGENTE, MECANICO }

    @NotBlank
    @Column(nullable = false, unique = true, length = 30)
    private String serial;

    @OneToOne(fetch = FetchType.EAGER)
    private Predio predio;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private Tipo tipo = Tipo.INTELIGENTE;

    private LocalDate instalado;

    /** Última vez que el medidor se comunicó (telemetría). */
    private Instant ultimaComunicacion;

    /** Calidad del enlace de comunicación (0-100 %). */
    private Integer senal;

    public Medidor(String serial, Predio predio, LocalDate instalado) {
        this.serial = serial;
        this.predio = predio;
        this.instalado = instalado;
    }
}

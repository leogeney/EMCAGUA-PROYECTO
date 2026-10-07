package co.emcagua.api.caja;

import java.time.LocalDate;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Gasto de la empresa (energía, químicos, combustible...). Los pagados en efectivo salen de la caja del día. */
@Entity
@Table(name = "egreso")
@Getter
@Setter
@NoArgsConstructor
public class Egreso extends Entidad {
    public enum Categoria { QUIMICOS_Y_MATERIALES, COMBUSTIBLE_Y_TRANSPORTE, ENERGIA_Y_SERVICIOS, MANTENIMIENTO_DE_PLANTA, HONORARIOS_Y_ASESORIAS, PAPELERIA_Y_OFICINA, IMPUESTOS_Y_TASAS, OTROS }
    public enum Medio { EFECTIVO_CAJA, TRANSFERENCIA }

    @NotNull private LocalDate fecha;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Categoria categoria;

    @NotBlank @Column(nullable = false, length = 200) private String descripcion;
    @Column(length = 120) private String proveedor;
    @Positive private long valor;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private Medio medio;

    /** Factura o soporte escaneado. */
    @Column(length = 300) private String soporte;
    /** Foto de la factura del gasto (data URL), cuando se adjunta desde la pantalla. */
    @Column(columnDefinition = "text") private String soporteImagen;

    @Column(length = 120) private String registradoPor;
}

package co.emcagua.api.caja;

import java.time.LocalDate;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Arqueo del día: lo que dice el sistema frente a lo que se contó. */
@Entity
@Table(name = "cierre_caja")
@Getter
@Setter
@NoArgsConstructor
public class CierreCaja extends Entidad {
    @Column(nullable = false, unique = true)
    private LocalDate fecha;

    @Column(length = 120) private String cajero;
    private long base;
    private long efectivoSistema;
    private long efectivoContado;
    private long egresosEfectivo;
    private long transferencias;
    private long enLinea;
    /** contado − (base + efectivo − egresos): negativo = faltante, positivo = sobrante. */
    private long diferencia;
    @Column(length = 300) private String nota;
}

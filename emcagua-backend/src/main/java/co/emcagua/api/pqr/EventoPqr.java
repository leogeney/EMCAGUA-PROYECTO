package co.emcagua.api.pqr;

import java.time.Instant;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Historial de lo que pasó con una PQR (radicada, asignada, respondida...). */
@Entity
@Table(name = "evento_pqr")
@Getter
@Setter
@NoArgsConstructor
public class EventoPqr extends Entidad {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Pqr pqr;

    @Column(nullable = false) private Instant fecha;
    @Column(length = 120) private String usuario;
    @Column(nullable = false, length = 300) private String accion;

    public EventoPqr(Pqr pqr, String usuario, String accion) {
        this.pqr = pqr;
        this.fecha = Instant.now();
        this.usuario = usuario;
        this.accion = accion;
    }
}

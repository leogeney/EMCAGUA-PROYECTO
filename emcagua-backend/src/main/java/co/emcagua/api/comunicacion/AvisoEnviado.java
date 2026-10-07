package co.emcagua.api.comunicacion;

import java.time.Instant;

import co.emcagua.api.comun.Entidad;
import co.emcagua.api.suscriptores.Predio;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Registro de cada aviso por WhatsApp (a quién, qué plantilla y cuándo). Sirve de soporte de que se avisó antes de suspender. */
@Entity
@Table(name = "aviso_enviado")
@Getter
@Setter
@NoArgsConstructor
public class AvisoEnviado extends Entidad {
    @ManyToOne(fetch = FetchType.EAGER) private Predio predio;
    @Column(nullable = false, length = 10) private String telefono;
    @Column(nullable = false, length = 30) private String plantilla;
    @Column(nullable = false, columnDefinition = "text") private String mensaje;
    @Column(length = 120) private String enviadoPor;
    @Column(nullable = false) private Instant fecha;
}

package co.emcagua.api.suscriptores;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonIgnore;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Persona que se registra sola desde la oficina virtual. No se factura nada hasta que un funcionario
 * revisa los datos (estrato, dirección, medidor) y la aprueba: ahí se crea el predio con su cuenta.
 */
@Entity
@Table(name = "solicitud_registro")
@Getter
@Setter
public class SolicitudRegistro extends Entidad {
    public enum Estado { PENDIENTE, APROBADA, RECHAZADA }

    @Column(nullable = false, unique = true, length = 20) private String radicado;
    @Column(nullable = false, length = 120) private String nombre;
    @Column(nullable = false, length = 15) private String cedula;
    @Column(nullable = false, length = 10) private String telefono;
    @Column(length = 120) private String correo;
    @Column(nullable = false, length = 200) private String direccion;
    @Column(length = 80) private String sector;
    @Column(length = 80) private String barrio;
    private int estrato = 1;
    private boolean conMedidor;
    @Column(length = 40) private String medidor;
    @Column(length = 500) private String observacion;

    /** Contraseña elegida por la persona (BCrypt). Pasa a su cuenta de la oficina virtual al aprobar. */
    @JsonIgnore
    @Column(nullable = false, length = 100) private String clave;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12) private Estado estado = Estado.PENDIENTE;
    @Column(length = 300) private String motivo;
    @Column(length = 60) private String revisadaPor;
    private Instant revisadaEn;
    /** Código del predio creado al aprobar. */
    @Column(length = 10) private String predio;
}

package co.emcagua.api.auditoria;

import java.time.Instant;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Registro de auditoría para trazabilidad de operaciones realizadas en el sistema.
 * Guarda quién hizo qué, cuándo, en qué módulo, desde qué IP y con qué detalles.
 */
@Entity
@Table(name = "auditoria_log", indexes = {
    @Index(name = "idx_auditoria_fecha", columnList = "fecha"),
    @Index(name = "idx_auditoria_usuario", columnList = "usuario"),
    @Index(name = "idx_auditoria_modulo", columnList = "modulo"),
    @Index(name = "idx_auditoria_accion", columnList = "accion")
})
@Getter
@Setter
@NoArgsConstructor
public class AuditoriaLog extends Entidad {

    @Column(nullable = false)
    private Instant fecha = Instant.now();

    @Column(nullable = false, length = 60)
    private String usuario; // e.g., "admin", "yaneth", "sistema"

    @Column(length = 120)
    private String nombreUsuario; // e.g., "Administrador", "Yaneth Quintero"

    @Column(length = 60)
    private String rol; // e.g., "Gerente", "Cajera"

    @Column(nullable = false, length = 40)
    private String modulo; // "caja", "facturacion", "usuarios", "pqr", "inventario", "tarifas", "nomina", "documentos", "seguridad", "configuracion"

    @Column(nullable = false, length = 60)
    private String accion; // "COBRO", "CIERRE_CAJA", "EGRESO", "CIERRE_FACTURACION", "PQR_RADICAR", "PQR_RESPONDER", "PQR_CERRAR", "CREAR_USUARIO", "EDITAR_USUARIO", "CAMBIO_CLAVE", "LOGIN", "TARIFA_GUARDAR", "MOVIMIENTO_INVENTARIO", "EMITIR_DOCUMENTO", "ANULAR_DOCUMENTO"

    @Column(nullable = false, length = 600)
    private String descripcion; // Resumen claro y entendible para humanos

    @Column(length = 60)
    private String entidadTipo; // "Pago", "Factura", "Pqr", "Predio", "Tarifa", "Empleado", "Documento", "Cuenta", "Material"

    @Column(length = 100)
    private String entidadId; // "REC-2026-0042", "1001", "PQR-2026-0001", etc.

    @Column(columnDefinition = "TEXT")
    private String detalle; // JSON o texto adicional estructurado con los valores de la operación

    @Column(length = 60)
    private String ip; // Dirección IP del cliente

    public AuditoriaLog(String usuario, String nombreUsuario, String rol, String modulo, String accion,
                        String descripcion, String entidadTipo, String entidadId, String detalle, String ip) {
        this.fecha = Instant.now();
        this.usuario = usuario != null ? usuario : "sistema";
        this.nombreUsuario = nombreUsuario != null ? nombreUsuario : this.usuario;
        this.rol = rol != null ? rol : "Sistema";
        this.modulo = modulo != null ? modulo.toLowerCase() : "general";
        this.accion = accion != null ? accion.toUpperCase() : "OPERACION";
        this.descripcion = descripcion != null ? descripcion : "";
        this.entidadTipo = entidadTipo;
        this.entidadId = entidadId;
        this.detalle = detalle;
        this.ip = ip;
    }
}

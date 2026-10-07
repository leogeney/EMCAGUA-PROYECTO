package co.emcagua.api.comun;

import java.time.Instant;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

/** Campos comunes de todas las tablas: id, fecha de creación, última modificación y versión (evita que dos personas se pisen los cambios). */
@MappedSuperclass
@Getter
@Setter
public abstract class Entidad {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant creado;

    @UpdateTimestamp
    private Instant actualizado;

    @Version
    private Long version;
}

package co.emcagua.api.suscriptores;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "lecturas", collectionResourceRel = "lecturas")
public interface LecturaRepositorio extends JpaRepository<Lectura, Long> {
    /** Última lectura del medidor tomada antes de una fecha (para el cierre del mes). */
    Optional<Lectura> findFirstByMedidorAndFechaLessThanOrderByFechaDesc(Medidor medidor, Instant antes);

    List<Lectura> findByMedidorOrderByFechaDesc(Medidor medidor);
}

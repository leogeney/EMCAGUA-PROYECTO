package co.emcagua.api.pqr;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "eventos-pqr", collectionResourceRel = "eventos", exported = false)
public interface EventoPqrRepositorio extends JpaRepository<EventoPqr, Long> {
    List<EventoPqr> findByPqrOrderByFechaAsc(Pqr pqr);
}

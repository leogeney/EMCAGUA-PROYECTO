package co.emcagua.api.caja;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "egresos", collectionResourceRel = "egresos")
public interface EgresoRepositorio extends JpaRepository<Egreso, Long> {
    List<Egreso> findByFechaBetweenOrderByFechaDesc(LocalDate desde, LocalDate hasta);
}

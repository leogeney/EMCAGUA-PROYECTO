package co.emcagua.api.suscriptores;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "barrios", collectionResourceRel = "barrios")
public interface BarrioRepositorio extends JpaRepository<Barrio, Long> {
    Optional<Barrio> findBySectorAndNombreIgnoreCase(Sector sector, String nombre);

    List<Barrio> findBySectorOrderByNombreAsc(Sector sector);

    long countBySector(Sector sector);
}

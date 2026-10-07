package co.emcagua.api.suscriptores;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "sectores", collectionResourceRel = "sectores")
public interface SectorRepositorio extends JpaRepository<Sector, Long> {
    Optional<Sector> findByNombreIgnoreCase(String nombre);

    List<Sector> findAllByOrderByOrdenAscNombreAsc();
}

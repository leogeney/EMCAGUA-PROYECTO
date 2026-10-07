package co.emcagua.api.suscriptores;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "predios", collectionResourceRel = "predios")
public interface PredioRepositorio extends JpaRepository<Predio, Long> {
    Optional<Predio> findByCodigo(String codigo);

    /** /api/predios/search/findByPropietarioCedula?cedula=... → todos los predios de un dueño */
    List<Predio> findByPropietarioCedula(String cedula);

    List<Predio> findBySector(Sector sector);

    long countBySector(Sector sector);

    long countByBarrio(Barrio barrio);

    List<Predio> findByEstado(Predio.Estado estado);
}

package co.emcagua.api.facturacion;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "tarifas", collectionResourceRel = "tarifas")
public interface TarifaRepositorio extends JpaRepository<Tarifa, Long> {
    List<Tarifa> findAllByOrderByDesdeAnioAscDesdeMesAsc();
}

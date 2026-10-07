package co.emcagua.api.inventario;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "materiales", collectionResourceRel = "materiales")
public interface MaterialRepositorio extends JpaRepository<Material, Long> {
    Optional<Material> findByCodigo(String codigo);
}

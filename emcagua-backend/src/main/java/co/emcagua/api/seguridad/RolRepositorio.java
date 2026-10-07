package co.emcagua.api.seguridad;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "roles", collectionResourceRel = "roles")
public interface RolRepositorio extends JpaRepository<Rol, Long> {
    Optional<Rol> findByCodigo(String codigo);
}

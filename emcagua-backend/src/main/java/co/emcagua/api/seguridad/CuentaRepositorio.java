package co.emcagua.api.seguridad;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "cuentas", collectionResourceRel = "cuentas")
public interface CuentaRepositorio extends JpaRepository<Cuenta, Long> {
    Optional<Cuenta> findByUsuario(String usuario);
}

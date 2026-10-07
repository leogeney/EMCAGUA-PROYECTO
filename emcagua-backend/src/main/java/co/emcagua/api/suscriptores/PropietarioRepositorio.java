package co.emcagua.api.suscriptores;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "propietarios", collectionResourceRel = "propietarios")
public interface PropietarioRepositorio extends JpaRepository<Propietario, Long> {
    Optional<Propietario> findByCedula(String cedula);
}

package co.emcagua.api.nomina;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "empleados", collectionResourceRel = "empleados")
public interface EmpleadoRepositorio extends JpaRepository<Empleado, Long> {
    Optional<Empleado> findByCedula(String cedula);
}

package co.emcagua.api.nomina;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "novedades-nomina", collectionResourceRel = "novedades-nomina")
public interface NovedadNominaRepositorio extends JpaRepository<NovedadNomina, Long> {
    Optional<NovedadNomina> findByPeriodoAndEmpleado(PeriodoNomina periodo, Empleado empleado);
    List<NovedadNomina> findByPeriodo(PeriodoNomina periodo);
}

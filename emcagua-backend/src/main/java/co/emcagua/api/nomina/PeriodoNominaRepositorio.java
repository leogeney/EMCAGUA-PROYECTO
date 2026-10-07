package co.emcagua.api.nomina;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "periodos-nomina", collectionResourceRel = "periodos-nomina")
public interface PeriodoNominaRepositorio extends JpaRepository<PeriodoNomina, Long> {
    Optional<PeriodoNomina> findByAnioAndMes(int anio, int mes);
}

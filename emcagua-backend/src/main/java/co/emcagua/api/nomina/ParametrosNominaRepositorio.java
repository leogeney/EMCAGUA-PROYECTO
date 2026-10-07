package co.emcagua.api.nomina;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "parametros-nomina", collectionResourceRel = "parametros-nomina")
public interface ParametrosNominaRepositorio extends JpaRepository<ParametrosNomina, Long> {
    Optional<ParametrosNomina> findByAnio(int anio);
}

package co.emcagua.api.perdidas;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "macromediciones", collectionResourceRel = "macromediciones")
public interface MacromedicionRepositorio extends JpaRepository<Macromedicion, Long> {
    List<Macromedicion> findByAnioAndMes(int anio, int mes);
}

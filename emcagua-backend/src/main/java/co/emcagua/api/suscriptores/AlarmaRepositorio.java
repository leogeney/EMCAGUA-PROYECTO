package co.emcagua.api.suscriptores;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "alarmas", collectionResourceRel = "alarmas")
public interface AlarmaRepositorio extends JpaRepository<AlarmaMedidor, Long> {
    /** /api/alarmas/search/findByResueltaIsNull → alarmas abiertas */
    List<AlarmaMedidor> findByResueltaIsNull();
}

package co.emcagua.api.comunicacion;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "avisos-enviados", collectionResourceRel = "avisos")
public interface AvisoEnviadoRepositorio extends JpaRepository<AvisoEnviado, Long> {}

package co.emcagua.api.empresa;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(exported = false)
public interface ConfiguracionRepositorio extends JpaRepository<Configuracion, Long> {}

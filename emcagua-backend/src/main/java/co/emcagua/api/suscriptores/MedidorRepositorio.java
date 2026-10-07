package co.emcagua.api.suscriptores;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(path = "medidores", collectionResourceRel = "medidores")
public interface MedidorRepositorio extends JpaRepository<Medidor, Long> {
    Optional<Medidor> findBySerial(String serial);

    Optional<Medidor> findByPredio(Predio predio);
}

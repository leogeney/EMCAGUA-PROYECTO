package co.emcagua.api.caja;

import java.time.LocalDate;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;
import org.springframework.data.rest.core.annotation.RestResource;

/** Los cierres se hacen con /api/caja/cerrar (calcula las cifras); por la API solo se consultan. */
@RepositoryRestResource(path = "cierres-caja", collectionResourceRel = "cierres")
public interface CierreCajaRepositorio extends JpaRepository<CierreCaja, Long> {
    Optional<CierreCaja> findByFecha(LocalDate fecha);

    @Override
    @RestResource(exported = false)
    <S extends CierreCaja> S save(S c);

    @Override
    @RestResource(exported = false)
    void deleteById(Long id);

    @Override
    @RestResource(exported = false)
    void delete(CierreCaja c);
}

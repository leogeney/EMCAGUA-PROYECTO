package co.emcagua.api.pqr;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;
import org.springframework.data.rest.core.annotation.RestResource;

/** Se radican y responden con /api/pqr/... (asignan radicado, plazo e historial). Por la API REST solo se consultan. */
@RepositoryRestResource(path = "pqrs", collectionResourceRel = "pqrs")
public interface PqrRepositorio extends JpaRepository<Pqr, Long> {
    Optional<Pqr> findByRadicado(String radicado);

    long countByRadicadoStartingWith(String prefijo);

    List<Pqr> findByEstadoIn(List<Pqr.Estado> estados);

    List<Pqr> findByPredioCodigo(String codigo);

    @Override
    @RestResource(exported = false)
    <S extends Pqr> S save(S p);

    @Override
    @RestResource(exported = false)
    void deleteById(Long id);

    @Override
    @RestResource(exported = false)
    void delete(Pqr p);
}

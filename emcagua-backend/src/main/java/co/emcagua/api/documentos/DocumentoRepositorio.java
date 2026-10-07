package co.emcagua.api.documentos;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;
import org.springframework.data.rest.core.annotation.RestResource;

/** Se emiten y anulan con /api/documentos/emitir y /anular (asignan consecutivo y firma). Por la API solo se consultan. */
@RepositoryRestResource(path = "documentos", collectionResourceRel = "documentos")
public interface DocumentoRepositorio extends JpaRepository<DocumentoEmitido, Long> {
    Optional<DocumentoEmitido> findByConsecutivo(String consecutivo);

    long countByConsecutivoStartingWith(String prefijo);

    @Override
    @RestResource(exported = false)
    <S extends DocumentoEmitido> S save(S d);

    @Override
    @RestResource(exported = false)
    void deleteById(Long id);

    @Override
    @RestResource(exported = false)
    void delete(DocumentoEmitido d);
}

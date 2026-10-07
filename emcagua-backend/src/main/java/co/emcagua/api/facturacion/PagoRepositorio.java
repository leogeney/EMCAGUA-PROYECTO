package co.emcagua.api.facturacion;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;
import org.springframework.data.rest.core.annotation.RestResource;

/** Los pagos se registran con /api/caja/cobrar (que marca las facturas como pagadas); por la API solo se consultan. */
@RepositoryRestResource(path = "pagos", collectionResourceRel = "pagos")
public interface PagoRepositorio extends JpaRepository<Pago, Long> {
    Optional<Pago> findByNumero(String numero);

    List<Pago> findByFechaBetweenOrderByFechaDesc(Instant desde, Instant hasta);

    @Override
    @RestResource(exported = false)
    <S extends Pago> S save(S p);

    @Override
    @RestResource(exported = false)
    void deleteById(Long id);

    @Override
    @RestResource(exported = false)
    void delete(Pago p);
}

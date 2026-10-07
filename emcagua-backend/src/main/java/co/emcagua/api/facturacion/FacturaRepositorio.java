package co.emcagua.api.facturacion;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;
import org.springframework.data.rest.core.annotation.RestResource;

import co.emcagua.api.suscriptores.Predio;

/** Las facturas no se crean ni se borran por la API: las genera el cierre mensual y se anulan con un motivo. */
@RepositoryRestResource(path = "facturas", collectionResourceRel = "facturas")
public interface FacturaRepositorio extends JpaRepository<Factura, Long> {
    Optional<Factura> findByNumero(String numero);

    Optional<Factura> findByPredioAndAnioAndMes(Predio predio, int anio, int mes);

    List<Factura> findByPredioOrderByAnioDescMesDesc(Predio predio);

    List<Factura> findByPredioCodigoOrderByAnioDescMesDesc(String codigo);

    List<Factura> findByEstado(Factura.Estado estado);

    List<Factura> findByAnioAndMes(int anio, int mes);

    @Query("select max(f.anio * 12 + f.mes - 1) from Factura f")
    Integer ultimoPeriodoFacturado();

    @Override
    @RestResource(exported = false)
    void deleteById(Long id);

    @Override
    @RestResource(exported = false)
    void delete(Factura f);

    @Override
    @RestResource(exported = false)
    <S extends Factura> S save(S f);
}

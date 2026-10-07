package co.emcagua.api.inventario;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;
import org.springframework.data.rest.core.annotation.RestResource;

/** Los movimientos se registran con /api/inventario/mover (actualiza el stock). Por la API REST solo se consultan. */
@RepositoryRestResource(path = "movimientos-inventario", collectionResourceRel = "movimientos")
public interface MovimientoRepositorio extends JpaRepository<MovimientoInventario, Long> {
    @Override
    @RestResource(exported = false)
    <S extends MovimientoInventario> S save(S m);

    @Override
    @RestResource(exported = false)
    void deleteById(Long id);

    @Override
    @RestResource(exported = false)
    void delete(MovimientoInventario m);
}

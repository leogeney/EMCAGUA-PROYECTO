package co.emcagua.api.comun;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.rest.core.config.RepositoryRestConfiguration;
import org.springframework.data.rest.webmvc.config.RepositoryRestConfigurer;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

import jakarta.persistence.EntityManager;
import jakarta.persistence.metamodel.Type;

/** API REST automática sobre los repositorios (/api/predios, /api/facturas...): muestra los ids y valida antes de guardar. */
@Configuration
public class RestConfig implements RepositoryRestConfigurer {
    private final EntityManager em;
    private final jakarta.validation.Validator validador;

    public RestConfig(EntityManager em, jakarta.validation.Validator validador) {
        this.em = em;
        this.validador = validador;
    }

    @Override
    public void configureRepositoryRestConfiguration(RepositoryRestConfiguration config, CorsRegistry cors) {
        config.exposeIdsFor(em.getMetamodel().getEntities().stream().map(Type::getJavaType).toArray(Class[]::new));
    }

    @Override
    public void configureValidatingRepositoryEventListener(org.springframework.data.rest.core.event.ValidatingRepositoryEventListener v) {
        var springValidador = new org.springframework.validation.beanvalidation.SpringValidatorAdapter(validador);
        v.addValidator("beforeCreate", springValidador);
        v.addValidator("beforeSave", springValidador);
    }
}
